import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("잠긴 의도와 모든 목표의 성공 증거가 있으면 통과하고 목표 하나가 비면 거부한다", async () => {
  await withInterviewFixture("ip-4a-positive", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, [
      "--kind",
      "goal",
      "--text",
      "실패 조건을 재현하는 명령이 통과해야 한다",
    ]);
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
        "printf 'goal 0 ok\\n'",
      ]),
      0,
    );
    await expectCode(
      fabricate(fixture, [
        "check",
        "record",
        "--intent",
        fixture.sessionId,
        "--goal",
        "1",
        "--command",
        "printf 'goal 1 ok\\n'",
      ]),
      0,
    );

    const checked = await fabricate(fixture, ["check", fixture.sessionId]);

    expect(checked.code).toBe(0);
    expect(checked.stdout).toContain("Goals satisfied: 2");
    expect(checked.stdout).toContain("로그인 실패의 재현 조건이 확인되어야 한다");
    expect(checked.stdout).toContain("실패 조건을 재현하는 명령이 통과해야 한다");
  });

  await withInterviewFixture("ip-4a-missing-one", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "goal", "--text", "두 번째 목표에도 증거가 필요하다"]);
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
        "printf 'goal 0 ok\\n'",
      ]),
      0,
    );

    const checked = await fabricate(fixture, ["check", fixture.sessionId]);

    expect(checked.code).not.toBe(0);
    expect(checked.stderr).toContain("No evidence file");
    expect(checked.stderr).toContain("goal 1");
  });
});

const expectCode = async (
  resultPromise: Promise<{ code: number }>,
  code: number,
): Promise<void> => {
  const result = await resultPromise;
  expect(result.code).toBe(code);
};
