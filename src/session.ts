import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FABRICATE_DIR } from "./constants.ts";
import {
  appendJsonLine,
  ensureDir,
  nowIso,
  pathExists,
  readUtf8IfExists,
  writeFileIfAbsent,
} from "./files.ts";
import type { CliResult } from "./result.ts";
import { fail } from "./result.ts";

export type SessionRef = {
  projectDir: string;
  sessionId: string;
  dir: string;
};

export type MarkerInput = {
  createdBy: string;
  projectDir: string;
  sessionId: string;
  promptId: string | null;
};

// Written by the Stop hook at the end of every turn, so it is also the only
// record of where the current turn began. Two readers: the hook, which asks
// whether the ledger grew, and the status block, which asks what changed.
export type TurnState = {
  prompt_id: string;
  start_L: number;
  last_L: number;
};

export const turnStatePath = (sessionDirPath: string): string =>
  join(sessionDirPath, "turnstate.json");

export const writeTurnState = async (path: string, state: TurnState): Promise<void> => {
  await writeFile(path, `${JSON.stringify(state)}\n`, "utf8");
};

export const readTurnState = async (path: string): Promise<TurnState | null> => {
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

export const sessionsDir = (projectDir: string): string =>
  join(projectDir, FABRICATE_DIR, "sessions");

export const sessionDir = (projectDir: string, sessionId: string): string =>
  join(sessionsDir(projectDir), sessionId);

export const ensureHookSession = async (input: MarkerInput): Promise<SessionRef> => {
  const dir = sessionDir(input.projectDir, input.sessionId);
  await ensureDir(dir);
  await writeFileIfAbsent(
    join(dir, "active"),
    `${JSON.stringify({
      created_by: input.createdBy,
      session_id: input.sessionId,
      prompt_id: input.promptId,
      created_at: nowIso(),
    })}\n`,
  );

  return {
    projectDir: input.projectDir,
    sessionId: input.sessionId,
    dir,
  };
};

export const appendHookObservation = async (
  session: SessionRef,
  observation: Record<string, unknown>,
): Promise<void> => {
  await appendJsonLine(join(session.dir, "hooks.jsonl"), {
    ...observation,
    // The host sets this only for hook child processes. It is the sole runtime
    // witness of which directory the installed plugin actually executes from.
    plugin_root: process.env.CLAUDE_PLUGIN_ROOT ?? null,
    ts: nowIso(),
  });
};

export const selectActiveSession = async (
  projectDir: string,
): Promise<{ ok: true; session: SessionRef } | { ok: false; result: CliResult }> => {
  const root = sessionsDir(projectDir);

  if (!(await pathExists(root))) {
    return {
      ok: false,
      result: fail("No active interview session. Start one with `/fabricate:deep-interview`.\n"),
    };
  }

  const entries = await readdir(root, { withFileTypes: true });
  const activeSessions: SessionRef[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dir = join(root, entry.name);
    if (await pathExists(join(dir, "active"))) {
      activeSessions.push({
        projectDir,
        sessionId: entry.name,
        dir,
      });
    }
  }

  if (activeSessions.length === 0) {
    return {
      ok: false,
      result: fail("No active interview session. Start one with `/fabricate:deep-interview`.\n"),
    };
  }

  if (activeSessions.length > 1) {
    return {
      ok: false,
      result: fail(
        `${activeSessions.length} active interview sessions. Leave exactly one and run again.\n`,
      ),
    };
  }

  const session = activeSessions[0];

  if (session !== undefined) {
    return { ok: true, session };
  }

  return {
    ok: false,
    result: fail("Could not read the active interview session.\n"),
  };
};
