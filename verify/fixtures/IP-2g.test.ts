import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("준비도는 unresolved contradiction, unsure, demoted 수치를 장부에서 읽는다", async () => {
  await withInterviewFixture("ip-2g-unsure", async (fixture) => {
    await createReadyShape(fixture, "unsure");

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("unresolved-contradictions=0");
    expect(rejected.stderr).toContain("unsure-answers=1");
    expect(rejected.stderr).toContain("closed-without-evidence=0");
  });

  await withInterviewFixture("ip-2g-demoted", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "resolve", "--dimension", "D1"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("unresolved-contradictions=0");
    expect(rejected.stderr).toContain("unsure-answers=0");
    expect(rejected.stderr).toContain("closed-without-evidence=1");
  });

  await withInterviewFixture("ip-2g-contradiction", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "contradiction",
      "--id",
      "C1",
      "--between",
      "A1",
      "--text",
      "답변 사이 충돌",
    ]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("unresolved-contradictions=1");
    expect(rejected.stderr).toContain("unsure-answers=0");
    expect(rejected.stderr).toContain("closed-without-evidence=0");
  });

  await withInterviewFixture("ip-2g-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(accepted.stdout).toContain("unresolved-contradictions=0");
    expect(accepted.stdout).toContain("unsure-answers=0");
    expect(accepted.stdout).toContain("closed-without-evidence=0");
    expect(accepted.stdout).toContain("ready-to-close=true");
  });
});

const createReadyShape = async (
  fixture: Parameters<typeof createSlashSession>[0],
  answerMode: "unsure",
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
    "--unsure",
    "--text",
    answerMode === "unsure" ? "잘 모르겠지만 월요일 오전 같습니다" : "월요일 오전입니다",
  ]);
  await record(fixture, [
    "--kind",
    "restate",
    "--id",
    "R1",
    "--answer",
    "A1",
    "--text",
    "월요일 오전으로 추정하지만 확신이 낮은 사례로 두겠습니다",
  ]);
  await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", "accepted"]);
  await record(fixture, [
    "--kind",
    "resolve",
    "--dimension",
    "D1",
    "--evidence",
    "답변 확인",
    "--answer",
    "A1",
  ]);
  await record(fixture, ["--kind", "contradiction-pass", "--text", "검사 완료"]);
  await record(fixture, ["--kind", "goal", "--text", "로그인 실패 조건이 확인되어야 한다"]);
};
