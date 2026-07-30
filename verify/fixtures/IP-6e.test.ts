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

test("hard criterion 은 사용자 판정 예시 뒤에 rule 이 있어야 close 를 통과한다", async () => {
  await withInterviewFixture("ip-6e-hard", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "criterion",
      "--id",
      "K1",
      "--text",
      "재현 가능 판정",
      "--type",
      "hard",
    ]);

    const beforeRule = await ledger(fixture);
    const rejectedEarlyRule = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "rule",
      "--criterion",
      "K1",
      "--text",
      "사용자가 재현 가능이라고 판정한 예시만 통과한다",
    ]);

    expect(rejectedEarlyRule.code).not.toBe(0);
    expect(rejectedEarlyRule.stderr).toContain("at least one example");
    expect(await ledger(fixture)).toHaveLength(beforeRule.length);

    const rejectedWithoutExample = await close(fixture, hash);

    expect(rejectedWithoutExample.code).not.toBe(0);
    expect(rejectedWithoutExample.stderr).toContain("Hard criteria with no example");
    expect(rejectedWithoutExample.stderr).toContain("K1");
    expect(await intentFiles(fixture)).toEqual([]);

    await record(fixture, [
      "--kind",
      "example",
      "--id",
      "E1",
      "--criterion",
      "K1",
      "--text",
      "월요일 오전 사내망에서 3회 재현",
      "--verdict",
      "재현 가능",
    ]);

    const rejectedWithoutRule = await close(fixture, hash);

    expect(rejectedWithoutRule.code).not.toBe(0);
    expect(rejectedWithoutRule.stderr).toContain("Hard criteria with no rule");
    expect(rejectedWithoutRule.stderr).toContain("K1");

    await record(fixture, [
      "--kind",
      "rule",
      "--criterion",
      "K1",
      "--text",
      "사용자가 재현 가능이라고 판정한 조건을 만족해야 한다",
    ]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
