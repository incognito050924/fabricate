import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createSlashSession,
  fabricate,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

const reviewed = async (
  fixture: Parameters<typeof fabricate>[0],
  id: string,
  text: string,
): Promise<void> => {
  await fabricate(fixture, [
    "turn",
    "record",
    "--kind",
    "review",
    "--question",
    id,
    "--text",
    text,
    "--verdict",
    "pass",
    "--reviewer",
    "blind-reviewer",
    "--reason",
    "대화를 못 본 사람도 답할 수 있는 질문입니다",
  ]);
};

test("추천 답변이 없는 질문은 장부에 남지 않는다", async () => {
  await withInterviewFixture("g-0-no-recommend", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    await reviewed(fixture, "Q1", "언제 로그인 실패가 재현되나요?");

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--text",
      "언제 로그인 실패가 재현되나요?",
      "--because",
      "src/auth.ts 를 읽어 보면 월요일 배치가 세션을 지웁니다",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("--recommend");
  });
});

test("추천의 근거가 없는 질문은 장부에 남지 않는다", async () => {
  await withInterviewFixture("g-0-no-because", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    await reviewed(fixture, "Q1", "언제 로그인 실패가 재현되나요?");

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--text",
      "언제 로그인 실패가 재현되나요?",
      "--recommend",
      "(가) 월요일 오전에만 재현된다",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("--because");
  });
});

test("추천 답변과 근거를 붙인 질문만 장부에 남고, 둘 다 원문 그대로 남는다", async () => {
  await withInterviewFixture("g-0-accept", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    await reviewed(fixture, "Q1", "언제 로그인 실패가 재현되나요?");

    const accepted = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--text",
      "언제 로그인 실패가 재현되나요?",
      "--recommend",
      "(가) 월요일 오전에만 재현된다",
      "--because",
      "src/auth.ts 를 읽어 보면 월요일 배치가 세션을 지웁니다",
    ]);

    expect(accepted.code).toBe(0);

    const entries = (
      await readFile(
        join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "ledger.jsonl"),
        "utf8",
      )
    )
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const question = entries.find((entry) => entry.kind === "question");

    expect(question).toMatchObject({
      id: "Q1",
      recommend: "(가) 월요일 오전에만 재현된다",
      because: "src/auth.ts 를 읽어 보면 월요일 배치가 세션을 지웁니다",
    });
  });
});

test("혼자 답할 수 있는 질문도 건너뛰지 말라고 스킬 설명서가 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("--recommend")).toBe(true);
  expect(skill.includes("--because")).toBe(true);
  expect(skill.includes("혼자 답할 수 있는 질문도 건너뛰지 않는다")).toBe(true);
});
