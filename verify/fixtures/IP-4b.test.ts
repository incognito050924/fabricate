import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("잠긴 의도가 없으면 거부하고 실제 잠긴 의도와 증거가 있으면 통과한다", async () => {
  await withInterviewFixture("ip-4b-no-records", async (fixture) => {
    const checked = await fabricate(fixture, ["check", "missing-intent"]);

    expect(checked.code).not.toBe(0);
    expect(checked.stderr).toContain("잠긴 의도 레코드가 없습니다");
    expect(checked.stderr).toContain("missing-intent");
  });

  await withInterviewFixture("ip-4b-unknown-id", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await expectCode(close(fixture), 0);

    const checked = await fabricate(fixture, ["check", "unknown-intent"]);

    expect(checked.code).not.toBe(0);
    expect(checked.stderr).toContain("잠긴 의도 레코드가 없습니다");
    expect(checked.stderr).toContain("unknown-intent");
  });

  await withInterviewFixture("ip-4b-active-session", async (fixture) => {
    await createSlashSession(fixture);

    const checked = await fabricate(fixture, ["check", fixture.sessionId]);

    expect(checked.code).not.toBe(0);
    expect(checked.stderr).toContain("잠긴 의도 레코드가 없습니다");
    expect(checked.stderr).toContain(fixture.sessionId);
  });

  await withInterviewFixture("ip-4b-positive", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await expectCode(close(fixture), 0);
    await expectCode(
      fabricate(fixture, [
        "check",
        "record",
        "--intent",
        fixture.sessionId,
        "--goal",
        "0",
        "--command",
        "printf 'done\\n'",
      ]),
      0,
    );

    const checked = await fabricate(fixture, ["check", fixture.sessionId]);

    expect(checked.code).toBe(0);
    expect(checked.stdout).toContain("1개 목표가 충족됐습니다");
  });
});

const expectCode = async (
  resultPromise: Promise<{ code: number }>,
  code: number,
): Promise<void> => {
  const result = await resultPromise;
  expect(result.code).toBe(code);
};
