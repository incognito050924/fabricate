import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  record,
  repoRoot,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

// The words the user named: literal translations and sound-alikes that carry no
// meaning in Korean. "사다리 타기" is the worst of them — laddering is asking "why"
// again and again, but in Korean the phrase means drawing lots.
const 갈아치울_말 = [
  "맹검",
  "되말",
  "재진술",
  "차원",
  "드라이버",
  "하네스",
  "시드",
  "사다리 타기",
  "멱등",
  "삼원",
  "미커버",
  "라우팅",
];

// What the interview ships to the user: the two skills, the subagent definition,
// and every string the CLI can print. GOAL.md and STATE.md are project records,
// not something the interview says to anyone.
const 배송물 = async (): Promise<{ path: string; text: string }[]> => {
  const paths = [
    join(repoRoot, "skills", "deep-interview", "SKILL.md"),
    join(repoRoot, "skills", "seed", "SKILL.md"),
    join(repoRoot, "agents", "question-blind-reviewer.md"),
    join(repoRoot, "README.md"),
    ...(await readdir(join(repoRoot, "src"))).map((name) => join(repoRoot, "src", name)),
  ];

  return await Promise.all(
    paths.map(async (path) => ({ path, text: await readFile(path, "utf8") })),
  );
};

test("배송물에 직역·음차로 굳은 말이 남아 있지 않다", async () => {
  const 걸린_것: string[] = [];

  for (const { path, text } of await 배송물()) {
    for (const 말 of 갈아치울_말) {
      if (text.includes(말)) {
        걸린_것.push(`${path.slice(repoRoot.length + 1)}: ${말}`);
      }
    }
  }

  expect(걸린_것).toEqual([]);
});

test("닫기가 거부할 때 내는 사유가 통용되는 한국어다", async () => {
  await withInterviewFixture("g-5-close-reasons", async (fixture) => {
    await createSlashSession(fixture);
    await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);

    const rejected = await close(fixture, "any");

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("안 닫힌 쟁점");
    expect(rejected.stderr).toContain("어느 질문에도 안 걸린 조각");

    for (const 말 of 갈아치울_말) {
      expect(rejected.stderr.includes(말)).toBe(false);
    }
  });
});

test("잠긴 레코드까지 간 인터뷰도 같은 말로 끝난다", async () => {
  await withInterviewFixture("g-5-accepted", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);

    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);

    for (const 말 of 갈아치울_말) {
      expect(accepted.stdout.includes(말)).toBe(false);
    }
  });
});
