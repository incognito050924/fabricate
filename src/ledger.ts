import { join } from "node:path";
import { appendJsonLine } from "./files.ts";
import { projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";
import { selectActiveSession } from "./session.ts";

export const recordStart = async (cwd: string): Promise<CliResult> => {
  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  await appendJsonLine(join(selected.session.dir, "ledger.jsonl"), {
    ts: new Date().toISOString(),
    kind: "start",
  });

  return ok("인터뷰 시작을 장부에 기록했습니다.\n");
};

export const recordTurn = async (
  cwd: string,
  args: string[],
  readStdin: () => Promise<string>,
): Promise<CliResult> => {
  const parsed = parseRecordArgs(args);

  if (!parsed.ok) {
    return parsed.result;
  }

  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  await appendJsonLine(join(selected.session.dir, "ledger.jsonl"), {
    ts: new Date().toISOString(),
    kind: parsed.kind,
    text: parsed.text ?? (await readStdin()),
  });

  return ok();
};

const parseRecordArgs = (
  args: string[],
): { ok: true; kind: string; text?: string } | { ok: false; result: CliResult } => {
  let kind: string | undefined;
  let text: string | undefined;
  let index = 0;

  while (index < args.length) {
    const arg = args[index];

    if (arg === "--kind") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--kind 값이 필요합니다.\n") };
      }
      kind = value;
      index += 2;
      continue;
    }

    if (arg === "--text") {
      const value = args[index + 1];
      if (value === undefined) {
        return { ok: false, result: fail("--text 값이 필요합니다.\n") };
      }
      text = value;
      index += 2;
      continue;
    }

    return { ok: false, result: fail(`알 수 없는 인자입니다: ${arg}\n`) };
  }

  if (kind === undefined) {
    return { ok: false, result: fail("--kind 값이 필요합니다.\n") };
  }

  return text === undefined ? { ok: true, kind } : { ok: true, kind, text };
};
