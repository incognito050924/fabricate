import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createSlashSession,
  fabricate,
  ledger,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

const 원문 = "그건 왜 필요하냐, 만들 목록을 여섯에서 둘로 줄여라";

test("어느 질문에도 안 묶인 사용자 발화가 원문 그대로 장부에 남는다", async () => {
  await withInterviewFixture("g-1-remark", async (fixture) => {
    await createSlashSession(fixture);

    const accepted = await record(fixture, ["--kind", "remark", "--id", "M1", "--text", 원문]);
    expect(accepted.code).toBe(0);

    const entries = await ledger(fixture);
    const remark = entries.find((entry) => entry.kind === "remark");

    expect(remark).toMatchObject({ id: "M1", text: 원문 });
    expect(Buffer.from(String(remark?.text)).equals(Buffer.from(원문))).toBe(true);
  });
});

test("질문 하나 없이도 사용자 발화를 받을 수 있다 — answer 는 그러지 못한다", async () => {
  await withInterviewFixture("g-1-unbound", async (fixture) => {
    await createSlashSession(fixture);

    const answer = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "answer",
      "--id",
      "A1",
      "--question",
      "Q1",
      "--text",
      원문,
    ]);
    expect(answer.code).not.toBe(0);

    const remark = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "remark",
      "--id",
      "M1",
      "--text",
      원문,
    ]);
    expect(remark.code).toBe(0);
  });
});

test("방향을 바꾼 발화는 그 전제에 기대던 쟁점 전부를 다시 연다", async () => {
  await withInterviewFixture("g-1-overturns", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "만들 범위"]);
    await record(fixture, [
      "--kind",
      "dimension",
      "--id",
      "D2",
      "--text",
      "만들 순서",
      "--depends-on",
      "D1",
    ]);
    await record(fixture, [
      "--kind",
      "question",
      "--id",
      "Q1",
      "--dimension",
      "D1",
      "--text",
      "범위는?",
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      "A1",
      "--question",
      "Q1",
      "--text",
      "여섯 다",
    ]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D1",
      "--evidence",
      "A1 이 범위를 정했다",
      "--answer",
      "A1",
    ]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      "D2",
      "--evidence",
      "범위가 정해져 순서가 따라온다",
      "--answer",
      "A1",
    ]);

    await record(fixture, ["--kind", "remark", "--id", "M1", "--text", 원문, "--overturns", "D1"]);

    const rejected = await fabricate(fixture, ["deep-interview", "close", "--goal-hash", "any"]);
    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("D1");
    expect(rejected.stderr).toContain("D2");
  });
});

test("없는 쟁점을 뒤엎겠다는 발화는 거부한다", async () => {
  await withInterviewFixture("g-1-unknown-dimension", async (fixture) => {
    await createSlashSession(fixture);

    const rejected = await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "remark",
      "--id",
      "M1",
      "--text",
      원문,
      "--overturns",
      "D404",
    ]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("D404");
  });
});

test("사용자가 먼저 꺼낸 말을 요약으로 대체하지 말라고 스킬 설명서가 지시한다", async () => {
  const skill = await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

  expect(skill.includes("--kind remark")).toBe(true);
  expect(skill.includes("brings up unprompted")).toBe(true);
});
