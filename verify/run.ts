import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criteria, structureChecks } from "./criteria.ts";
import { parseJUnitFile } from "./lib/junit.ts";
import { runProcess, tailOutput } from "./lib/process.ts";
import { type SweepResult, sweepStaleVerifyMarketplaces } from "./lib/stale-marketplaces.ts";
import type { Check, CheckContext, ProcessResult, StructureStatus } from "./types.ts";

type AxisAResult = {
  id: string;
  title: string;
  ok: boolean;
  detail: string;
};

type AxisBResult = {
  id: string;
  title: string;
  status: StructureStatus;
  detail: string;
};

type AxisCResult = {
  id: "typecheck" | "lint" | "test";
  title: string;
  ok: boolean;
  detail: string;
};

const main = async (): Promise<number> => {
  const repoRoot = process.cwd();
  const tmpRoot = await mkdtemp(join(tmpdir(), "fabricate-verify-"));
  const obsPath = join(tmpRoot, "host-observation.json");

  try {
    // A killed run never reaches its teardown, so its marketplace entry and cache
    // directory stay in the user's home. Sweep them before starting (GOAL.md §4-9).
    const swept = await sweepStaleVerifyMarketplaces(repoRoot);
    const testRun = await runFixtures(repoRoot, tmpRoot, obsPath);
    const axisA = await axisAFromJUnit(testRun, join(tmpRoot, "junit.xml"));
    const axisB = await runStructureChecks({
      repoRoot,
      tmpRoot,
      obsPath,
    });
    const axisC = [
      await runTool("typecheck", "typecheck", ["run", "typecheck"], repoRoot),
      await runTool("lint", "lint", ["run", "lint"], repoRoot),
      axisCTestResult(testRun),
    ];

    const output = formatReport(axisA, axisB, axisC);
    process.stdout.write(sweepReport(swept) + output.text);
    return output.exitCode;
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
};

const runFixtures = async (
  repoRoot: string,
  tmpRoot: string,
  obsPath: string,
): Promise<ProcessResult> =>
  await runProcess(
    "bun",
    [
      "test",
      "verify/fixtures",
      "--reporter=junit",
      `--reporter-outfile=${join(tmpRoot, "junit.xml")}`,
    ],
    {
      cwd: repoRoot,
      env: {
        FABRICATE_VERIFY_OBS: obsPath,
      },
    },
  );

const axisAFromJUnit = async (
  testRun: ProcessResult,
  junitPath: string,
): Promise<AxisAResult[]> => {
  const suites = await parseJUnitFile(junitPath);
  const noTestFiles = `${testRun.stdout}\n${testRun.stderr}`.includes("0 test files");

  return criteria.map((criterion) => {
    const suite = suites.get(criterion.id);

    if (suite === undefined) {
      const suffix = noTestFiles ? "\nbun test 가 테스트 파일을 찾지 못했다." : "";

      return {
        id: criterion.id,
        title: criterion.title,
        ok: false,
        detail: `fixture 없음: verify/fixtures/${criterion.id}.test.ts${suffix}`,
      };
    }

    const ok = suite.tests > 0 && suite.failures === 0 && suite.errors === 0;
    const detail = ok
      ? ""
      : `fixture 실패: tests=${suite.tests}, failures=${suite.failures}, errors=${suite.errors}`;

    return {
      id: criterion.id,
      title: criterion.title,
      ok,
      detail,
    };
  });
};

const runStructureChecks = async (ctx: CheckContext): Promise<AxisBResult[]> => {
  const results: AxisBResult[] = [];

  for (const definition of structureChecks) {
    const check = await loadCheck(definition.id);

    if (check === null) {
      results.push({
        id: definition.id,
        title: definition.title,
        status: "FAIL",
        detail: `검사 모듈이 없다: verify/checks/${definition.id}.ts`,
      });
      continue;
    }

    try {
      const outcome = await check.run(ctx);
      const status = outcome.targets.length === 0 ? "n/a" : outcome.ok ? "PASS" : "FAIL";

      results.push({
        id: definition.id,
        title: check.title,
        status,
        detail: outcome.detail,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 검사 오류";
      results.push({
        id: definition.id,
        title: check.title,
        status: "FAIL",
        detail: message,
      });
    }
  }

  return results;
};

const loadCheck = async (id: string): Promise<Check | null> => {
  try {
    const imported = (await import(`./checks/${id}.ts`)) as { default?: Check };
    return imported.default ?? null;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot find module")) {
      return null;
    }

    throw error;
  }
};

const runTool = async (
  id: AxisCResult["id"],
  title: string,
  args: string[],
  repoRoot: string,
): Promise<AxisCResult> => {
  const result = await runProcess("bun", args, { cwd: repoRoot });
  return {
    id,
    title,
    ok: result.code === 0,
    detail: toolDetail(result),
  };
};

const axisCTestResult = (result: ProcessResult): AxisCResult => ({
  id: "test",
  title: "test",
  ok: result.code === 0,
  detail: toolDetail(result),
});

const toolDetail = (result: ProcessResult): string => {
  if (result.code === 0) {
    return "";
  }

  const tail = tailOutput(result);
  const suffix = tail.length === 0 ? "\n출력 없음" : `\n${tail}`;
  return `exit ${result.code}${suffix}`;
};

const formatReport = (
  axisA: AxisAResult[],
  axisB: AxisBResult[],
  axisC: AxisCResult[],
): { text: string; exitCode: number } => {
  const axisAGreen = axisA.filter((result) => result.ok).length;
  const axisBGreen = axisB.filter((result) => result.status === "PASS").length;
  const axisCGreen = axisC.filter((result) => result.ok).length;
  const green = axisAGreen + axisBGreen + axisCGreen;
  const exitCode =
    axisAGreen === criteria.length &&
    axisBGreen === structureChecks.length &&
    axisCGreen === axisC.length
      ? 0
      : 1;
  const lines = [
    `fabricate verify — ${green}/60 초록 (축 A ${axisAGreen}/43 · 축 B ${axisBGreen}/14 · 축 C ${axisCGreen}/3)`,
    "",
    "축 A — GOAL §2 통합 술어",
  ];

  for (const result of axisA.filter((item) => !item.ok)) {
    lines.push(`  ${result.id.padEnd(6)} ${result.title}`);
    lines.push(indentDetail(result.detail, 9));
  }

  lines.push("", "축 B — 구조 검사");

  for (const result of axisB.filter((item) => item.status !== "PASS")) {
    lines.push(`  ${result.id.padEnd(5)} ${result.status.padEnd(4)} ${result.title}`);
    lines.push(indentDetail(result.detail, 8));
  }

  lines.push("", "축 C — 도구 사슬");

  for (const result of axisC.filter((item) => !item.ok)) {
    lines.push(`  ${result.id.padEnd(9)} FAIL  ${result.title}`);
    lines.push(indentDetail(result.detail, 8));
  }

  lines.push("", `${green}/60 초록 — exit ${exitCode}`);

  return {
    text: `${lines.join("\n")}\n`,
    exitCode,
  };
};

// Silence would read as "nothing was left behind". Say what was cleaned and what
// resisted, so a leak that the sweep cannot fix stays visible (§4-7).
const sweepReport = (swept: SweepResult): string => {
  const lines: string[] = [];

  if (swept.removed.length > 0) {
    lines.push(`앞선 구동이 남긴 verify 마켓플레이스 ${swept.removed.length}건을 지웠다:`);
    lines.push(...swept.removed.map((name) => `  - ${name}`));
  }

  for (const failure of swept.failed) {
    lines.push(`verify 마켓플레이스를 못 지웠다: ${failure.name} (${failure.detail})`);
  }

  return lines.length === 0 ? "" : `${lines.join("\n")}\n\n`;
};

const indentDetail = (detail: string, spaces: number): string => {
  const prefix = " ".repeat(spaces);
  const text = detail.length === 0 ? "세부 출력 없음" : detail;
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
};

process.exit(await main());
