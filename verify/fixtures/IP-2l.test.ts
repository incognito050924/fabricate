import { expect, test } from "bun:test";
import {
  createSlashSession,
  record,
  stopHook,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("장부가 안 늘어난 활성 인터뷰 턴은 Stop 훅이 막는다", async () => {
  await withInterviewFixture("ip-2l-negative", async (fixture) => {
    await createSlashSession(fixture);

    const firstTurn = await stopHook({ fixture, promptId: "prompt-1" });
    expect(firstTurn.stdout).toBe("");

    const secondTurn = await stopHook({ fixture, promptId: "prompt-2" });

    expect(secondTurn.code).toBe(0);
    expect(JSON.parse(secondTurn.stdout)).toMatchObject({ decision: "block" });
    expect(secondTurn.stdout).toContain("장부");
  });
});

test("prompt_id 로 갈린 연속 두 턴에서 매번 장부가 늘면 Stop 훅이 막지 않는다", async () => {
  await withInterviewFixture("ip-2l-positive", async (fixture) => {
    await createSlashSession(fixture);

    const firstTurn = await stopHook({ fixture, promptId: "prompt-1" });
    expect(firstTurn.stdout).toBe("");

    await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "실패 조건"]);
    const secondTurn = await stopHook({ fixture, promptId: "prompt-2" });
    expect(secondTurn.code).toBe(0);
    expect(secondTurn.stdout).toBe("");

    await record(fixture, ["--kind", "dimension", "--id", "D2", "--text", "영향 범위"]);
    const thirdTurn = await stopHook({ fixture, promptId: "prompt-3" });
    expect(thirdTurn.code).toBe(0);
    expect(thirdTurn.stdout).toBe("");
  });
});
