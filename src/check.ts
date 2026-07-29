import { spawn } from "node:child_process";
import { join } from "node:path";
import { ensureDir, readUtf8IfExists } from "./files.ts";
import { fabricateDir, projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";

type IntentRecord = {
  id: string;
  goals: {
    texts: string[];
    goal_hash: string;
  };
  locked_at: string;
};

type EvidenceRecord = {
  intent_id: string;
  goal_index: number;
  goal_hash: string;
  command: string;
  exit_code: number;
  recorded_at: string;
  output_tail: string[];
};

type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export const dispatchCheck = async (cwd: string, args: string[]): Promise<CliResult> => {
  const subcommand = args[0];

  if (subcommand === "record") {
    return await recordEvidence(cwd, args.slice(1));
  }

  if (subcommand === undefined) {
    return fail("check 하위 명령 또는 intent id 가 필요합니다.\n");
  }

  if (args.length > 1) {
    return fail(`알 수 없는 인자입니다: ${args[1]}\n`);
  }

  return await checkIntent(cwd, subcommand);
};

const recordEvidence = async (cwd: string, args: string[]): Promise<CliResult> => {
  const parsed = parseRecordArgs(args);
  if (!parsed.ok) {
    return parsed.result;
  }

  const projectDir = await projectDirFromCommandCwd(cwd);
  const loaded = await loadIntent(projectDir, parsed.intentId);
  if (!loaded.ok) {
    return loaded.result;
  }

  const goalText = loaded.intent.goals.texts[parsed.goalIndex];
  if (goalText === undefined) {
    return fail(
      `목표 인덱스가 범위를 벗어났습니다: ${parsed.goalIndex} (목표 ${loaded.intent.goals.texts.length}개)\n`,
    );
  }

  const result = await runVerificationCommand(parsed.command, projectDir);
  const evidence: EvidenceRecord = {
    intent_id: loaded.intent.id,
    goal_index: parsed.goalIndex,
    goal_hash: loaded.intent.goals.goal_hash,
    command: parsed.command,
    exit_code: result.code,
    recorded_at: new Date().toISOString(),
    output_tail: tailLines(`${result.stdout}\n${result.stderr}`),
  };
  const evidencePath = evidencePathFor(projectDir, parsed.intentId, parsed.goalIndex);

  await ensureDir(join(fabricateDir(projectDir), "evidence", parsed.intentId));
  await Bun.write(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

  const summary = [
    `증거를 기록했습니다: ${evidencePath}`,
    `목표 ${parsed.goalIndex}: ${goalText}`,
    `검증 명령 exit ${result.code}: ${parsed.command}`,
  ];
  const outputTail =
    evidence.output_tail.length === 0 ? [] : ["출력 꼬리:", ...evidence.output_tail];
  const text = [...summary, ...outputTail, ""].join("\n");

  return {
    code: result.code,
    ...(result.code === 0 ? { stdout: text } : { stderr: text }),
  };
};

const checkIntent = async (cwd: string, intentId: string): Promise<CliResult> => {
  const projectDir = await projectDirFromCommandCwd(cwd);
  const loaded = await loadIntent(projectDir, intentId);
  if (!loaded.ok) {
    return loaded.result;
  }

  const failures: string[] = [];
  const successes: string[] = [];

  for (const [index, goalText] of loaded.intent.goals.texts.entries()) {
    const evidence = await loadEvidence(projectDir, intentId, index);

    if (!evidence.ok) {
      failures.push(`목표 ${index}: ${goalText} — ${evidence.reason}`);
      continue;
    }

    const reason = invalidEvidenceReason(evidence.evidence, loaded.intent, index);
    if (reason !== null) {
      failures.push(`목표 ${index}: ${goalText} — ${reason}`);
      continue;
    }

    successes.push(`- 목표 ${index}: ${goalText} — ${evidence.evidence.command}`);
  }

  if (failures.length > 0) {
    return fail(
      ["완료 증거가 부족합니다.", ...failures.map((reason) => `- ${reason}`), ""].join("\n"),
    );
  }

  return ok([`${successes.length}개 목표가 충족됐습니다.`, ...successes, ""].join("\n"));
};

type ParsedRecordArgs =
  | { ok: true; intentId: string; goalIndex: number; command: string }
  | { ok: false; result: CliResult };

const parseRecordArgs = (args: string[]): ParsedRecordArgs => {
  let intentId: string | undefined;
  let goalRaw: string | undefined;
  let command: string | undefined;
  let index = 0;

  while (index < args.length) {
    const arg = args[index];

    if (arg === "--intent") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--intent 값이 필요합니다.\n") };
      }
      if (intentId !== undefined) {
        return { ok: false, result: fail("중복 인자입니다: --intent\n") };
      }
      intentId = value;
      index += 2;
      continue;
    }

    if (arg === "--goal") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--goal 값이 필요합니다.\n") };
      }
      if (goalRaw !== undefined) {
        return { ok: false, result: fail("중복 인자입니다: --goal\n") };
      }
      goalRaw = value;
      index += 2;
      continue;
    }

    if (arg === "--command") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--command 값이 필요합니다.\n") };
      }
      if (command !== undefined) {
        return { ok: false, result: fail("중복 인자입니다: --command\n") };
      }
      command = value;
      index += 2;
      continue;
    }

    return { ok: false, result: fail(`알 수 없는 인자입니다: ${arg}\n`) };
  }

  if (intentId === undefined) {
    return { ok: false, result: fail("--intent 값이 필요합니다.\n") };
  }

  if (goalRaw === undefined) {
    return { ok: false, result: fail("--goal 값이 필요합니다.\n") };
  }

  const goalIndex = Number(goalRaw);
  if (!Number.isInteger(goalIndex) || goalIndex < 0) {
    return { ok: false, result: fail("--goal 값은 0 이상의 정수여야 합니다.\n") };
  }

  if (command === undefined) {
    return { ok: false, result: fail("--command 값이 필요합니다.\n") };
  }

  return { ok: true, intentId, goalIndex, command };
};

