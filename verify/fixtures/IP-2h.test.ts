import { expect, test } from "bun:test";
import {
  addCriterion,
  close,
  createSlashSession,
  intentFiles,
  record,
  withInterviewFixture,
} from "../support/interview-fixture.ts";

test("전제를 뒤엎는 답은 의존 차원 전체를 stale 로 전파하고, 전부 재해소하면 잠근다", async () => {
  await withInterviewFixture("ip-2h-negative", async (fixture) => {
    await createDependentShape(fixture);
    await overturnRoot(fixture);
    await record(fixture, ["--kind", "contradiction-pass", "--text", "뒤집힌 뒤 검사"]);

    const rejected = await close(fixture);

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toContain("전제가 뒤집혀 다시 열린 쟁점");
    expect(rejected.stderr).toContain("D1");
    expect(rejected.stderr).toContain("D2");
    expect(rejected.stderr).toContain("D3");
    expect(await intentFiles(fixture)).toEqual([]);
  });

  await withInterviewFixture("ip-2h-positive", async (fixture) => {
    await createDependentShape(fixture);
    await overturnRoot(fixture);
    for (const dimension of ["D1", "D2", "D3"]) {
      await record(fixture, [
        "--kind",
        "resolve",
        "--dimension",
        dimension,
        "--evidence",
        "뒤집힌 전제 재확인",
        "--answer",
        "A4",
      ]);
    }
    await record(fixture, ["--kind", "contradiction-pass", "--text", "뒤집힌 뒤 검사"]);

    const accepted = await close(fixture);

    expect(accepted.code).toBe(0);
    expect(await intentFiles(fixture)).toEqual(["session-1.json"]);
  });
});

const createDependentShape = async (
  fixture: Parameters<typeof createSlashSession>[0],
): Promise<void> => {
  await createSlashSession(fixture);
  await record(fixture, ["--kind", "fragment", "--id", "F1", "--text", "로그인 실패"]);
  await record(fixture, ["--kind", "fragment", "--id", "F2", "--text", "재현 조건"]);
  await record(fixture, ["--kind", "dimension", "--id", "D1", "--text", "원인 전제"]);
  await record(fixture, [
    "--kind",
    "dimension",
    "--id",
    "D2",
    "--depends-on",
    "D1",
    "--text",
    "영향 범위",
  ]);
  await record(fixture, [
    "--kind",
    "dimension",
    "--id",
    "D3",
    "--depends-on",
    "D2",
    "--text",
    "완료 기준",
  ]);
  for (const dimension of ["D1", "D2", "D3"]) {
    const suffix = dimension.slice(1);
    await record(fixture, [
      "--kind",
      "question",
      "--id",
      `Q${suffix}`,
      "--dimension",
      dimension,
      "--covers",
      suffix === "1" ? "F1,F2" : "",
      "--text",
      `${dimension} 질문`,
    ]);
    await record(fixture, [
      "--kind",
      "answer",
      "--id",
      `A${suffix}`,
      "--question",
      `Q${suffix}`,
      "--text",
      `${dimension} 에 대한 사용자 답변입니다`,
    ]);
    await record(fixture, [
      "--kind",
      "restate",
      "--id",
      `R${suffix}`,
      "--answer",
      `A${suffix}`,
      "--text",
      `${dimension} 답변을 다른 기준 사례로 바꿔 확인합니다`,
    ]);
    await record(fixture, [
      "--kind",
      "confirm",
      "--restate",
      `R${suffix}`,
      "--verdict",
      "accepted",
    ]);
    await record(fixture, [
      "--kind",
      "resolve",
      "--dimension",
      dimension,
      "--evidence",
      "답변 확인",
      "--answer",
      `A${suffix}`,
    ]);
  }
  await record(fixture, ["--kind", "contradiction-pass", "--text", "검사 완료"]);
  await addCriterion(fixture);
  await record(fixture, ["--kind", "goal", "--text", "의존 차원의 완료 기준이 확인되어야 한다"]);
};

const overturnRoot = async (fixture: Parameters<typeof createSlashSession>[0]): Promise<void> => {
  await record(fixture, [
    "--kind",
    "answer",
    "--id",
    "A4",
    "--question",
    "Q1",
    "--overturns",
    "D1",
    "--text",
    "원인 전제가 반대로 바뀌었습니다",
  ]);
  await record(fixture, [
    "--kind",
    "restate",
    "--id",
    "R4",
    "--answer",
    "A4",
    "--text",
    "기존 원인 전제를 반대로 놓고 다시 보겠습니다",
  ]);
  await record(fixture, ["--kind", "confirm", "--restate", "R4", "--verdict", "accepted"]);
};
