import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("미해소 차원이 남으면 close 가 거부하고, 해소하면 잠근다", async () => {
  await withInterviewFixture("ip-2a-negative", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "dimension",
      "--id",
      "D2",
      "--text",
      "사용자가 아직 답하지 않은 환경 차원",
    ]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("Dimensions still open");
    expect(rejected.stderr).toContain("D2");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2a-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
