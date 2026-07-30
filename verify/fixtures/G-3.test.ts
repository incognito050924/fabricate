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

test("아무것도 요청하지 않아도 기록마다 지금까지의 상태가 따라 나온다", async () => {
  await withInterviewFixture("g-3-unrequested", async (fixture) => {
    await createSlashSession(fixture);

    const first = await record(fixture, [
      "--kind",
      "dimension",
      "--id",
      "D1",
      "--text",
      "실패 조건",
    ]);

    expect(first.stdout).toContain("이번 턴에 확정된 것");
    expect(first.stdout).toContain("이번 턴에 새로 열린 것");
    expect(first.stdout).toContain("이번 턴에 갱신된 뜻");
  });
});

// D-2: the block only carries what changed this turn — the full, cumulative
// picture lives behind `deep-interview status` (see D-2.test.ts).
test("상태는 세 칸이 각각 실제 장부를 읽는다 — 이번 턴에 바뀐 것만, 안 바뀐 것은 안 나온다", async () => {
  await withInterviewFixture("g-3-sections", async (fixture) => {
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

    const openState = await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A1",
      "--question",
      "Q1",
      "--text",
      "월요일 오전 사내망에서 반복됩니다",
    ]);

    // A1 is new this turn. D1 opened turns ago and did not change — it must
    // not repeat here even though it is still unresolved.
    expect(section(openState.stdout, "이번 턴에 새로 열린 것")).toContain("A1");
    expect(section(openState.stdout, "이번 턴에 새로 열린 것")).not.toContain("D1");
    expect(section(openState.stdout, "이번 턴에 확정된 것")).not.toContain("D1");

    const restated = await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R1",
      "--answer",
      "A1",
      "--text",
      "사내망 접속 시 월요일 첫 인증만 튕긴다는 뜻으로 읽었습니다",
    ]);

    // The driver's own reading of the user's intent is its own section — it
    // shows up on the turn that wrote it, not on a later, unrelated turn.
    expect(section(restated.stdout, "이번 턴에 갱신된 뜻")).toContain(
      "사내망 접속 시 월요일 첫 인증만 튕긴다",
    );

    const interpreted = await record(fixture, [
      "--kind",
      "confirm",
      "--restate",
      "R1",
      "--verdict",
      "accepted",
    ]);

    expect(section(interpreted.stdout, "이번 턴에 확정된 것")).toContain("A1");

    const resolved = await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D1",
      "--evidence",
      "재현 조건 확인",
      "--answer",
      "A1",
    ]);

    expect(section(resolved.stdout, "이번 턴에 확정된 것")).toContain("D1");
    expect(section(resolved.stdout, "이번 턴에 새로 열린 것")).not.toContain("D1");
  });
});

test("goal 기록의 goal-hash 는 상태 블록에 밀려나지 않는다", async () => {
  await withInterviewFixture("g-3-goal-hash", async (fixture) => {
    await createSlashSession(fixture);

    const goal = await record(fixture, ["--kind", "goal", "--text", "재현 조건이 확인되어야 한다"]);

    expect(goal.stdout.startsWith("goal-hash: ")).toBe(true);
  });
});

test("활성 인터뷰가 아니면 상태 블록도 없다", async () => {
  await withInterviewFixture("g-3-no-session", async (fixture) => {
    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "dimension",
      "--id",
      "D1",
      "--text",
      "실패 조건",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stdout).toBe("");
  });
});

test("매 턴 끝에 그 블록을 사용자에게 보이라고 스킬 설명서가 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("매 턴 끝에")).toBe(true);
  expect(skill.includes("지금 이해하고 있는 뜻")).toBe(true);
});

// Section headers sit at column 0; their items are indented.
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
