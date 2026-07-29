import { expect, test } from "bun:test";
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { InterviewFixture } from "../support/interview-fixture.ts";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("다른 intent 의 증거 파일을 재사용하면 거부하고 같은 intent 에서 기록한 증거만 통과한다", async () => {
  await withInterviewFixture("ip-4d-a", async (a) => {
    a.sessionId = "intent-a";
    await lockCompleteIntent(a);
    await recordSuccessfulEvidence(a);

    await withInterviewFixture("ip-4d-b", async (b) => {
      b.sessionId = "intent-b";
      await lockCompleteIntent(b);
      await mkdir(join(b.projectDir, ".fabricate", "evidence", b.sessionId), {
        recursive: true,
      });
      await copyFile(evidencePath(a), evidencePath(b));

      const reused = await fabricate(b, ["check", b.sessionId]);

      expect(reused.code).not.toBe(0);
      expect(reused.stderr).toContain("다른 intent");

      await recordSuccessfulEvidence(b);

      const checked = await fabricate(b, ["check", b.sessionId]);
      expect(checked.code).toBe(0);
    });
  });
});

const lockCompleteIntent = async (fixture: InterviewFixture): Promise<void> => {
  await createSlashSession(fixture);
  await addCompleteInterview(fixture);
  const closed = await close(fixture);
  expect(closed.code).toBe(0);
};

const recordSuccessfulEvidence = async (fixture: InterviewFixture): Promise<void> => {
  const recorded = await fabricate(fixture, [
    "check",
    "record",
    "--intent",
    fixture.sessionId,
    "--goal",
    "0",
    "--command",
    "printf 'owned evidence\\n'",
  ]);
  expect(recorded.code).toBe(0);
};

const evidencePath = (fixture: InterviewFixture): string =>
  join(fixture.projectDir, ".fabricate", "evidence", fixture.sessionId, "0.json");
