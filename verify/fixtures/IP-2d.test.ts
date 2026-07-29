import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("뒤집힌 전제는 stale 로 다시 열리고, 뒤집힌 뒤 재해소하면 잠근다", async () => {
  await withInterviewFixture("ip-2d-negative", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
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
      "월요일이 아니라 화요일 오후에 주로 실패했습니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R2",
      "--answer",
      "A2",
      "--text",
      "실패 조건을 화요일 오후 사례로 바꿔 보겠습니다",
    ]);
    await record(fixture, ["--kind", "confirm", "--restate", "R2", "--verdict", "accepted"]);
    await record(fixture, ["--kind", "contradiction-pass", "--text", "재검사 완료"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("전제가 뒤집혀 다시 열린 쟁점");
    expect(rejected.stderr).toContain("D1");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2d-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
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
      "월요일이 아니라 화요일 오후에 주로 실패했습니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R2",
      "--answer",
      "A2",
      "--text",
      "실패 조건을 화요일 오후 사례로 바꿔 보겠습니다",
    ]);
    await record(fixture, ["--kind", "confirm", "--restate", "R2", "--verdict", "accepted"]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D1",
      "--evidence",
      "뒤집힌 답 재확인",
      "--answer",
      "A2",
    ]);
    await record(fixture, ["--kind", "contradiction-pass", "--text", "재검사 완료"]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
