import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("show 는 없는 id 와 잠기지 않은 세션을 거부하고 잠긴 뒤 같은 id 를 읽는다", async () => {
  await withInterviewFixture("ip-3d-negative-show", async (fixture) => {
    const missing = await fabricate(fixture, ["deep-interview", "show", "missing-intent"]);

    expect(missing.code).not.toBe(0);
    expect(missing.stderr).toContain("잠긴 의도 레코드가 없습니다");
    expect(missing.stderr).toContain("missing-intent");

    await createSlashSession(fixture);
    await addCompleteInterview(fixture);

    const unlocked = await fabricate(fixture, ["deep-interview", "show", fixture.sessionId]);

    expect(unlocked.code).not.toBe(0);
    expect(unlocked.stderr).toContain("잠긴 의도 레코드가 없습니다");
    expect(unlocked.stderr).toContain(fixture.sessionId);

    await expectCode(close(fixture), 0);

    const locked = await fabricate(fixture, ["deep-interview", "show", fixture.sessionId]);

    expect(locked.code).toBe(0);
    expect(locked.stdout).toContain(fixture.request);
  });
});

const expectCode = async (
  resultPromise: Promise<{ code: number }>,
  code: number,
): Promise<void> => {
  const result = await resultPromise;
  expect(result.code).toBe(code);
};
