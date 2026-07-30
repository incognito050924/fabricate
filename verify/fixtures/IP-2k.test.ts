import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  markModelSession,
  markSlashSession,
  stopHook,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

const activeSessionIds = async (projectDir: string): Promise<string[]> => {
  const sessionsRoot = join(projectDir, ".fabricate", "sessions");

  try {
    const entries = await readdir(sessionsRoot, { withFileTypes: true });
    const ids: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      try {
        await readFile(join(sessionsRoot, entry.name, "active"), "utf8");
        ids.push(entry.name);
      } catch {
        // A session directory without an active marker is not active.
      }
    }

    return ids.sort();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

test("표식 없는 프로젝트에서 Stop 훅은 인터뷰 턴으로 판정하지 않는다", async () => {
  await withInterviewFixture("ip-2k-no-marker", async (fixture) => {
    const stopped = await stopHook({ fixture, promptId: "prompt-1" });

    expect(stopped.code).toBe(0);
    expect(stopped.stdout).toBe("");
    expect(await activeSessionIds(fixture.projectDir)).toEqual([]);
  });
});

test("UPE 와 PreToolUse 가 같은 session_id 에서 발화해도 활성 표식은 하나이고 created_by 는 보존된다", async () => {
  await withInterviewFixture("ip-2k-idempotent", async (fixture) => {
    const upe = await markSlashSession(fixture, "prompt-1");
    expect(upe.code).toBe(0);
    expect(await activeSessionIds(fixture.projectDir)).toEqual([fixture.sessionId]);

    const activePath = join(
      fixture.projectDir,
      ".fabricate",
      "sessions",
      fixture.sessionId,
      "active",
    );
    const before = JSON.parse(await readFile(activePath, "utf8")) as Record<string, unknown>;
    expect(before.created_by).toBe("user-prompt-expansion");

    const preToolUse = await markModelSession(fixture, "prompt-1");
    expect(preToolUse.code).toBe(0);
    expect(await activeSessionIds(fixture.projectDir)).toEqual([fixture.sessionId]);

    const after = JSON.parse(await readFile(activePath, "utf8")) as Record<string, unknown>;
    expect(after.created_by).toBe("user-prompt-expansion");
  });
});

test("PreToolUse 만으로 열린 세션도 start 없이 Stop 훅이 막는다", async () => {
  await withInterviewFixture("ip-2k-model-path-block", async (fixture) => {
    const marked = await markModelSession(fixture, "prompt-1");
    expect(marked.code).toBe(0);

    const blocked = await stopHook({ fixture, promptId: "prompt-1" });

    expect(blocked.code).toBe(0);
    expect(JSON.parse(blocked.stdout)).toMatchObject({ decision: "block" });
    expect(blocked.stdout).toContain("ledger");
  });
});
