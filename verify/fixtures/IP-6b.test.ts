import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  ledger,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("assume route 는 서로 다른 해석 둘 이상이 있을 때만 장부에 남는다", async () => {
  await withInterviewFixture("ip-6b-one-interpretation", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "ambiguity", "--id", "M1", "--text", "실패 사용자 범위"]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I1",
      "--ambiguity",
      "M1",
      "--text",
      "사내 사용자만 본다",
      "--outcome",
      "인증 로그를 본다",
    ]);
    const before = await ledger(fixture);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "assume",
      "--assumption",
      "하나뿐인 해석으로 가정한다",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("two or more distinct interpretations");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });

  await withInterviewFixture("ip-6b-same-text", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "ambiguity", "--id", "M1", "--text", "실패 사용자 범위"]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I1",
      "--ambiguity",
      "M1",
      "--text",
      "사내 사용자만 본다",
      "--outcome",
      "인증 로그를 본다",
    ]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I2",
      "--ambiguity",
      "M1",
      "--text",
      "사내 사용자만 본다",
      "--outcome",
      "인증 로그를 본다",
    ]);
    const before = await ledger(fixture);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "assume",
      "--assumption",
      "같은 해석 둘로 가정한다",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("two or more distinct interpretations");
    expect(await ledger(fixture)).toHaveLength(before.length);
  });

  await withInterviewFixture("ip-6b-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "ambiguity", "--id", "M1", "--text", "실패 사용자 범위"]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I1",
      "--ambiguity",
      "M1",
      "--text",
      "사내 사용자만 본다",
      "--outcome",
      "인증 로그를 본다",
    ]);
    await record(fixture, [
      "--kind",
      "interpretation",
      "--id",
      "I2",
      "--ambiguity",
      "M1",
      "--text",
      "외부 사용자도 본다",
      "--outcome",
      "인증 로그를 본다",
    ]);

    await record(fixture, [
      "--kind",
      "materiality",
      "--ambiguity",
      "M1",
      "--route",
      "assume",
      "--assumption",
      "산출물이 같으므로 인증 로그부터 확인한다",
    ]);

    const materialityEntries = (await ledger(fixture)).filter(
      (entry) => entry.kind === "materiality",
    );
    const accepted = await close(fixture, hash);

    expect(materialityEntries).toHaveLength(1);
    expect(accepted.code).toBe(0);
  });
});
