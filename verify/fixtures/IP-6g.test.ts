import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("hard criterion 의 예시 요구는 다른 증거로 면제되지 않고 example 과 rule 로만 닫힌다", async () => {
  await withInterviewFixture("ip-6g-no-waiver", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "criterion",
      "--id",
      "K1",
      "--text",
      "재현 가능 판정",
      "--type",
      "hard",
    ]);
    await record(fixture, ["--kind", "goal", "--text", "추가 증거가 있어도 예시는 필요하다"]);
    await record(fixture, [
      "--kind",
      "contradiction",
      "--id",
      "C1",
      "--between",
      "A1",
      "--text",
      "로그 시간 표현이 서로 다르다",
    ]);
    await record(fixture, [
      "--kind",
      "contradiction-resolved",
      "--contradiction",
      "C1",
      "--text",
      "같은 시간대 표현으로 정리했다",
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A2",
      "--question",
      "Q1",
      "--text",
      "화요일 오후에도 같은 실패가 있었다",
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
    await record(fixture, ["--kind", "contradiction-pass", "--text", "추가 답변 뒤 검사"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("Hard criteria with no example");
    expect(rejected.stderr).toContain("K1");
    expect(await intentFiles(fixture)).toEqual([]);

    await record(fixture, [
      "--kind",
      "example",
      "--id",
      "E1",
      "--criterion",
      "K1",
      "--text",
      "월요일 오전 사내망에서 3회 재현",
      "--verdict",
      "재현 가능",
    ]);
    await record(fixture, [
      "--kind",
      "rule",
      "--criterion",
      "K1",
      "--text",
      "사용자가 재현 가능이라고 판정한 조건을 만족해야 한다",
    ]);

    const accepted = await close(fixture);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});
