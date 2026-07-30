import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCriterion,
  close,
  createSlashSession,
  fabricate,
  goalHash,
  intentFiles,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

// INTERVIEW-DEFECTS.md D-5: the goal predicate is written fresh by the driver,
// and nothing checked it against what the user actually said. In the session that
// found this, the predicate was rewritten four times and every rewrite was the
// user putting back something they had already told the driver. Their decisions
// arrived as `remark`, and `remark` was outside every coverage check there was.
test("목표 술어가 안 다룬 remark 가 남으면 닫기가 거부한다", async () => {
  await withInterviewFixture("d-5-remark-uncovered", async (fixture) => {
    await interviewWithTwoRemarks(fixture);
    await record(fixture, [
      "--kind",
      "goal",
      "--text",
      "재현 조건이 확인되어야 한다",
      "--covers",
      "M1",
    ]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("M2");
    expect(rejected.stderr).not.toContain("M1");
    expect(await intentFiles(fixture)).toEqual([]);
  });
});

// Not every remark belongs in the goal predicate. The session that found D-5 had
// the user correcting a word ("call it a handoff, not a note") and asking why a
// question was being asked at all. Forcing those into the predicate would be its
// own distortion, so the way out is saying why — not silence.
test("목표에 안 들어가는 remark 는 이유를 적으면 닫힌다", async () => {
  await withInterviewFixture("d-5-remark-set-aside", async (fixture) => {
    await interviewWithTwoRemarks(fixture);
    await record(fixture, [
      "--kind",
      "goal",
      "--text",
      "재현 조건이 확인되어야 한다",
      "--covers",
      "M1",
    ]);
    await record(fixture, [
      "--kind",
      "set-aside",
      "--remark",
      "M2",
      "--reason",
      "부르는 이름을 고친 것이라 완료 조건이 아니다",
    ]);

    const accepted = await close(fixture, goalHash(fixture));

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});

// Silence is the failure mode being fixed, so a set-aside with no reason is the
// same silence with a record around it.
test("이유 없는 set-aside 는 거부된다", async () => {
  await withInterviewFixture("d-5-set-aside-no-reason", async (fixture) => {
    await interviewWithTwoRemarks(fixture);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "set-aside",
      "--remark",
      "M2",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("--reason");
  });
});

// The user caught all four omissions in the session that found this. The block is
// where they get the chance without reading the ledger.
test("목표 술어를 쓴 뒤 안 걸린 remark 가 상태에 보인다", async () => {
  await withInterviewFixture("d-5-remark-visible", async (fixture) => {
    await interviewWithTwoRemarks(fixture);

    // Before a goal predicate exists there is nothing to be uncovered against,
    // and the block already says the predicate is missing.
    const early = await fabricate(fixture, ["deep-interview", "status"]);
    expect(early.stdout).not.toContain("M2");

    await record(fixture, [
      "--kind",
      "goal",
      "--text",
      "재현 조건이 확인되어야 한다",
      "--covers",
      "M1",
    ]);

    const status = await fabricate(fixture, ["deep-interview", "status"]);
    expect(status.stdout).toContain("M2");
    expect(status.stdout).not.toContain("M1 ");
  });
});

test("스킬 설명서가 remark 를 목표 술어에 대보라고 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("--covers")).toBe(true);
  expect(skill.includes("--kind set-aside")).toBe(true);
});

const interviewWithTwoRemarks = async (
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

  // M1 is a decision that has to survive into the predicate. M2 is the user
  // renaming something — real, recorded, and not a completion condition.
  await record(fixture, [
    "--kind",
    "remark",
    "--id",
    "M1",
    "--text",
    "재현은 사내망에서만 재봐. 외부망은 이번 범위가 아니야",
  ]);
  await record(fixture, [
    "--kind",
    "remark",
    "--id",
    "M2",
    "--text",
    "사내망이라고 하지 말고 그냥 내부망이라고 해",
  ]);

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
