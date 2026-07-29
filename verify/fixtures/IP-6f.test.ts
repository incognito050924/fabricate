import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  intentFiles,
  ledger,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("soft criterion 은 rule 을 만들지 않고 사람 판정으로 남긴다", async () => {
  await withInterviewFixture("ip-6f-soft", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "criterion",
      "--id",
      "K1",
      "--text",
      "사용자가 납득할 설명 수준",
      "--type",
      "soft",
    ]);
    const beforeRule = await ledger(fixture);

    const rejectedRule = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "rule",
      "--criterion",
      "K1",
      "--text",
      "설명이 충분하면 통과한다",
    ]);

    expect(rejectedRule.code).not.toBe(0);
    expect(rejectedRule.stderr).toContain("사람 판정으로 남깁니다");
    expect(await ledger(fixture)).toHaveLength(beforeRule.length);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
