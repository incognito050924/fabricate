import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("완료 판정 기준을 하나도 안 적으면 닫기가 거부한다", async () => {
  await withInterviewFixture("g-2-missing", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterviewWithoutCriteria(fixture);

    const rejected = await close(fixture, hash);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("No completion criterion");
    expect(await intentFiles(fixture)).toEqual([]);
  });
});

test("완료 판정 기준을 적으면 같은 인터뷰가 닫힌다", async () => {
  await withInterviewFixture("g-2-present", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterviewWithoutCriteria(fixture);

    await record(fixture, [
      "--kind",
      "criterion",
      "--id",
      "K1",
      "--text",
      "재현 조건이 확인됐는가",
      "--type",
      "hard",
    ]);
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
      "충족",
    ]);
    await record(fixture, [
      "--kind",
      "rule",
      "--criterion",
      "K1",
      "--text",
      "사용자가 충족이라고 판정한 조건을 만족해야 한다",
    ]);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});

test("완료 판정 기준을 적으라고 스킬 설명서가 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("--kind criterion")).toBe(true);
  expect(skill.includes("--kind example")).toBe(true);
  expect(skill.includes("--kind rule")).toBe(true);
});

const addCompleteInterviewWithoutCriteria = async (
  fixture: Parameters<typeof addCompleteInterview>[0],
): Promise<string> => await addCompleteInterview(fixture, { criteria: false });
