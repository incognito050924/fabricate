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
  promptId: string;
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
      result: fail("활성 인터뷰 세션이 없습니다. `/fabricate:deep-interview`로 시작하세요.\n"),
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
      result: fail("활성 인터뷰 세션이 없습니다. `/fabricate:deep-interview`로 시작하세요.\n"),
    };
  }

  if (activeSessions.length > 1) {
    return {
      ok: false,
      result: fail(
        `활성 인터뷰 세션이 ${activeSessions.length}개입니다. 하나만 남긴 뒤 다시 실행하세요.\n`,
      ),
    };
  }

  const session = activeSessions[0];

  if (session !== undefined) {
    return { ok: true, session };
  }

  return {
    ok: false,
    result: fail("활성 인터뷰 세션을 확인할 수 없습니다.\n"),
  };
};
