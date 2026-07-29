import { expect, test } from "bun:test";
import {
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("답변은 non-echo restate 뒤 accepted 확인에 닿아야 confirmed 가 된다", async () => {
  await withInterviewFixture("ip-2e-no-confirm", async (fixture) => {
    await createConfirmedShape(fixture, "none");

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("미교정 불일치");
    expect(rejected.stderr).toContain("A1");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2e-rejected", async (fixture) => {
    await createConfirmedShape(fixture, "rejected");

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("미교정 불일치");
    expect(rejected.stderr).toContain("A1");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2e-accepted", async (fixture) => {
    await createConfirmedShape(fixture, "accepted");

    const accepted = await close(fixture);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});

const createConfirmedShape = async (
  fixture: Parameters<typeof createSlashSession>[0],
  verdict: "none" | "rejected" | "accepted",
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
    "월요일 오전 사내망에서 로그인 실패가 반복됩니다",
  ]);
  await record(fixture, [
    "--kind",
    "restate",
    "--id",
    "R1",
    "--answer",
    "A1",
    "--text",
    "월요일 오전 사내망 조건에서 인증 실패가 반복되는 사례입니다",
  ]);
  if (verdict !== "none") {
    await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", verdict]);
  }
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
