import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("근거와 답변 없이 resolve 된 차원은 unevaluated 로 강등되고, 근거를 붙이면 잠근다", async () => {
  await withInterviewFixture("ip-2c-negative", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "resolve", "--dimension", "D1"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("Dimensions closed without evidence");
    expect(rejected.stderr).toContain("D1");
    expect(rejected.stderr).toContain("closed-without-evidence=1");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2c-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "resolve", "--dimension", "D1"]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D1",
      "--evidence",
      "추가 근거",
      "--answer",
      "A1",
    ]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(accepted.stdout).toContain("closed-without-evidence=0");
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
