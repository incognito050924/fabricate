import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createSlashSession,
  fabricate,
  record,
  repoRoot,
  stopHook,
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

test("앞선 턴에 열린 것은 다시 안 나온다 — diff만 보인다", async () => {
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

    // The turn ends. Stop is what marks the boundary, so the next turn's diff
    // starts from here.
    await stopHook({ fixture, promptId: "prompt-1" });

    // A later turn must not repeat D1 — it did not change in that turn.
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

// The block the user sees is the one from the turn's *last* record. Diffing that
// record against the one before it drops everything the earlier records in the
// same turn changed — and a real turn writes answer, restate and resolve back to
// back. The turn, not the record, is the unit.
test("한 턴에 기록이 여럿이면 마지막 블록이 그 턴 전체를 담는다", async () => {
  await withInterviewFixture("d-2-turn-scope", async (fixture) => {
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
      "언제 실패하나요?",
    ]);
    await stopHook({ fixture, promptId: "prompt-1" });

    // One turn, two records. A1 lands first and R1 lands last.
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A1",
      "--question",
      "Q1",
      "--text",
      "월요일 오전 사내망에서 반복됩니다",
    ]);
    const last = await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R1",
      "--answer",
      "A1",
      "--text",
      "사내망 접속 시 첫 인증만 튕긴다는 뜻으로 읽었습니다",
    ]);

    expect(section(last.stdout, "opened this turn")).toContain("A1");
    expect(section(last.stdout, "reading updated this turn")).toContain("A1");
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

  expect(skill.includes("above your own prose")).toBe(true);
  expect(skill.includes("fabricate deep-interview status")).toBe(true);
});
