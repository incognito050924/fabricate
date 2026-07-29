import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

const requestBegin = "----- fabricate request bytes begin -----";
const requestEnd = "----- fabricate request bytes end -----";

test("show 출력의 사용자 원문 구획은 request.txt 와 바이트가 같다", async () => {
  await withInterviewFixture("ip-3b-request-bytes", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await expectCode(close(fixture), 0);

    const requestBytes = await readFile(
      join(fixture.projectDir, ".fabricate", "sessions", fixture.sessionId, "request.txt"),
    );
    const shown = await fabricate(fixture, ["deep-interview", "show", fixture.sessionId]);

    expect(shown.code).toBe(0);
    expect(
      Buffer.compare(Buffer.from(extractRequestText(shown.stdout), "utf8"), requestBytes),
    ).toBe(0);
    expect(Buffer.compare(Buffer.from(`${fixture.request}!`, "utf8"), requestBytes)).not.toBe(0);
  });
});

const extractRequestText = (output: string): string => {
  const startMarker = `${requestBegin}\n`;
  const endMarker = `\n${requestEnd}`;
  const start = output.indexOf(startMarker);
  if (start === -1) {
    throw new Error("show 출력에 사용자 원문 시작 구획이 없습니다.");
  }

  const afterStart = start + startMarker.length;
  const end = output.indexOf(endMarker, afterStart);
  if (end === -1) {
    throw new Error("show 출력에 사용자 원문 끝 구획이 없습니다.");
  }

  return output.slice(afterStart, end);
};

const expectCode = async (
  resultPromise: Promise<{ code: number }>,
  code: number,
): Promise<void> => {
  const result = await resultPromise;
  expect(result.code).toBe(code);
};
