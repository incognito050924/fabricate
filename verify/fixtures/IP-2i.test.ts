import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("overturns 없는 답은 하류 차원을 stale 로 만들지 않는다", async () => {
  await withInterviewFixture("ip-2i-negative-control", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "dimension",
      "--id",
      "D2",
      "--depends-on",
      "D1",
      "--text",
      "하류 차원",
    ]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D2",
      "--evidence",
      "하류 확인",
      "--answer",
      "A1",
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A2",
      "--question",
      "Q1",
      "--overturns",
      "D1",
      "--text",
      "기존 전제를 뒤집는 새 답입니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R2",
      "--answer",
      "A2",
      "--text",
      "기존 전제를 반대로 놓고 다시 보겠습니다",
    ]);
    await record(fixture, ["--kind", "confirm", "--restate", "R2", "--verdict", "accepted"]);
    await record(fixture, ["--kind", "contradiction-pass", "--text", "재검사 완료"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("Dimensions reopened by an overturned premise");
    expect(rejected.stderr).toContain("D1");
    expect(rejected.stderr).toContain("D2");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2i-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "dimension",
      "--id",
      "D2",
      "--depends-on",
      "D1",
      "--text",
      "하류 차원",
    ]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D2",
      "--evidence",
      "하류 확인",
      "--answer",
      "A1",
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A2",
      "--question",
      "Q1",
      "--text",
      "전제와 무관한 추가 답입니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R2",
      "--answer",
      "A2",
      "--text",
      "기존 전제는 유지하고 추가 사례만 보태겠습니다",
    ]);
    await record(fixture, ["--kind", "confirm", "--restate", "R2", "--verdict", "accepted"]);
    await record(fixture, ["--kind", "contradiction-pass", "--text", "재검사 완료"]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(accepted.stderr).not.toContain("Dimensions reopened by an overturned premise");
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
