import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readJsonLines } from "../lib/files.ts";
import { runProcess } from "../lib/process.ts";
import { baseHookPayload, runSyntheticHook } from "../lib/synthetic-hook.ts";
import type { ProcessResult } from "../types.ts";

export type InterviewFixture = {
  repoRoot: string;
  projectDir: string;
  sessionId: string;
  request: string;
  goals: string[];
};

export const repoRoot = resolve(import.meta.dir, "../..");

export const withInterviewFixture = async (
  name: string,
  run: (fixture: InterviewFixture) => Promise<void>,
): Promise<void> => {
  const projectDir = await mkdtemp(join(tmpdir(), `fabricate-${name}-`));

  try {
    await mkdir(projectDir, { recursive: true });
    await run({
      repoRoot,
      projectDir,
      sessionId: "session-1",
      request: "로그인 실패 원인 파악과 재현 조건",
      goals: [],
    });
  } finally {
    await rm(projectDir, { force: true, recursive: true });
  }
};

export const createSlashSession = async (fixture: InterviewFixture): Promise<void> => {
  const hook = await markSlashSession(fixture, "prompt-1");

  if (hook.code !== 0 || !hook.markerAppeared) {
    throw new Error(`합성 UPE 훅 실패: exit ${hook.code}\n${hook.stderr}`);
  }

  await expectOk(await fabricate(fixture, ["deep-interview", "start"]), "start");
};

export const markSlashSession = async (
  fixture: InterviewFixture,
  promptId: string,
): Promise<Awaited<ReturnType<typeof runSyntheticHook>>> =>
  await runSyntheticHook({
    repoRoot: fixture.repoRoot,
    projectDir: fixture.projectDir,
    event: "user-prompt-expansion",
    sessionId: fixture.sessionId,
    label: "UPE 합성 세션",
    payload: {
      ...baseHookPayload({
        cwd: fixture.projectDir,
        sessionId: fixture.sessionId,
        promptId,
        hookEventName: "UserPromptExpansion",
      }),
      expansion_type: "slash_command",
      command_name: "fabricate:deep-interview",
      command_args: fixture.request,
      command_source: "project",
      prompt: `/fabricate:deep-interview ${fixture.request}`,
    },
  });

export const createModelSession = async (fixture: InterviewFixture): Promise<void> => {
  const hook = await markModelSession(fixture, "prompt-1");

  if (hook.code !== 0 || !hook.markerAppeared) {
    throw new Error(`합성 PreToolUse 훅 실패: exit ${hook.code}\n${hook.stderr}`);
  }

  await expectOk(await fabricate(fixture, ["deep-interview", "start"]), "start");
};

export const markModelSession = async (
  fixture: InterviewFixture,
  promptId: string,
): Promise<Awaited<ReturnType<typeof runSyntheticHook>>> =>
  await runSyntheticHook({
    repoRoot: fixture.repoRoot,
    projectDir: fixture.projectDir,
    event: "pre-tool-use",
    sessionId: fixture.sessionId,
    label: "PreToolUse 합성 세션",
    payload: {
      ...baseHookPayload({
        cwd: fixture.projectDir,
        sessionId: fixture.sessionId,
        promptId,
        hookEventName: "PreToolUse",
      }),
      tool_name: "Skill",
      tool_input: {
        skill: "fabricate:deep-interview",
      },
      tool_use_id: "tool-1",
    },
  });

export const stopHook = async (input: {
  fixture: Pick<InterviewFixture, "repoRoot" | "projectDir" | "sessionId">;
  promptId: string;
  stopHookActive?: boolean;
}): Promise<ProcessResult> =>
  await runProcess(join(input.fixture.repoRoot, "bin", "fabricate"), ["hook", "stop"], {
    cwd: input.fixture.projectDir,
    input: `${JSON.stringify({
      ...baseHookPayload({
        cwd: input.fixture.projectDir,
        sessionId: input.fixture.sessionId,
        promptId: input.promptId,
        hookEventName: "Stop",
      }),
      ...(input.stopHookActive === undefined ? {} : { stop_hook_active: input.stopHookActive }),
    })}\n`,
  });

export const addCompleteInterview = async (
  fixture: InterviewFixture,
  options: { criteria?: boolean } = {},
): Promise<string> => {
  await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
  await record(fixture, ["--kind", "fragment", "--id", "F2", "--text", "재현 조건"]);
  await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
  await record(fixture, [
    "--kind",
    "question",
    "--id",
    "Q1",
    "--dimension",
    "D1",
    "--covers",
    "F1,F2",
    "--text",
    "언제 로그인 실패가 재현되나요?",
  ]);
  await record(fixture, [
    "--kind",
    "answer",
    "--id",
    "A1",
    "--question",
    "Q1",
    "--text",
    "사내망에서 월요일 오전 로그인 실패가 반복됩니다",
  ]);
  await record(fixture, [
    "--kind",
    "restate",
    "--id",
    "R1",
    "--answer",
    "A1",
    "--text",
    "월요일 오전 사내망 조건에서 인증 실패가 반복되는 사례로 보겠습니다",
  ]);
  await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", "accepted"]);
  await record(fixture, [
    "--kind",
    "resolve",
    "--dimension",
    "D1",
    "--evidence",
    "재현 조건 확인",
    "--answer",
    "A1",
  ]);
  await record(fixture, ["--kind", "contradiction-pass", "--text", "교차 답변 검사 완료"]);

  // Every interview has to write down what counts as done (goal 2), so the
  // baseline interview writes one. Fixtures about the missing-criterion
  // rejection opt out.
  if (options.criteria !== false) {
    await addCriterion(fixture);
  }

  await record(fixture, ["--kind", "goal", "--text", "로그인 실패의 재현 조건이 확인되어야 한다"]);

  return goalHash(fixture);
};

