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

// Section headers sit at column 0; their items are indented. Same parsing rule as G-3.
const section = (stdout: string, title: string): string => {
  const lines = stdout.split("\n");
  const start = lines.findIndex((line) => line === title);

  if (start === -1) {
    throw new Error(`상태 블록에 "${title}" 칸이 없습니다:\n${stdout}`);
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.length > 0 && !line.startsWith(" "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
};

test("매 기록마다 요약줄이 맨 앞에 온다 — 확정·미정 개수", async () => {
  await withInterviewFixture("d-2-summary-line", async (fixture) => {
    await createSlashSession(fixture);

    const first = await record(fixture, [
      "--kind",
      "dimension",
      "--id",
      "D1",
      "--text",
      "실패 조건",
    ]);

    // "미정" also counts the still-missing criteria/goal lines that `open()`
    // always reports until they're written — D1 plus those two.
    const summaryLine = first.stdout.split("\n")[0];
    expect(summaryLine).toContain("settled 0");
    expect(summaryLine).toContain("open 3");
  });
});

test("이번 턴에 안 바뀐 것은 다시 안 나온다 — diff만 보인다", async () => {
  await withInterviewFixture("d-2-diff-only", async (fixture) => {
    await createSlashSession(fixture);

    // D1 opens here — this turn's diff should mention it.
    const dimensionTurn = await record(fixture, [
      "--kind",
      "dimension",
      "--id",
      "D1",
      "--text",
      "실패 조건",
    ]);
    expect(section(dimensionTurn.stdout, "opened this turn")).toContain("D1");

    // A later, unrelated turn must not repeat D1 — it did not change this turn.
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    const questionTurn = await record(fixture, [
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--covers",
      "F1",
      "--text",
      "언제 실패하나요?",
    ]);

    expect(questionTurn.stdout).not.toContain("D1");
  });
});

test("전체 보기 명령은 지금까지 쌓인 상태를 전부 낸다", async () => {
  await withInterviewFixture("d-2-full-view", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
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
      "언제 실패하나요?",
    ]);

    const full = await fabricate(fixture, ["deep-interview", "status"]);

    expect(full.code).toBe(0);
    // Cumulative — D1 was opened turns ago, and still shows up here.
    expect(section(full.stdout, "still open")).toContain("D1");
  });
});

test("활성 인터뷰가 아니면 전체 보기 명령도 거부한다", async () => {
  await withInterviewFixture("d-2-full-view-no-session", async (fixture) => {
    const rejected = await fabricate(fixture, ["deep-interview", "status"]);

    expect(rejected.code).not.toBe(0);
  });
});

test("상태 블록을 배경설명·질문보다 앞에 두라고 스킬 설명서가 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("배경설명보다 앞에 둔다")).toBe(true);
  expect(skill.includes("fabricate deep-interview status")).toBe(true);
});
