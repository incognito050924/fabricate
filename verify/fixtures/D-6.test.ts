import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCriterion,
  close,
  createSlashSession,
  fabricate,
  goalHash,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

const GOAL_TEXT = "사내망 로그인 실패의 재현 조건이 확인되어야 한다";

const reviewerText = async (): Promise<string> =>
  await readFile(join(repoRoot, "agents", "blind-reviewer.md"), "utf8");

// INTERVIEW-DEFECTS.md D-6, the measurement: 14 questions went out, 13 of them
// carried a coined word, and all 14 came back `pass` with not one reason
// mentioning vocabulary. Vocabulary was hung underneath "can this be answered",
// and a long self-explaining question answers itself no matter what words it
// rides on. So it gets its own pass and its own fail.
test("검토자 지시문에서 어휘가 답변 가능성의 하위가 아니라 독립 기준이다", async () => {
  const reviewer = await reviewerText();

  expect(reviewer.includes("Two gates")).toBe(true);
  expect(reviewer.includes("Gate B — can it be understood")).toBe(true);
  expect(reviewer.includes("Failing either gate is a `reject`")).toBe(true);
});

// The third disease the defect list names: a word that is plain, has no rival
// name, and simply does not mean what it was used for ("검문소" for the place a
// subagent judges). No list catches that — only reading the sentence does.
test("검토자가 문장이 무슨 말인지 아는가까지 본다", async () => {
  const reviewer = await reviewerText();

  expect(reviewer.includes("gate")).toBe(true);
  expect(reviewer.includes("does not mean")).toBe(true);
});

// Widening: the goal predicate is what gets locked and handed to the next
// session, so it is the one surface where "a reader who was not here can
// understand this" is the whole promise (IP-3).
test("목표 술어 문안도 대화를 못 본 검토를 거쳐야 기록된다", async () => {
  await withInterviewFixture("d-6-goal-unreviewed", async (fixture) => {
    await interviewUpToGoal(fixture);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "goal",
      "--text",
      GOAL_TEXT,
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("blind review");
  });
});

test("검토가 거부한 목표 술어 문안은 기록되지 않는다", async () => {
  await withInterviewFixture("d-6-goal-rejected", async (fixture) => {
    await interviewUpToGoal(fixture);
    await record(fixture, [
      "--kind",
      "goal-review",
      "--text",
      GOAL_TEXT,
      "--verdict",
      "reject",
      "--reviewer",
      "blind-reviewer",
      "--reason",
      "무엇을 사내망이라고 부르는지 문안 안에 없다",
    ]);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "goal",
      "--text",
      GOAL_TEXT,
    ]);

    expect(rejected.code).not.toBe(0);
  });
});

test("검토받은 문안과 한 글자라도 다르면 기록되지 않는다", async () => {
  await withInterviewFixture("d-6-goal-drift", async (fixture) => {
    await interviewUpToGoal(fixture);
    await record(fixture, [
      "--kind",
      "goal-review",
      "--text",
      GOAL_TEXT,
      "--verdict",
      "pass",
      "--reviewer",
      "blind-reviewer",
      "--reason",
      "문안만으로 무엇이 달성돼야 하는지 알 수 있다",
    ]);

    const drifted = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "goal",
      "--text",
      `${GOAL_TEXT}.`,
    ]);

    expect(drifted.code).not.toBe(0);
  });
});

test("진행자 자신은 목표 술어 검토자가 될 수 없다", async () => {
  await withInterviewFixture("d-6-goal-self-review", async (fixture) => {
    await interviewUpToGoal(fixture);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "goal-review",
      "--text",
      GOAL_TEXT,
      "--verdict",
      "pass",
      "--reviewer",
      "driver",
      "--reason",
      "내가 봐도 괜찮다",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("driver");
  });
});

test("검토를 통과한 문안은 그대로 기록되고 인터뷰가 닫힌다", async () => {
  await withInterviewFixture("d-6-goal-passed", async (fixture) => {
    await interviewUpToGoal(fixture);
    await record(fixture, [
      "--kind",
      "goal-review",
      "--text",
      GOAL_TEXT,
      "--verdict",
      "pass",
      "--reviewer",
      "blind-reviewer",
      "--reason",
      "문안만으로 무엇이 달성돼야 하는지 알 수 있다",
    ]);
    await record(fixture, ["--kind", "goal", "--text", GOAL_TEXT]);

    expect((await close(fixture, goalHash(fixture))).code).toBe(0);
  });
});

test("스킬 설명서가 목표 술어도 검토받으라고 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("--kind goal-review")).toBe(true);
  expect(skill.includes("blind-reviewer")).toBe(true);
});

const interviewUpToGoal = async (
  fixture: Parameters<typeof createSlashSession>[0],
): Promise<void> => {
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
  await record(fixture, [
    "--kind",
    "restate",
    "--id",
    "R1",
    "--answer",
    "A1",
    "--text",
    "사내망 접속 시 첫 인증만 튕긴다는 뜻으로 읽었습니다",
  ]);
  await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", "accepted"]);
  await record(fixture, [
    "--kind",
    "resolve",
    "--dimension",
    "D1",
    "--evidence",
    "재현 조건 확인",
    "--answer",
    "A1",
  ]);
  await record(fixture, ["--kind", "contradiction-pass", "--text", "교차 답변 검사 완료"]);
  await addCriterion(fixture);
};