export const record = async (fixture: InterviewFixture, args: string[]): Promise<ProcessResult> => {
  const effectiveArgs = recordKind(args) === "question" ? withRecommendation(args) : args;

  if (recordKind(args) === "question") {
    const question = flagValue(args, "--id");
    const text = flagValue(args, "--text");
    if (question !== null && text !== null) {
      await expectOk(
        await fabricate(fixture, [
          "turn",
          "record",
          "--kind",
          "review",
          "--question",
          question,
          "--text",
          text,
          "--verdict",
          "pass",
          "--reviewer",
          "blind-reviewer",
          "--reason",
          "세션 서사 없이 답할 수 있는 질문입니다",
        ]),
        `turn record review ${question}`,
      );
    }
  }

  // D-6: the goal wording goes past the same blind reader the questions do.
  // Fixtures that are about that gate call the CLI directly instead.
  if (recordKind(args) === "goal") {
    const text = flagValue(args, "--text");
    if (text !== null) {
      await expectOk(
        await fabricate(fixture, [
          "turn",
          "record",
          "--kind",
          "goal-review",
          "--text",
          text,
          "--verdict",
          "pass",
          "--reviewer",
          "blind-reviewer",
          "--reason",
          "문안만으로 무엇이 달성돼야 하는지 알 수 있습니다",
        ]),
        "turn record goal-review",
      );
    }
  }

  const result = await fabricate(fixture, ["turn", "record", ...effectiveArgs]);
  await expectOk(result, `turn record ${effectiveArgs.join(" ")}`);

  if (args[1] === "goal") {
    const textIndex = args.indexOf("--text");
    const text = textIndex === -1 ? undefined : args[textIndex + 1];
    if (text !== undefined) {
      fixture.goals.push(text);
    }
  }

  return result;
};

const recordKind = (args: string[]): string | null => flagValue(args, "--kind");

// Goal 0: a question only records with the driver's recommendation and what it
// rests on. Fixtures that call the CLI directly append this pair.
export const recommendation = [
  "--recommend",
  "(가) 쪽으로 봅니다",
  "--because",
  "지금 장부에 적힌 답들이 그쪽을 가리킵니다",
];

// Goal 2: an interview only closes once it wrote down what counts as done.
export const addCriterion = async (
  fixture: InterviewFixture,
  id = "K0",
  exampleId = "E0",
): Promise<void> => {
  await record(fixture, [
    "--kind",
    "criterion",
    "--id",
    id,
    "--text",
    "재현 조건이 사용자 판정으로 확인됐는가",
    "--type",
    "hard",
  ]);
  await record(fixture, [
    "--kind",
    "example",
    "--id",
    exampleId,
    "--criterion",
    id,
    "--text",
    "월요일 오전 사내망에서 3회 재현",
    "--verdict",
    "충족",
  ]);
  await record(fixture, [
    "--kind",
    "rule",
    "--criterion",
    id,
    "--text",
    "사용자가 충족이라고 판정한 조건을 만족해야 한다",
  ]);
};

// Every question carries the driver's recommendation and what it rests on (goal 0).
// Fixtures that are not about that requirement get a default pair so they keep
// exercising whatever they were written to exercise.
const withRecommendation = (args: string[]): string[] => [
  ...args,
  ...(flagValue(args, "--recommend") === null ? ["--recommend", "(가) 쪽으로 봅니다"] : []),
  ...(flagValue(args, "--because") === null
    ? ["--because", "지금 장부에 적힌 답들이 그쪽을 가리킵니다"]
    : []),
];

const flagValue = (args: string[], flag: string): string | null => {
  const index = args.indexOf(flag);
  const value = index === -1 ? undefined : args[index + 1];
  return value === undefined ? null : value;
};

export const close = async (
  fixture: InterviewFixture,
  goalHashValue = goalHash(fixture),
): Promise<ProcessResult> =>
  await fabricate(fixture, ["deep-interview", "close", "--goal-hash", goalHashValue]);

export const fabricate = async (
  fixture: Pick<InterviewFixture, "repoRoot" | "projectDir">,
  args: string[],
): Promise<ProcessResult> =>
  await runProcess(join(fixture.repoRoot, "bin", "fabricate"), args, {
    cwd: fixture.projectDir,
    timeoutMs: 30_000,
  });

export const expectOk = async (result: ProcessResult, label: string): Promise<void> => {
  if (result.code !== 0) {
    throw new Error(
      [`${label} 실패: exit ${result.code}`, result.stdout.trimEnd(), result.stderr.trimEnd()]
        .filter((line) => line.length > 0)
        .join("\n"),
    );
  }
};

export const goalHash = (fixture: Pick<InterviewFixture, "goals">): string =>
  createHash("sha256").update(fixture.goals.join("\n")).digest("hex");

export const intentFiles = async (
  fixture: Pick<InterviewFixture, "projectDir">,
): Promise<string[]> => {
  try {
    return await readdir(join(fixture.projectDir, ".fabricate", "intent"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

export const ledger = async (
  fixture: Pick<InterviewFixture, "projectDir" | "sessionId">,
): Promise<Record<string, unknown>[]> =>
  await readJsonLines(
    join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "ledger.jsonl"),
  );
