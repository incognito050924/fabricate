import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createModelSession,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("PreToolUse 로 시작된 원문 없는 세션은 거부되고, 같은 session_id 의 UPE 가 원문을 앉히면 잠근다", async () => {
  await withInterviewFixture("ip-2m-negative", async (fixture) => {
    await createModelSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    await record(fixture, [
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--text",
      "모델 경로 질문",
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A1",
      "--question",
      "Q1",
      "--text",
      "모델 경로에서 답이 기록됐습니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R1",
      "--answer",
      "A1",
      "--text",
      "모델 경로 답을 별도 사례로 바꿔 확인합니다",
    ]);
    await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", "accepted"]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D1",
      "--evidence",
      "답변 확인",
      "--answer",
      "A1",
    ]);
    await record(fixture, ["--kind", "contradiction-pass", "--text", "검사 완료"]);
    await record(fixture, ["--kind", "goal", "--text", "원문 없는 경로는 잠기면 안 된다"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("사용자 원문이 없습니다");
    expect(rejected.stderr).toContain("/fabricate:deep-interview");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2m-positive", async (fixture) => {
    await createModelSession(fixture);
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
