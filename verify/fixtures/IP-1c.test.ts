import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  intentFiles,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("close 통과는 원문 바이트를 담은 intent 를 만들고, 거부는 intent 를 만들지 않는다", async () => {
  await withInterviewFixture("ip-1c-positive", async (fixture) => {
    await createSlashSession(fixture);
    const hash = await addCompleteInterview(fixture);
    const accepted = await close(fixture, hash);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);

    const requestBytes = await readFile(
      join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "request.txt"),
    );
    const intentBytes = await readFile(
      join(fixture.projectDir, ".fabricate", "intent", `${fixture.sessionId}.json`),
    );
    const intent = JSON.parse(intentBytes.toString("utf8")) as { request?: unknown };

    expect(typeof intent.request).toBe("string");
    expect(Buffer.compare(Buffer.from(intent.request as string), requestBytes)).toBe(0);
  });

  await withInterviewFixture("ip-1c-negative", async (fixture) => {
    await createSlashSession(fixture);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(await intentFiles(fixture)).toEqual([]);
  });
});
