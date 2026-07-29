import { expect, test } from "bun:test";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  ledger,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("start, turn record, close 가 장부에 순서대로 남고 표식 없이는 start 가 장부를 만들지 않는다", async () => {
  await withInterviewFixture("ip-1b-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);

    const entries = await ledger(fixture);
    expect(entries.map((entry) => entry.kind)).toEqual([
      "start",
      "fragment",
      "fragment",
      "dimension",
      "review",
      "question",
      "answer",
      "restate",
      "confirm",
      "resolve",
      "contradiction-pass",
      "goal",
      "closed",
    ]);
  });

  await withInterviewFixture("ip-1b-negative", async (fixture) => {
    const rejected = await fabricate(fixture, ["deep-interview", "start"]);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("활성 인터뷰 세션이 없습니다");
    expect(await pathExists(ledgerPath(fixture))).toBe(false);
  });
});

const ledgerPath = (fixture: { projectDir: string; sessionId: string }): string =>
  join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "ledger.jsonl");

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};
