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

test("코드와 모순되는 답은 실재 파일 인용과 다음 질문이 있을 때 challenge 로 남는다", async () => {
  await withInterviewFixture("ip-6c-positive", async (fixture) => {
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
      "현재 코드는 재시도를 하지 않는데 답변은 재시도 후 실패라고 했다",
      "--question",
      "Q1",
    ]);

    const challenge = (await ledger(fixture)).find((entry) => entry.kind === "challenge");

    expect(challenge).toMatchObject({
      id: "C1",
      answer: "A1",
      citation: "auth.ts:1",
      question: "Q1",
    });
  });

  await withInterviewFixture("ip-6c-no-question", async (fixture) => {
    await Bun.write(join(fixture.projectDir, "auth.ts"), "export const retries = 0;\n");
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
      "--citation",
      "auth.ts:1",
      "--text",
      "인용만 있고 다음 질문이 없다",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("--question requires a value");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });

  await withInterviewFixture("ip-6c-missing-path", async (fixture) => {
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
      "--citation",
      "missing.ts:1",
      "--text",
      "없는 파일은 코드 근거가 아니다",
      "--question",
      "Q1",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("--citation path does not exist");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });
});
