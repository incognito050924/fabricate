import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type InterviewFixture,
  addCriterion,
  close,
  createSlashSession,
  expectOk,
  fabricate,
  goalHash,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("goal-hash 는 사용자에게 보여준 목표 문안에 묶이고 문안이 바뀌면 옛 해시로 닫히지 않는다", async () => {
  await withInterviewFixture("ip-1f-positive", async (fixture) => {
    await createSlashSession(fixture);
    await addReadyInterviewExceptGoal(fixture);
    const firstHash = await recordGoalAndExpectHash(
      fixture,
      "로그인 실패의 재현 조건이 확인되어야 한다",
    );

    const accepted = await close(fixture, firstHash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);

    const intent = await readIntent(fixture);
    expect(intent.goals).toEqual({
      texts: ["로그인 실패의 재현 조건이 확인되어야 한다"],
      goal_hash: firstHash,
    });
  });

  await withInterviewFixture("ip-1f-wrong-hash", async (fixture) => {
    await createSlashSession(fixture);
    await addReadyInterviewExceptGoal(fixture);
    await recordGoalAndExpectHash(fixture, "로그인 실패의 재현 조건이 확인되어야 한다");

    const rejected = await close(fixture, "not-the-shown-goal-hash");

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("goal-hash mismatch");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-1f-stale-hash", async (fixture) => {
    await createSlashSession(fixture);
    await addReadyInterviewExceptGoal(fixture);
    const oldHash = await recordGoalAndExpectHash(
      fixture,
      "로그인 실패의 재현 조건이 확인되어야 한다",
    );
    const newHash = await recordGoalAndExpectHash(
      fixture,
      "로그인 실패의 재현 조건과 영향 범위가 확인되어야 한다",
    );

    const rejected = await close(fixture, oldHash);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("goal-hash mismatch");
    expect(await intentFiles(fixture)).toEqual([]);

    const accepted = await close(fixture, newHash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});

const addReadyInterviewExceptGoal = async (fixture: InterviewFixture): Promise<void> => {
  await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
  await record(fixture, ["--kind", "fragment", "--id", "F2", "--text", "재현 조건"]);
  await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
  await record(fixture, [
    "--kind",
    "question",
    "--id",
    "Q1",
    "--dimension",
    "D1",
    "--covers",
    "F1,F2",
    "--text",
    "언제 로그인 실패가 재현되나요?",
  ]);
  await record(fixture, [
    "--kind",
    "answer",
    "--id",
    "A1",
    "--question",
    "Q1",
    "--text",
    "사내망에서 월요일 오전 로그인 실패가 반복됩니다",
  ]);
  await record(fixture, [
    "--kind",
    "restate",
    "--id",
    "R1",
    "--answer",
    "A1",
    "--text",
    "월요일 오전 사내망 조건에서 인증 실패가 반복되는 사례로 보겠습니다",
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

const recordGoalAndExpectHash = async (
  fixture: InterviewFixture,
  text: string,
): Promise<string> => {
  const expected = goalHash({ goals: [...fixture.goals, text] });
  // The goal wording goes past the blind reader first (D-6).
  await expectOk(
    await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "goal-review",
      "--text",
      text,
      "--verdict",
      "pass",
      "--reviewer",
      "blind-reviewer",
      "--reason",
      "문안만으로 무엇이 달성돼야 하는지 알 수 있습니다",
    ]),
    "turn record goal-review",
  );
  const result = await fabricate(fixture, ["turn", "record", "--kind", "goal", "--text", text]);

  await expectOk(result, "turn record goal");
  // The per-turn status block follows the hash line on the same stream (goal 3).
  expect(result.stdout.startsWith(`goal-hash: ${expected}\n`)).toBe(true);
  fixture.goals.push(text);
  return expected;
};

const readIntent = async (fixture: InterviewFixture): Promise<Record<string, unknown>> => {
  const text = await readFile(
    join(fixture.projectDir, ".fabricate", "intent", `${fixture.sessionId}.json`),
    "utf8",
  );
  const parsed = JSON.parse(text) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("intent 레코드가 JSON 객체가 아닙니다.");
  }

  return parsed as Record<string, unknown>;
};
