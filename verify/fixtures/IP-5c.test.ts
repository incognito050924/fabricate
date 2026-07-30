import { expect, test } from "bun:test";
import {
  createSlashSession,
  expectOk,
  fabricate,
  ledger,
  recommendation,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("driver 로 정규화되는 reviewer 와 세션 id 자신은 거부되고, 다른 컨텍스트 이름은 통과한다", async () => {
  const rejectedReviewers = [
    "driver",
    "Driver",
    "driver ",
    "the driver",
    "driver-session",
    "session-1",
  ];

  for (const reviewer of rejectedReviewers) {
    await withInterviewFixture(
      `ip-5c-${reviewer.replaceAll(/[^A-Za-z0-9_-]+/g, "_")}`,
      async (fixture) => {
        await createSlashSession(fixture);
        const before = await ledger(fixture);

        const rejected = await fabricate(fixture, [
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
          reviewer,
          "--reason",
          "세션 서사 없이 답할 수 있는 질문입니다",
        ]);

        expect(rejected.code).not.toBe(0);
        expect(rejected.stderr).toContain("The reviewer is the driver itself");
        expect(await ledger(fixture)).toHaveLength(before.length);
      },
    );
  }

  await withInterviewFixture("ip-5c-positive", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);

    // The machine sees only the reviewer name string. It does not prove that a
    // subagent actually ran; GOAL §8 declares that residual explicitly.
    const acceptedReview = await fabricate(fixture, [
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
    await expectOk(acceptedReview, "turn record review with non-driver reviewer");

    const acceptedQuestion = await fabricate(fixture, [
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
      ...recommendation,
    ]);
    await expectOk(acceptedQuestion, "turn record question after non-driver review");
  });
});
