import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("중대성 라우팅은 assume, ask, must-ask 의 산출물 차이와 위험 신호를 구분한다", async () => {
  await withInterviewFixture("ip-6a-same-outcome", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "ambiguity", "--id", "M1", "--text", "로그인 실패 범위"]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I1",
      "--ambiguity",
      "M1",
      "--text",
      "사내망 로그인만 본다",
      "--outcome",
      "인증 로그를 확인한다",
    ]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I2",
      "--ambiguity",
      "M1",
      "--text",
      "외부망 로그인도 포함한다",
      "--outcome",
      "인증 로그를 확인한다",
    ]);

    const rejectedAsk = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "ask",
      "--question",
      "Q1",
    ]);

    expect(rejectedAsk.code).not.toBe(0);
    expect(rejectedAsk.stderr).toContain("outcome 이 둘 이상");

    await record(fixture, [
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "assume",
      "--assumption",
      "인증 로그 확인으로 산출물이 같으므로 사내망부터 본다",
    ]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });

  await withInterviewFixture("ip-6a-different-outcome", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "ambiguity", "--id", "M1", "--text", "영향 범위"]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I1",
      "--ambiguity",
      "M1",
      "--text",
      "사내망만 영향받는다",
      "--outcome",
      "사내망 프록시 로그를 본다",
    ]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I2",
      "--ambiguity",
      "M1",
      "--text",
      "모든 사용자가 영향받는다",
      "--outcome",
      "인증 서비스 전역 로그를 본다",
    ]);

    const rejectedAssume = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "assume",
      "--assumption",
      "사내망부터 본다",
    ]);

    expect(rejectedAssume.code).not.toBe(0);
    expect(rejectedAssume.stderr).toContain("outcome 이 같아야");

    await record(fixture, [
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "ask",
      "--question",
      "Q1",
    ]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
  });

  await withInterviewFixture("ip-6a-must-ask", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "ambiguity", "--id", "M1", "--text", "계정 잠금 여부"]);

    const rejectedWithoutRisk = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "must-ask",
      "--question",
      "Q1",
    ]);

    expect(rejectedWithoutRisk.code).not.toBe(0);
    expect(rejectedWithoutRisk.stderr).toContain("--risk 값이 필요합니다");

    await record(fixture, [
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "must-ask",
      "--risk",
      "계정 잠금은 운영 사용자에게 되돌리기 어려운 영향을 준다",
      "--question",
      "Q1",
    ]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
  });

  await withInterviewFixture("ip-6a-missing-materiality", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "ambiguity", "--id", "M1", "--text", "로그 보존 기간"]);

    const rejected = await close(fixture, hash);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("중대성 라우팅 없음");
    expect(rejected.stderr).toContain("M1");
    expect(await intentFiles(fixture)).toEqual([]);
  });
});
