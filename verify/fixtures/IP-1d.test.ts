import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("질문을 하나도 하지 않은 세션은 닫히지 않고, 질문과 답변 흐름이 있으면 닫힌다", async () => {
  await withInterviewFixture("ip-1d-negative", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    await record(fixture, ["--kind", "goal", "--text", "로그인 실패 조건이 확인되어야 한다"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("No question was ever asked");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-1d-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
