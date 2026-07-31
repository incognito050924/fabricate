import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProcess, tailOutput } from "./lib/process.ts";
import { type SweepResult, sweepStaleVerifyMarketplaces } from "./lib/stale-marketplaces.ts";
import type { Check, CheckContext, ProcessResult, StructureStatus } from "./types.ts";

// Each check module carries its own title, so this list is only here to name the
// modules that must exist. Scanning the directory instead would let a check that
// was deleted read as "nothing to run" rather than as a failure.
const structureCheckIds = [
  "S-1",
  "S-2",
  "S-3",
  "S-4",
  "S-5",
  "S-6",
  "S-7",
  "S-8",
  "S-9",
  "S-10",
  "S-11",
  "S-12",
  "S-13",
  "S-14",
];

type StructureResult = {
  id: string;
  title: string;
  status: StructureStatus;
  detail: string;
};

type ToolResult = {
  id: string;
  ok: boolean;
  detail: string;
};

const main = async (): Promise<number> => {
  const repoRoot = process.cwd();
  const tmpRoot = await mkdtemp(join(tmpdir(), "fabricate-verify-"));
  const obsPath = join(tmpRoot, "host-observation.json");

  try {
    // A killed run never reaches its teardown, so its marketplace entry and cache
    // directory stay in the user's home. Sweep them before starting.
    const swept = await sweepStaleVerifyMarketplaces(repoRoot);
    // The fixtures are also what writes the host observation, so they have to run
    // before the structure checks that read it.
    const fixtures = await runFixtures(repoRoot, obsPath);
    const structure = await runStructureChecks({ repoRoot, tmpRoot, obsPath });
    const tools = [
      await runTool("typecheck", ["run", "typecheck"], repoRoot),
      await runTool("lint", ["run", "lint"], repoRoot),
    ];

    const output = formatReport(fixtures, structure, tools);
    process.stdout.write(sweepReport(swept) + output.text);
    return output.exitCode;
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
};

const runFixtures = async (repoRoot: string, obsPath: string): Promise<ProcessResult> =>
  await runProcess("bun", ["test", "verify/fixtures"], {
    cwd: repoRoot,
    env: {
      FABRICATE_VERIFY_OBS: obsPath,
    },
  });

const runStructureChecks = async (ctx: CheckContext): Promise<StructureResult[]> => {
  const results: StructureResult[] = [];

  for (const id of structureCheckIds) {
    const check = await loadCheck(id);

    if (check === null) {
      results.push({
        id,
        title: "",
        status: "FAIL",
        detail: `검사 모듈이 없다: verify/checks/${id}.ts`,
      });
      continue;
    }

    try {
      const outcome = await check.run(ctx);
      const status = outcome.targets.length === 0 ? "n/a" : outcome.ok ? "PASS" : "FAIL";

      results.push({
        id,
        title: check.title,
        status,
        detail: outcome.detail,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 검사 오류";

      results.push({
        id,
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

const runTool = async (id: string, args: string[], repoRoot: string): Promise<ToolResult> => {
  const result = await runProcess("bun", args, { cwd: repoRoot });
  return {
    id,
    ok: result.code === 0,
    detail: toolDetail(result),
  };
};

const toolDetail = (result: ProcessResult): string => {
  if (result.code === 0) {
    return "";
  }

  const tail = tailOutput(result);
  const suffix = tail.length === 0 ? "\n출력 없음" : `\n${tail}`;
  return `exit ${result.code}${suffix}`;
};

// Only what is not passing gets printed. A count of how many things went green
// would be answering a question nobody asked — what matters is whether anything
// is still red, and what it is.
const formatReport = (
  fixtures: ProcessResult,
  structure: StructureResult[],
  tools: ToolResult[],
): { text: string; exitCode: number } => {
  const fixturesOk = fixtures.code === 0;
  const structureLeft = structure.filter((result) => result.status !== "PASS");
  const toolsLeft = tools.filter((result) => !result.ok);
  const lines = ["fabricate verify", "", "픽스처 — bun test verify/fixtures"];

  lines.push(fixturesOk ? "  통과" : indentDetail(toolDetail(fixtures), 2));
  lines.push("", "구조 검사");

  if (structureLeft.length === 0) {
    lines.push("  통과");
  }

  for (const result of structureLeft) {
    lines.push(`  ${result.id.padEnd(5)} ${result.status.padEnd(4)} ${result.title}`);
    lines.push(indentDetail(result.detail, 8));
  }

  lines.push("", "도구 사슬");

  if (toolsLeft.length === 0) {
    lines.push("  통과");
  }

  for (const result of toolsLeft) {
    lines.push(`  ${result.id.padEnd(9)} FAIL`);
    lines.push(indentDetail(result.detail, 8));
  }

  const exitCode = fixturesOk && structureLeft.length === 0 && toolsLeft.length === 0 ? 0 : 1;
  lines.push("", `exit ${exitCode}`);

  return {
    text: `${lines.join("\n")}\n`,
    exitCode,
  };
};

// Silence would read as "nothing was left behind". Say what was cleaned and what
// resisted, so a leak that the sweep cannot fix stays visible.
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
