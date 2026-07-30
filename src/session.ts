import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { FABRICATE_DIR } from "./constants.ts";
import { appendJsonLine, ensureDir, nowIso, pathExists, writeFileIfAbsent } from "./files.ts";
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