const loadIntent = async (
  projectDir: string,
  intentId: string,
): Promise<{ ok: true; intent: IntentRecord } | { ok: false; result: CliResult }> => {
  const text = await readUtf8IfExists(join(fabricateDir(projectDir), "intent", `${intentId}.json`));
  if (text === null) {
    return {
      ok: false,
      result: fail(`잠긴 의도 레코드가 없습니다: ${intentId}\n`),
    };
  }

  const parsed = parseJson(text);
  if (!isIntentRecord(parsed)) {
    return {
      ok: false,
      result: fail(`잠긴 의도 레코드를 읽을 수 없습니다: ${intentId}\n`),
    };
  }

  return { ok: true, intent: parsed };
};

const loadEvidence = async (
  projectDir: string,
  intentId: string,
  goalIndex: number,
): Promise<{ ok: true; evidence: EvidenceRecord } | { ok: false; reason: string }> => {
  const text = await readUtf8IfExists(evidencePathFor(projectDir, intentId, goalIndex));
  if (text === null) {
    return { ok: false, reason: "증거 파일이 없습니다." };
  }

  const parsed = parseJson(text);
  if (!isEvidenceRecord(parsed)) {
    return { ok: false, reason: "증거 파일 형식이 올바르지 않습니다." };
  }

  return { ok: true, evidence: parsed };
};

const invalidEvidenceReason = (
  evidence: EvidenceRecord,
  intent: IntentRecord,
  expectedGoalIndex: number,
): string | null => {
  if (evidence.intent_id !== intent.id || evidence.goal_hash !== intent.goals.goal_hash) {
    return "다른 intent 의 증거입니다.";
  }

  if (evidence.goal_index !== expectedGoalIndex) {
    return `목표 인덱스가 다릅니다: expected ${expectedGoalIndex}, got ${evidence.goal_index}`;
  }

  if (evidence.exit_code !== 0) {
    return `검증 명령 실패: exit ${evidence.exit_code}`;
  }

  const lockedAt = Date.parse(intent.locked_at);
  const recordedAt = Date.parse(evidence.recorded_at);
  if (!Number.isFinite(lockedAt) || !Number.isFinite(recordedAt)) {
    return "증거 시각을 읽을 수 없습니다.";
  }

  if (recordedAt < lockedAt) {
    return "오래된 증거입니다.";
  }

  return null;
};

const evidencePathFor = (projectDir: string, intentId: string, goalIndex: number): string =>
  join(fabricateDir(projectDir), "evidence", intentId, `${goalIndex}.json`);

const runVerificationCommand = async (command: string, cwd: string): Promise<CommandResult> =>
  await new Promise((resolve) => {
    const child = spawn("/bin/sh", ["-c", command], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    child.on("close", (code, signal) => {
      resolve({
        code: code ?? signalExitCode(signal),
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });

const signalExitCode = (signal: NodeJS.Signals | null): number => {
  if (signal === "SIGINT") return 130;
  if (signal === "SIGTERM") return 143;
  if (signal === "SIGHUP") return 129;
  if (signal === "SIGKILL") return 137;
  return 1;
};

const tailLines = (text: string, maxLines = 8): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(-maxLines);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const isIntentRecord = (value: unknown): value is IntentRecord => {
  if (!isRecord(value)) return false;
  const goals = value.goals;

  return (
    typeof value.id === "string" &&
    typeof value.locked_at === "string" &&
    isRecord(goals) &&
    Array.isArray(goals.texts) &&
    goals.texts.every((text) => typeof text === "string") &&
    typeof goals.goal_hash === "string"
  );
};

const isEvidenceRecord = (value: unknown): value is EvidenceRecord =>
  isRecord(value) &&
  typeof value.intent_id === "string" &&
  Number.isInteger(value.goal_index) &&
  typeof value.goal_hash === "string" &&
  typeof value.command === "string" &&
  Number.isInteger(value.exit_code) &&
  typeof value.recorded_at === "string" &&
  Array.isArray(value.output_tail) &&
  value.output_tail.every((line) => typeof line === "string");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
