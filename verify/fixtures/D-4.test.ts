import { expect, test } from "bun:test";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  stopHook,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

const markerPresent = async (fixture: {
  projectDir: string;
  sessionId: string;
}): Promise<boolean> => {
  try {
    await stat(join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "active"));
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

test("닫힌 인터뷰는 활성 표식을 남기지 않는다 — 끝낸 뒤 일반 대화가 막히면 안 된다", async () => {
  await withInterviewFixture("d-4-close-clears", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);

    expect(await markerPresent(fixture)).toBe(true);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
    expect(await markerPresent(fixture)).toBe(false);
  });
});

test("닫은 뒤의 턴은 Stop 훅이 막지 않는다", async () => {
  await withInterviewFixture("d-4-stop-after-close", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await close(fixture, hash);

    // A turn that records nothing is exactly what the Stop hook blocks while an
    // interview is live. After close there is no interview, so it must pass.
    const afterClose = await stopHook({ fixture, promptId: "prompt-after-close" });

    expect(afterClose.code).toBe(0);
    expect(afterClose.stdout).toBe("");
  });
});

test("거부된 닫기는 표식을 지우지 않는다 — 인터뷰는 아직 진행 중이다", async () => {
  await withInterviewFixture("d-4-rejected-keeps", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);

    const rejected = await close(fixture, "not-the-hash");

    expect(rejected.code).not.toBe(0);
    expect(await markerPresent(fixture)).toBe(true);

    // This turn recorded the rejection, so it passes. The next one records nothing
    // and must still be blocked — the interview is not over.
    await stopHook({ fixture, promptId: "prompt-after-reject" });
    const blocked = await stopHook({ fixture, promptId: "prompt-next" });
    expect(JSON.parse(blocked.stdout)).toMatchObject({ decision: "block" });
  });
});
