import { expect, test } from "bun:test";
import {
  createSlashSession,
  fabricate,
  ledger,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("사용자 답변과 너무 겹치는 재진술은 거부하고 다른 말과 구체 사례는 장부에 남긴다", async () => {
  await withInterviewFixture("ip-1h", async (fixture) => {
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
      "어떤 조건에서 로그인 실패가 나나요?",
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
    const beforeEcho = await ledger(fixture);

    const echo = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "restate",
      "--id",
      "R-echo",
      "--answer",
      "A1",
      "--text",
      "사내망에서 월요일 오전 로그인 실패가 반복됩니다",
    ]);

    expect(echo.code).not.toBe(0);
    expect(echo.stderr).toContain("overlaps the user's own answer too much");
    expect(await ledger(fixture)).toHaveLength(beforeEcho.length);

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

    const entries = await ledger(fixture);
    expect(entries.at(-1)).toMatchObject({
      kind: "restate",
      id: "R1",
      answer: "A1",
    });
  });
});
