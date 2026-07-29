import { expect, test } from "bun:test";
import {
  type InterviewFixture,
  addCriterion,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("답변은 accepted 확인에 닿기 전까지 candidate 이고 accepted 후에만 close 가 통과한다", async () => {
  await withInterviewFixture("ip-1g", async (fixture) => {
    await createReadyInterviewThroughAnswer(fixture);

    const answerOnly = await close(fixture);

    expect(answerOnly.code).not.toBe(0);
    expect(answerOnly.stderr).toContain("확인 못 받은 답변");
    expect(answerOnly.stderr).toContain("A1");
    expect(await intentFiles(fixture)).toEqual([]);

    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R1",
      "--answer",
      "A1",
      "--text",
      "월요일 오전 사내망 조건에서 인증 실패가 반복되는 사례로 보겠습니다",
    ]);
    const restatedOnly = await close(fixture);

    expect(restatedOnly.code).not.toBe(0);
    expect(restatedOnly.stderr).toContain("확인 못 받은 답변");
    expect(restatedOnly.stderr).toContain("A1");
    expect(await intentFiles(fixture)).toEqual([]);

    await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", "rejected"]);
    const rejectedRestate = await close(fixture);

    expect(rejectedRestate.code).not.toBe(0);
    expect(rejectedRestate.stderr).toContain("확인 못 받은 답변");
    expect(rejectedRestate.stderr).toContain("A1");
    expect(await intentFiles(fixture)).toEqual([]);

    await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", "accepted"]);
    const acceptedRestate = await close(fixture);

    expect(acceptedRestate.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});

const createReadyInterviewThroughAnswer = async (fixture: InterviewFixture): Promise<void> => {
  await createSlashSession(fixture);
  await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
  await record(fixture, ["--kind", "fragment", "--id", "F2", "--text", "재현 조건"]);
  await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
  await record(fixture, [
    "--kind",
    "question",
    "--id",
    "Q1",
    "--dimension",
    "D1",
    "--covers",
    "F1,F2",
    "--text",
    "언제 로그인 실패가 재현되나요?",
  ]);
  await record(fixture, [
    "--kind",
    "answer",
    "--id",
    "A1",
    "--question",
    "Q1",
    "--text",
    "사내망에서 월요일 오전 로그인 실패가 반복됩니다",
  ]);
  await record(fixture, [
    "--kind",
    "resolve",
    "--dimension",
    "D1",
    "--evidence",
    "재현 조건 확인",
    "--answer",
    "A1",
  ]);
  await record(fixture, ["--kind", "contradiction-pass", "--text", "교차 답변 검사 완료"]);
  await addCriterion(fixture);
  await record(fixture, ["--kind", "goal", "--text", "로그인 실패의 재현 조건이 확인되어야 한다"]);
};
