import { expect, test } from "bun:test";
import {
  addCompleteInterview,
  close,
  createSlashSession,
  fabricate,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("새 프로세스에서 show 는 잠긴 레코드의 사용자 원문과 목표 술어 전부를 낸다", async () => {
  await withInterviewFixture("ip-3a-show-locked-record", async (fixture) => {
    await createSlashSession(fixture);
    await addCompleteInterview(fixture);
    await record(fixture, ["--kind", "goal", "--text", "실패 조건의 영향 범위가 정리돼야 한다"]);
    await expectCode(close(fixture), 0);

    const shown = await fabricate(fixture, ["deep-interview", "show", fixture.sessionId]);

    expect(shown.code).toBe(0);
    expect(missingRequiredText(shown.stdout, fixture.request, fixture.goals)).toEqual([]);

    const secondGoal = fixture.goals[1];
    if (secondGoal === undefined) {
      throw new Error("음극 대조에 쓸 두 번째 목표 술어가 없습니다.");
    }

    const outputWithoutSecondGoal = shown.stdout.replace(secondGoal, "");
    expect(missingRequiredText(outputWithoutSecondGoal, fixture.request, fixture.goals)).toEqual([
      secondGoal,
    ]);
  });
});

const missingRequiredText = (output: string, request: string, goals: string[]): string[] => [
  ...(output.includes(request) ? [] : [request]),
  ...goals.filter((goal) => !output.includes(goal)),
];

const expectCode = async (
  resultPromise: Promise<{ code: number }>,
  code: number,
): Promise<void> => {
  const result = await resultPromise;
  expect(result.code).toBe(code);
};
