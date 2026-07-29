import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJsonLines } from "../lib/files.ts";
import {
  createSlashSession,
  fabricate,
  markSlashSession,
  stopHook,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("활성 표식이 있는데 이번 턴 장부가 안 늘면 Stop 훅이 막고 사유를 돌려준다", async () => {
  await withInterviewFixture("ip-2j-block", async (fixture) => {
    await markSlashSession(fixture, "prompt-1");
    const blocked = await stopHook({
      fixture,
      promptId: "prompt-1",
    });

    expect(blocked.code).toBe(0);
    expect(JSON.parse(blocked.stdout)).toMatchObject({ decision: "block" });
    expect(blocked.stdout).toContain("활성 인터뷰");
    expect(blocked.stdout).toContain("장부");
    expect(blocked.stdout).toContain("fabricate turn record");

    const turnstate = JSON.parse(
      await readFile(
        join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "turnstate.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(turnstate).toMatchObject({
      prompt_id: "prompt-1",
      start_L: 0,
      last_L: 0,
    });
  });
});

test("장부가 늘어난 새 턴은 Stop 훅이 막지 않는다", async () => {
  await withInterviewFixture("ip-2j-pass", async (fixture) => {
    await createSlashSession(fixture);
    await fabricate(fixture, [
      "turn",
      "record",
      "--kind",
      "dimension",
      "--id",
      "D1",
      "--text",
      "실패 조건",
    ]);

    const passed = await stopHook({
      fixture,
      promptId: "prompt-2",
    });

    expect(passed.code).toBe(0);
    expect(passed.stdout).toBe("");
  });
});

test("Stop 재진입에서는 다시 막지 않고 위반을 장부에 남긴다", async () => {
  await withInterviewFixture("ip-2j-reentry", async (fixture) => {
    await markSlashSession(fixture, "prompt-1");
    const reentered = await stopHook({
      fixture,
      promptId: "prompt-1",
      stopHookActive: true,
    });

    expect(reentered.code).toBe(0);
    expect(reentered.stdout).toBe("");

    const ledger = await readJsonLines(
      join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "ledger.jsonl"),
    );
    expect(ledger.some((entry) => entry.kind === "turn-violation")).toBe(true);

    const nextTurn = await stopHook({
      fixture,
      promptId: "prompt-2",
    });
    expect(JSON.parse(nextTurn.stdout)).toMatchObject({ decision: "block" });
  });
});
