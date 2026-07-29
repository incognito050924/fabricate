import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("미커버 조각과 fragment 0개는 거부하고, 질문 covers 로 덮으면 잠근다", async () => {
  await withInterviewFixture("ip-2b-uncovered", async (fixture) => {
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
      "F1",
      "--text",
      "로그인 실패 조건은 무엇인가요?",
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A1",
      "--question",
      "Q1",
      "--text",
      "사내망에서 월요일 오전 실패합니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R1",
      "--answer",
      "A1",
      "--text",
      "월요일 오전 사내망 조건에서 인증 실패가 반복되는 사례입니다",
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
    await record(fixture, ["--kind", "goal", "--text", "실패 조건과 재현 조건을 확인한다"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("어느 질문에도 안 걸린 조각");
    expect(rejected.stderr).toContain("F2");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2b-zero-fragment", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    await record(fixture, [
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--text",
      "로그인 실패 조건은 무엇인가요?",
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A1",
      "--question",
      "Q1",
      "--text",
      "사내망에서 월요일 오전 실패합니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R1",
      "--answer",
      "A1",
      "--text",
      "월요일 오전 사내망 조건에서 인증 실패가 반복되는 사례입니다",
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
    await record(fixture, ["--kind", "goal", "--text", "실패 조건과 재현 조건을 확인한다"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("사용자 말을 조각으로 하나도 안 쪼갰습니다");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2b-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
