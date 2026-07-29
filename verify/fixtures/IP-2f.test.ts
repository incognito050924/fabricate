import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("모순 패스는 마지막 답 뒤에 돌아야 하고, 찾은 모순은 해소되어야 한다", async () => {
  await withInterviewFixture("ip-2f-no-pass", async (fixture) => {
    await createWithoutPass(fixture);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("모순 패스가 실행되지 않았습니다");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2f-unresolved-contradiction", async (fixture) => {
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
      "실패 시간이 서로 다릅니다",
    ]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("미해소 모순");
    expect(rejected.stderr).toContain("C1");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2f-stale-pass", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A2",
      "--question",
      "Q1",
      "--text",
      "화요일 오후에도 같은 실패가 있었습니다",
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      "R2",
      "--answer",
      "A2",
      "--text",
      "화요일 오후 조건에서도 같은 인증 실패 사례가 있었다고 보겠습니다",
    ]);
    await record(fixture, ["--kind", "confirm", "--restate", "R2", "--verdict", "accepted"]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D1",
      "--evidence",
      "추가 답변 확인",
      "--answer",
      "A2",
    ]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("모순 패스가 마지막 답변보다 앞");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2f-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "contradiction",
      "--id",
      "C1",
      "--between",
      "A1",
      "--text",
      "실패 시간이 서로 다릅니다",
    ]);
    await record(fixture, [
      "--kind",
      "contradiction-resolved",
      "--contradiction",
      "C1",
      "--text",
      "같은 시간대 표현으로 정리했습니다",
    ]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});

const createWithoutPass = async (
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
  await record(fixture, ["--kind", "goal", "--text", "로그인 실패 조건이 확인되어야 한다"]);
};
