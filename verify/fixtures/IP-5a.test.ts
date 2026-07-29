import { expect, test } from "bun:test";
import {
  createSlashSession,
  expectOk,
  fabricate,
  ledger,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("질문 전에 세션-맹검 review 가 장부에 남고, review 없이는 question 이 장부에 남지 않는다", async () => {
  await withInterviewFixture("ip-5a-positive", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);

    const review = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "review",
      "--question",
      "Q1",
      "--text",
      "어떤 조건에서 로그인 실패가 나나요?",
      "--verdict",
      "pass",
      "--reviewer",
      "blind-reviewer",
      "--reason",
      "세션 서사 없이 답할 수 있는 질문입니다",
    ]);
    await expectOk(review, "turn record review");

    const question = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--covers",
      "F1",
      "--text",
      "어떤 조건에서 로그인 실패가 나나요?",
    ]);
    await expectOk(question, "turn record question");

    const entries = await ledger(fixture);
    const reviewIndex = entries.findIndex((entry) => entry.kind === "review");
    const questionIndex = entries.findIndex((entry) => entry.kind === "question");

    expect(reviewIndex).toBeGreaterThan(-1);
    expect(questionIndex).toBeGreaterThan(-1);
    expect(reviewIndex).toBeLessThan(questionIndex);
  });

  await withInterviewFixture("ip-5a-negative", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    const before = await ledger(fixture);

    const question = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--covers",
      "F1",
      "--text",
      "어떤 조건에서 로그인 실패가 나나요?",
    ]);

    expect(question.code).not.toBe(0);
    expect(question.stderr).toContain("세션-맹검 검토 없이 질문할 수 없습니다");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });
});
