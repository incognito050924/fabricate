import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { repoRoot } from "../support/interview-fixture.ts";

const skillText = async (): Promise<string> =>
  await readFile(join(repoRoot, "skills", "deep-interview", "SKILL.md"), "utf8");

const frontmatter = (text: string): string => {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);

  if (match === null || match[1] === undefined) {
    throw new Error("SKILL.md has no frontmatter.");
  }

  return match[1];
};

test("스킬 설명이 에이전트에게 '이럴 때 쓴다'가 아니라 '이럴 때 권한다'로 적혀 있다", async () => {
  const description = frontmatter(await skillText());

  expect(description.includes("Offer it when")).toBe(true);
  expect(description.includes("do not start it on your own")).toBe(true);
});

test("시작은 사용자가 한다는 것이 설명서 본문에도 적혀 있다", async () => {
  const skill = await skillText();

  expect(skill.includes("does not switch itself on")).toBe(true);
  expect(skill.includes("The user decides.")).toBe(true);
});

test("에이전트가 스스로 연 세션은 잠긴 레코드를 만들 수 없다 — 원문이 없기 때문이다", async () => {
  // The model-invocation path (PreToolUse) carries no user request bytes, so close
  // refuses it. That is the machine backstop behind this rule; it already stands
  // as IP-2ⓜ and this test pins it to goal 4.
  const hooks = await readFile(join(repoRoot, "src", "hooks.ts"), "utf8");
  const intent = await readFile(join(repoRoot, "src", "intent.ts"), "utf8");

  expect(hooks.includes("pre-tool-use")).toBe(true);
  expect(intent.includes("The user's original text is missing")).toBe(true);
});
