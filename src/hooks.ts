import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FABRICATE_COMMAND_NAME } from "./constants.ts";
import {
  appendJsonLine,
  pathExists,
  readJsonLines,
  readUtf8IfExists,
  writeFileIfAbsent,
} from "./files.ts";
import {
  objectField,
  optionalBoolean,
  optionalString,
  parseJsonObject,
  stringField,
} from "./json.ts";
import { projectDirFromHookPayload } from "./project.ts";
import type { CliResult } from "./result.ts";
import { ok } from "./result.ts";
import { appendHookObservation, ensureHookSession, sessionDir } from "./session.ts";

export type HookEvent = "user-prompt-expansion" | "pre-tool-use" | "stop";

export const handleHook = async (event: HookEvent, stdinText: string): Promise<CliResult> => {
  const payload = parseJsonObject(stdinText);

  if (event === "user-prompt-expansion") {
    return await handleUserPromptExpansion(payload);
  }

  if (event === "pre-tool-use") {
    return await handlePreToolUse(payload);
  }

  return await handleStop(payload);
};

const handleUserPromptExpansion = async (payload: Record<string, unknown>): Promise<CliResult> => {
  const commandName = stringField(payload, "command_name");

  if (commandName !== FABRICATE_COMMAND_NAME) {
    return ok();
  }

  const projectDir = projectDirFromHookPayload(stringField(payload, "cwd"));
  const sessionId = stringField(payload, "session_id");
  const promptId = optionalString(payload, "prompt_id");
  const session = await ensureHookSession({
    createdBy: "user-prompt-expansion",
    projectDir,
    sessionId,
    promptId,
  });
  const commandArgs = optionalString(payload, "command_args");

  // An empty argument is not user text. Writing an empty request.txt would let a
  // session claim it has the user's words when it does not (GOAL.md IP-2ⓜ).
  if (commandArgs !== null && commandArgs.length > 0) {
    await writeFileIfAbsent(join(session.dir, "request.txt"), commandArgs);
  }

  await appendHookObservation(session, {
    hook_event_name: optionalString(payload, "hook_event_name"),
    prompt_id: promptId,
    session_id: sessionId,
    command_name: commandName,
    request_written: commandArgs !== null && commandArgs.length > 0,
  });

  return ok();
};

const handlePreToolUse = async (payload: Record<string, unknown>): Promise<CliResult> => {
  const toolInput = objectField(payload, "tool_input");
  const skillName = stringField(toolInput, "skill");

  if (skillName !== FABRICATE_COMMAND_NAME) {
    return ok();
  }

  const projectDir = projectDirFromHookPayload(stringField(payload, "cwd"));
  const sessionId = stringField(payload, "session_id");
  const promptId = optionalString(payload, "prompt_id");
  const session = await ensureHookSession({
    createdBy: "pre-tool-use",
    projectDir,
    sessionId,
    promptId,
  });

  await appendHookObservation(session, {
    hook_event_name: optionalString(payload, "hook_event_name"),
    prompt_id: promptId,
    session_id: sessionId,
    skill: skillName,
  });

  return ok();
};

const handleStop = async (payload: Record<string, unknown>): Promise<CliResult> => {
  const projectDir = projectDirFromHookPayload(stringField(payload, "cwd"));
  const id = stringField(payload, "session_id");
  const dir = sessionDir(projectDir, id);

  if (!(await pathExists(dir))) {
    return ok();
  }

  const session = {
    projectDir,
    sessionId: id,
    dir,
  };
  const promptId = optionalString(payload, "prompt_id");
  const stopHookActive = optionalBoolean(payload, "stop_hook_active");

  await appendHookObservation(session, {
    hook_event_name: optionalString(payload, "hook_event_name"),
    prompt_id: promptId,
    stop_hook_active: stopHookActive,
  });

  if (promptId === null) {
    return ok();
  }

  const active = await pathExists(join(dir, "active"));

  if (!active) {
    return ok();
  }

  const ledgerLength = (await readJsonLines(join(dir, "ledger.jsonl"))).length;
  const previous = await readTurnState(join(dir, "turnstate.json"));
  const sameTurn = previous?.prompt_id === promptId;
  const startLength = sameTurn ? previous.start_L : (previous?.last_L ?? 0);
  const ledgerAdvanced = ledgerLength > startLength;
  const turnStatePath = join(dir, "turnstate.json");

  if (ledgerAdvanced) {
    await writeTurnState(turnStatePath, {
      prompt_id: promptId,
      start_L: startLength,
      last_L: ledgerLength,
    });
    return ok();
  }

  if (stopHookActive === true) {
    await appendJsonLine(join(dir, "ledger.jsonl"), {
      ts: new Date().toISOString(),
      kind: "turn-violation",
      prompt_id: promptId,
      start_L: startLength,
      last_L: ledgerLength,
      reason: "활성 인터뷰 턴에서 장부가 늘지 않았습니다.",
    });
    await writeTurnState(turnStatePath, {
      prompt_id: promptId,
      start_L: startLength,
      last_L: ledgerLength + 1,
    });
    return ok();
  }

  await writeTurnState(turnStatePath, {
    prompt_id: promptId,
    start_L: startLength,
    last_L: ledgerLength,
  });
  return ok(
    `${JSON.stringify({
      decision: "block",
      reason:
        "활성 인터뷰 세션인데 이번 턴에 장부가 늘지 않았습니다. 질문이나 판단을 사용자에게 내기 전에 `fabricate turn record ...`로 이번 턴의 장부를 기록하세요.",
    })}\n`,
  );
};

const writeTurnState = async (path: string, state: TurnState): Promise<void> => {
  await writeFile(path, `${JSON.stringify(state)}\n`, "utf8");
};

type TurnState = {
  prompt_id: string;
  start_L: number;
  last_L: number;
};

const readTurnState = async (path: string): Promise<TurnState | null> => {
  const text = await readUtf8IfExists(path);

  if (text === null) {
    return null;
  }

  const parsed = JSON.parse(text) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const object = parsed as Record<string, unknown>;

  if (
    typeof object.prompt_id !== "string" ||
    typeof object.start_L !== "number" ||
    typeof object.last_L !== "number"
  ) {
    return null;
  }

  return {
    prompt_id: object.prompt_id,
    start_L: object.start_L,
    last_L: object.last_L,
  };
};
