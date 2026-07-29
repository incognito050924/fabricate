import { expect, test } from "bun:test";
import {
  createSlashSession,
  expectOk,
  fabricate,
  ledger,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("reject 된 review 와 검토 문안 불일치는 question 을 막고, 재검토 pass 는 통과한다", async () => {
  await withInterviewFixture("ip-5b", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);

    await expectOk(
      await review(fixture, {
        question: "Q1",
        text: "로그인 실패 조건은 무엇인가요?",
        verdict: "reject",
      }),
      "turn record review reject",
    );

    const rejectedQuestion = await question(fixture, {
      id: "Q1",
      text: "로그인 실패 조건은 무엇인가요?",
    });

    expect(rejectedQuestion.code).not.toBe(0);
    expect(rejectedQuestion.stderr).toContain("세션-맹검 검토가 질문을 거부했습니다");
    expect((await ledger(fixture)).some((entry) => entry.kind === "question")).toBe(false);

    await expectOk(
      await review(fixture, {
        question: "Q2",
        text: "검토받은 질문 문안입니다",
        verdict: "pass",
      }),
      "turn record review pass",
    );

    const changedTextQuestion = await question(fixture, {
      id: "Q2",
      text: "검토받지 않은 질문 문안입니다",
    });

    expect(changedTextQuestion.code).not.toBe(0);
    expect(changedTextQuestion.stderr).toContain("검토받은 질문 문안과 다릅니다");
    expect((await ledger(fixture)).some((entry) => entry.kind === "question")).toBe(false);

    await expectOk(
      await review(fixture, {
        question: "Q1",
        text: "로그인 실패 조건은 무엇인가요?",
        verdict: "pass",
      }),
      "turn record review pass retry",
    );

    const acceptedQuestion = await question(fixture, {
      id: "Q1",
      text: "로그인 실패 조건은 무엇인가요?",
    });
    await expectOk(acceptedQuestion, "turn record question after retry");

    const entries = await ledger(fixture);
    expect(
      entries.some(
        (entry) =>
          entry.kind === "question" &&
          entry.id === "Q1" &&
          entry.text === "로그인 실패 조건은 무엇인가요?",
      ),
    ).toBe(true);
    expect(entries.some((entry) => entry.kind === "question" && entry.id === "Q2")).toBe(false);
  });
});

type Fixture = Parameters<typeof fabricate>[0];

const review = async (
  fixture: Fixture,
  input: { question: string; text: string; verdict: "pass" | "reject" },
) =>
  await fabricate(fixture, [
    "turn",
    "record",
    "--kind",
    "review",
    "--question",
    input.question,
    "--text",
    input.text,
    "--verdict",
    input.verdict,
    "--reviewer",
    "blind-reviewer",
    "--reason",
    "세션 서사 없이 답할 수 있는 질문인지 검토했습니다",
  ]);

const question = async (fixture: Fixture, input: { id: string; text: string }) =>
  await fabricate(fixture, [
    "turn",
    "record",
    "--kind",
    "question",
    "--id",
    input.id,
    "--dimension",
    "D1",
    "--covers",
    "F1",
    "--text",
    input.text,
  ]);
