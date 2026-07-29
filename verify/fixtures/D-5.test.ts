import { expect, test } from "bun:test";
import {
  createSlashSession,
  fabricate,
  ledger,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

type Fixture = Parameters<typeof fabricate>[0] & Parameters<typeof record>[0];

const askAndAnswer = async (fixture: Fixture, answerText: string): Promise<void> => {
  await createSlashSession(fixture);
  await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
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
    "(가) 월요일만입니까, (나) 매일입니까?",
  ]);
  await record(fixture, [
    "--kind",
    "answer",
    "--id",
    "A1",
    "--question",
    "Q1",
    "--text",
    answerText,
  ]);
};

const restate = async (fixture: Fixture, text: string) =>
  await fabricate(fixture, [
    "turn",
    "record",
    "--kind",
    "restate",
    "--id",
    "R1",
    "--answer",
    "A1",
    "--text",
    text,
  ]);

test("한 낱말 답변은 그 낱말을 다시 써도 앵무새가 아니다", async () => {
  await withInterviewFixture("d-5-one-word", async (fixture) => {
    await askAndAnswer(fixture, "(가)");

    // The old ratio put every token of a one-word answer at 1/1, so any restate
    // that named the choice was rejected. What that taught the driver was to dodge
    // the user's word, not to think harder.
    const accepted = await restate(
      fixture,
      "(가) 를 고르셨으니 화요일에 같은 증상이 나오면 그건 다른 문제로 보겠습니다",
    );

    expect(accepted.code).toBe(0);
    expect((await ledger(fixture)).at(-1)).toMatchObject({ kind: "restate", id: "R1" });
  });
});

test("짧은 답변이라도 새로 보탠 말이 없으면 거부한다", async () => {
  await withInterviewFixture("d-5-one-word-parrot", async (fixture) => {
    await askAndAnswer(fixture, "(가)");
    const before = await ledger(fixture);

    const parrot = await restate(fixture, "(가)");

    expect(parrot.code).not.toBe(0);
    expect(parrot.stderr).toContain("바꿔 말한 문장이 사용자 답변과 너무 겹칩니다");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });
});

test("긴 답변을 그대로 되받는 것은 여전히 거부한다", async () => {
  await withInterviewFixture("d-5-long-parrot", async (fixture) => {
    await askAndAnswer(fixture, "사내망에서 월요일 오전 로그인 실패가 반복됩니다");
    const before = await ledger(fixture);

    const parrot = await restate(
      fixture,
      "그러니까 사내망에서 월요일 오전 로그인 실패가 반복됩니다",
    );

    expect(parrot.code).not.toBe(0);
    expect(await ledger(fixture)).toHaveLength(before.length);
  });
});
