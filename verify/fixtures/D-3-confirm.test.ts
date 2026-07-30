import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCriterion,
  close,
  createSlashSession,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

const readSkill = async (): Promise<string> =>
  await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

// INTERVIEW-DEFECTS.md D-3: the machine never blocked the interview from
// proceeding — only `close` checks `confirmed`. The per-answer round trip came
// from the prompt telling the driver to wait for "맞아". So the driver keeps
// restating, but stops waiting.
test("답마다 확인을 기다리지 말라고 스킬 설명서가 지시한다", async () => {
  const skill = await readSkill();

  expect(skill.includes('Do not stop here waiting for a "yes"')).toBe(true);
  expect(skill.includes("in the same response as the next\nquestion")).toBe(true);
});

// The confirmation is not dropped — it moves to one batched round trip before
// close, so the user still ratifies every reading (original request G1).
test("끝내기 전 읽은 것을 한 번에 확인받으라고 스킬 설명서가 지시한다", async () => {
  const skill = await readSkill();

  expect(skill.includes("confirmed in one pass")).toBe(true);
  expect(skill.includes("Before closing — four things, all required")).toBe(true);
});

// This is the fact the whole change rests on: batching the confirmation is only
// safe because nothing but `close` reads `confirmed`. If a per-turn gate ever
// appears, the interview would stall mid-flight and this test says so.
test("확인을 미뤄 둬도 인터뷰는 계속 돈다 — 막는 자리는 close 하나뿐이다", async () => {
  await withInterviewFixture("d-3-confirm-deferred", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);

    // Two full question/answer/restate rounds with no confirm anywhere.
    for (const { q, a, r } of [
      { q: "Q1", a: "A1", r: "R1" },
      { q: "Q2", a: "A2", r: "R2" },
    ]) {
      await record(fixture, [
        "--kind",
        "question",
        "--id",
        q,
        "--dimension",
        "D1",
        "--covers",
        "F1",
        "--text",
        `${q} 언제 실패하나요?`,
      ]);
      await record(fixture, [
        "--kind",
        "answer",
        "--id",
        a,
        "--question",
        q,
        "--text",
        `${a} 월요일 오전 사내망에서 반복됩니다`,
      ]);
      // `record` throws on a non-zero exit, so reaching the next loop pass is
      // itself the assertion that nothing blocked.
      await record(fixture, [
        "--kind",
        "restate",
        "--id",
        r,
        "--answer",
        a,
        "--text",
        `${r} 사내망 접속 시 첫 인증만 튕긴다는 뜻으로 읽었습니다`,
      ]);
    }

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
    await record(fixture, ["--kind", "goal", "--text", "재현 조건이 확인되어야 한다"]);

    // Only now does the deferred confirmation come due.
    const blocked = await close(fixture);
    expect(blocked.code).not.toBe(0);
    expect(blocked.stderr).toContain("Answers the user never confirmed");
    expect(blocked.stderr).toContain("A1");
    expect(blocked.stderr).toContain("A2");

    // Batching the confirmations at the end is enough to pass.
    await record(fixture, ["--kind", "confirm", "--restate", "R1", "--verdict", "accepted"]);
    await record(fixture, ["--kind", "confirm", "--restate", "R2", "--verdict", "accepted"]);

    expect((await close(fixture)).code).toBe(0);
  });
});
