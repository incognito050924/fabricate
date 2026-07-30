import { expect, test } from "bun:test";
import { join } from "node:path";
import {
  addCompleteInterview,
  createSlashSession,
  fabricate,
  ledger,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("challenge 는 citation 없이는 거부되고 citation 이 있으면 장부에 남는다", async () => {
  await withInterviewFixture("ip-6d-negative", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    const before = await ledger(fixture);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "challenge",
      "--id",
      "C1",
      "--answer",
      "A1",
      "--text",
      "근거 인용이 없는 도전",
      "--question",
      "Q1",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("--citation requires a value");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });

  await withInterviewFixture("ip-6d-positive", async (fixture) => {
    await Bun.write(join(fixture.projectDir, "auth.ts"), "export const retries = 0;\n");
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);

    await record(fixture, [
      "--kind",
      "challenge",
      "--id",
      "C1",
      "--answer",
      "A1",
      "--citation",
      "auth.ts:1",
      "--text",
      "현재 코드 근거와 답변이 어긋난다",
      "--question",
      "Q1",
    ]);

    const challenge = (await ledger(fixture)).find((entry) => entry.kind === "challenge");

    expect(challenge).toMatchObject({ id: "C1", citation: "auth.ts:1" });
  });
});
