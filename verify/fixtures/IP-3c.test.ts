import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runProcess } from "../lib/process.ts";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("seed 스킬이 적은 show 명령은 실제로 실행되어 원문과 목표 술어를 낸다", async () => {
  await withInterviewFixture("ip-3c-seed-skill-command", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await expectCode(close(fixture), 0);

    const skillText = await readFile(join(fixture.repoRoot, "skills", "seed", "SKILL.md"), "utf8");
    const commandTemplate = extractShowCommandTemplate(skillText);
    const commandLine = commandTemplate.replace("<id>", fixture.sessionId);
    const [command, ...args] = commandLine.split(/\s+/);

    expect(command).toBe("fabricate");

    // This proves the prompt artifact points at a reachable seed command. Model
    // compliance with that prompt remains outside the machine-checkable surface.
    const result = await runProcess(command ?? "", args, {
      cwd: fixture.projectDir,
      env: {
        PATH: `${join(fixture.repoRoot, "bin")}:${process.env.PATH ?? ""}`,
      },
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(fixture.request);
    for (const goal of fixture.goals) {
      expect(result.stdout).toContain(goal);
    }
  });
});

const extractShowCommandTemplate = (skillText: string): string => {
  let inCodeBlock = false;

  for (const line of skillText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock && /^fabricate\s+deep-interview\s+show\s+<id>$/.test(trimmed)) {
      return trimmed;
    }
  }

  throw new Error(
    "seed 스킬 코드 블록에서 `fabricate deep-interview show <id>`를 찾지 못했습니다.",
  );
};

const expectCode = async (
  resultPromise: Promise<{ code: number }>,
  code: number,
): Promise<void> => {
  const result = await resultPromise;
  expect(result.code).toBe(code);
};
