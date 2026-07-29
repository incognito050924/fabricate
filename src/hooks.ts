import { join } from "node:path";
import { FABRICATE_COMMAND_NAME } from "./constants.ts";
import { pathExists, writeFileIfAbsent } from "./files.ts";
import { booleanField, objectField, parseJsonObject, stringField } from "./json.ts";
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
  const promptId = stringField(payload, "prompt_id");
  const session = await ensureHookSession({
    createdBy: "user-prompt-expansion",
    projectDir,
    sessionId,
    promptId,
  });

  await writeFileIfAbsent(join(session.dir, "request.txt"), stringField(payload, "command_args"));
  await appendHookObservation(session, {
    hook_event_name: stringField(payload, "hook_event_name"),
    prompt_id: promptId,
    session_id: sessionId,
    command_name: commandName,
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
  const promptId = stringField(payload, "prompt_id");
  const session = await ensureHookSession({
    createdBy: "pre-tool-use",
    projectDir,
    sessionId,
    promptId,
  });

  await appendHookObservation(session, {
    hook_event_name: stringField(payload, "hook_event_name"),
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

  await appendHookObservation(
    {
      projectDir,
      sessionId: id,
      dir,
    },
    {
      hook_event_name: stringField(payload, "hook_event_name"),
      prompt_id: stringField(payload, "prompt_id"),
      stop_hook_active: booleanField(payload, "stop_hook_active"),
    },
  );

  return ok();
};
