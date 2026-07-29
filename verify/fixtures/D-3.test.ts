import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createSlashSession,
  fabricate,
  ledger,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

type Fixture = Parameters<typeof fabricate>[0] & Parameters<typeof record>[0];

const openQuestion = async (fixture: Fixture): Promise<void> => {
  await Bun.write(join(fixture.projectDir, "auth.ts"), "export const retries = 3;\n");
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
    "재시도 기능을 만들까요?",
  ]);
};

test("답변이 없어도 질문의 전제를 코드로 칠 수 있다", async () => {
  await withInterviewFixture("d-3-question-premise", async (fixture) => {
    await openQuestion(fixture);

    // "만들까요" assumes it does not exist yet. auth.ts:1 says it does. Before this
    // the only way to record that was to attach it to an answer, so a question
    // built on a false premise went to the user unchallenged.
    const accepted = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "challenge",
      "--id",
      "C1",
      "--citation",
      "auth.ts:1",
      "--text",
      "질문은 재시도가 없다고 전제하는데 auth.ts:1 은 이미 3회 재시도한다",
      "--question",
      "Q1",
    ]);

    expect(accepted.code).toBe(0);

    const challenge = (await ledger(fixture)).find((entry) => entry.kind === "challenge");
    expect(challenge).toMatchObject({ id: "C1", question: "Q1", citation: "auth.ts:1" });
    expect(challenge?.answer).toBeUndefined();
  });
});

test("전제를 치려면 여전히 실재하는 파일과 줄을 대야 한다", async () => {
  await withInterviewFixture("d-3-citation-required", async (fixture) => {
    await openQuestion(fixture);
    const before = await ledger(fixture);

    const noCitation = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "challenge",
      "--id",
      "C1",
      "--text",
      "그 질문은 전제가 틀린 것 같다",
      "--question",
      "Q1",
    ]);

    expect(noCitation.code).not.toBe(0);
    expect(noCitation.stderr).toContain("--citation 값이 필요합니다");

    const fakeCitation = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "challenge",
      "--id",
      "C1",
      "--citation",
      "없는파일.ts:1",
      "--text",
      "그 질문은 전제가 틀렸다",
      "--question",
      "Q1",
    ]);

    expect(fakeCitation.code).not.toBe(0);
    expect(fakeCitation.stderr).toContain("실재하지 않습니다");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });
});

test("질문을 보내기 전 전제를 코드에 대보라고 스킬 설명서가 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("질문의 전제")).toBe(true);
  expect(skill.includes("--kind challenge")).toBe(true);
});
