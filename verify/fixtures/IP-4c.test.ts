import { expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("증거 없음, 실패한 검증 명령, 오래된 증거를 거부하고 새 성공 증거로만 통과한다", async () => {
  await withInterviewFixture("ip-4c-missing-evidence", async (fixture) => {
    await lockCompleteIntent(fixture);

    const missing = await fabricate(fixture, ["check", fixture.sessionId]);

    expect(missing.code).not.toBe(0);
    expect(missing.stderr).toContain("증거 파일이 없습니다");

    await recordSuccessfulEvidence(fixture);

    const fixed = await fabricate(fixture, ["check", fixture.sessionId]);
    expect(fixed.code).toBe(0);
  });

  await withInterviewFixture("ip-4c-failed-command", async (fixture) => {
    await lockCompleteIntent(fixture);

    const recorded = await fabricate(fixture, [
      "check",
      "record",
      "--intent",
      fixture.sessionId,
      "--goal",
      "0",
      "--command",
      "false",
    ]);

    expect(recorded.code).toBe(1);
    expect(await Bun.file(evidencePath(fixture)).exists()).toBe(true);

    const failed = await fabricate(fixture, ["check", fixture.sessionId]);
    expect(failed.code).not.toBe(0);
    expect(failed.stderr).toContain("검증 명령 실패");
    expect(failed.stderr).toContain("exit 1");

    await recordSuccessfulEvidence(fixture);

    const fixed = await fabricate(fixture, ["check", fixture.sessionId]);
    expect(fixed.code).toBe(0);
  });

  await withInterviewFixture("ip-4c-old-evidence", async (fixture) => {
    await lockCompleteIntent(fixture);
    await recordSuccessfulEvidence(fixture);
    await rewriteEvidence(fixture, (evidence) => ({
      ...evidence,
      recorded_at: "1970-01-01T00:00:00.000Z",
    }));

    const old = await fabricate(fixture, ["check", fixture.sessionId]);
    expect(old.code).not.toBe(0);
    expect(old.stderr).toContain("오래된 증거");

    await recordSuccessfulEvidence(fixture);

    const fixed = await fabricate(fixture, ["check", fixture.sessionId]);
    expect(fixed.code).toBe(0);
  });
});

const lockCompleteIntent = async (
  fixture: Parameters<typeof createSlashSession>[0],
): Promise<void> => {
  await createSlashSession(fixture);
  await addCompleteInterview(fixture);
  const closed = await close(fixture);
  expect(closed.code).toBe(0);
};

const recordSuccessfulEvidence = async (
  fixture: Parameters<typeof createSlashSession>[0],
): Promise<void> => {
  const recorded = await fabricate(fixture, [
    "check",
    "record",
    "--intent",
    fixture.sessionId,
    "--goal",
    "0",
    "--command",
    "printf 'fresh evidence\\n'",
  ]);
  expect(recorded.code).toBe(0);
};

const rewriteEvidence = async (
  fixture: Parameters<typeof createSlashSession>[0],
  rewrite: (evidence: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> => {
  const path = evidencePath(fixture);
  const evidence = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  await writeFile(path, `${JSON.stringify(rewrite(evidence), null, 2)}\n`, "utf8");
};

const evidencePath = (fixture: Parameters<typeof createSlashSession>[0]): string =>
  join(fixture.projectDir, ".fabricate", "evidence", fixture.sessionId, "0.json");
