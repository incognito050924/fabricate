import { expect, test } from "bun:test";
import {
  createSlashSession,
  fabricate,
  ledger,
  recommendation,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("question 은 실제 dimension 에 묶여야 하고 거부된 question 은 장부를 오염시키지 않는다", async () => {
  await withInterviewFixture("ip-1e", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    const beforeMissingDimension = await ledger(fixture);

    const missingDimension = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "question",
      "--id",
      "Q-missing",
      "--text",
      "어떤 조건에서 로그인 실패가 나나요?",
    ]);

    expect(missingDimension.code).not.toBe(0);
    expect(missingDimension.stderr).toContain("--dimension 값이 필요합니다");
    expect(await ledger(fixture)).toHaveLength(beforeMissingDimension.length);

    const beforeUnknownDimension = await ledger(fixture);
    const unknownDimension = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "question",
      "--id",
      "Q-unknown",
      "--dimension",
      "D404",
      "--text",
      "어떤 조건에서 로그인 실패가 나나요?",
      ...recommendation,
    ]);

    expect(unknownDimension.code).not.toBe(0);
    expect(unknownDimension.stderr).toContain("존재하지 않는 dimension 입니다: D404");
    expect(await ledger(fixture)).toHaveLength(beforeUnknownDimension.length);

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

    const entries = await ledger(fixture);
    expect(entries.at(-1)).toMatchObject({
      kind: "question",
      id: "Q1",
      dimension: "D1",
      covers: ["F1"],
    });
  });
});
