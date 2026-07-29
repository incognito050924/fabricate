import { join } from "node:path";
import { appendJsonLine, ensureDir, readJsonLines, readUtf8IfExists } from "./files.ts";
import { analyzeLedger, readinessLine } from "./interview-state.ts";
import { fabricateDir, projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";
import { selectActiveSession } from "./session.ts";

export const closeIntent = async (cwd: string, args: string[]): Promise<CliResult> => {
  const parsed = parseCloseArgs(args);
  if (!parsed.ok) {
    return parsed.result;
  }

  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  const requestPath = join(selected.session.dir, "request.txt");
  const ledgerPath = join(selected.session.dir, "ledger.jsonl");
  const request = await readUtf8IfExists(requestPath);
  const ledger = await readJsonLines(ledgerPath);
  const state = analyzeLedger(ledger);
  const reasons = closeReasons(request, parsed.goalHash, state);
  const readiness = state.readiness;
  const readinessText = readinessLine(readiness);

  if (reasons.length > 0) {
    await appendJsonLine(ledgerPath, {
      ts: new Date().toISOString(),
      kind: "close-rejected",
      reasons,
      readiness,
    });

    return fail(
      ["닫을 수 없습니다.", ...reasons.map((reason) => `- ${reason}`), readinessText, ""].join(
        "\n",
      ),
    );
  }

  const intentDir = join(fabricateDir(projectDir), "intent");
  const intentPath = join(intentDir, `${selected.session.sessionId}.json`);
  await appendJsonLine(ledgerPath, {
    ts: new Date().toISOString(),
    kind: "closed",
    readiness,
  });
  const ledgerAfterClose = await readJsonLines(ledgerPath);
  const finalState = analyzeLedger(ledgerAfterClose);

  await ensureDir(intentDir);
  await Bun.write(
    intentPath,
    `${JSON.stringify(
      {
        id: selected.session.sessionId,
        session_id: selected.session.sessionId,
        request,
        goals: {
          texts: finalState.goals,
          goal_hash: finalState.goalHash,
        },
        dimensions: [...finalState.dimensions.values()].map((dimension) => ({
          id: dimension.id,
          text: dimension.text,
          depends_on: dimension.dependsOn,
          resolved: dimension.resolved,
          unevaluated: dimension.unevaluated,
          stale: dimension.stale,
          evidence: dimension.evidence,
          answer: dimension.answer,
        })),
        readiness,
        ledger: ledgerAfterClose,
        locked_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  return ok(`${readinessText}\n잠긴 의도 레코드를 썼습니다: ${intentPath}\n`);
};

type CloseArgs = { ok: true; goalHash: string } | { ok: false; result: CliResult };

const parseCloseArgs = (args: string[]): CloseArgs => {
  let goalHash: string | undefined;
  let index = 0;

  while (index < args.length) {
    const arg = args[index];

    if (arg === "--goal-hash") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--goal-hash 값이 필요합니다.\n") };
      }
      if (goalHash !== undefined) {
        return { ok: false, result: fail("중복 인자입니다: --goal-hash\n") };
      }
      goalHash = value;
      index += 2;
      continue;
    }

    return { ok: false, result: fail(`알 수 없는 인자입니다: ${arg}\n`) };
  }

  if (goalHash === undefined) {
    return { ok: false, result: fail("--goal-hash 값이 필요합니다.\n") };
  }

  return { ok: true, goalHash };
};

const closeReasons = (
  request: string | null,
  providedGoalHash: string,
  state: ReturnType<typeof analyzeLedger>,
): string[] => {
  const reasons: string[] = [];

  if (request === null) {
    reasons.push(
      '사용자 원문이 없습니다. /fabricate:deep-interview "<요청>" 슬래시 명령으로 다시 시작하세요.',
    );
  }

  if (state.questions.size === 0) {
    reasons.push("질문이 없습니다.");
  }

  if (state.goals.length === 0) {
    reasons.push("목표 술어가 없습니다.");
  } else if (state.goalHash !== providedGoalHash) {
    reasons.push(`goal-hash 불일치: expected ${state.goalHash}, got ${providedGoalHash}`);
  }

  const uncoveredFragments = [...state.fragments.values()].filter(
    (fragment) =>
      ![...state.questions.values()].some((question) => question.covers.includes(fragment.id)),
  );
  if (state.fragments.size === 0) {
    reasons.push("미커버 조각: fragment 가 없습니다.");
  } else if (uncoveredFragments.length > 0) {
    reasons.push(`미커버 조각: ${uncoveredFragments.map((fragment) => fragment.id).join(", ")}`);
  }

  const unresolvedDimensions = [...state.dimensions.values()].filter(
    (dimension) => !dimension.resolved,
  );
  if (unresolvedDimensions.length > 0) {
    reasons.push(
      `미해소 차원: ${unresolvedDimensions.map((dimension) => dimension.id).join(", ")}`,
    );
  }

  const unevaluatedDimensions = [...state.dimensions.values()].filter(
    (dimension) => dimension.unevaluated,
  );
  if (unevaluatedDimensions.length > 0) {
    reasons.push(
      `무증거 해소: ${unevaluatedDimensions.map((dimension) => dimension.id).join(", ")}`,
    );
  }

  const staleDimensions = [...state.dimensions.values()].filter((dimension) => dimension.stale);
  if (staleDimensions.length > 0) {
    reasons.push(`stale 노드: ${staleDimensions.map((dimension) => dimension.id).join(", ")}`);
  }

  const unconfirmedAnswers = [...state.answers.values()].filter((answer) => !answer.confirmed);
  if (unconfirmedAnswers.length > 0) {
    reasons.push(`미교정 불일치: ${unconfirmedAnswers.map((answer) => answer.id).join(", ")}`);
  }

  const unresolvedContradictions = [...state.contradictions.values()].filter(
    (contradiction) => !contradiction.resolved,
  );
  const lastPassIndex =
    state.contradictionPassIndexes.length === 0
      ? null
      : Math.max(...state.contradictionPassIndexes);
  if (lastPassIndex === null) {
    reasons.push("모순 패스가 실행되지 않았습니다.");
  } else if (state.lastAnswerIndex !== null && lastPassIndex < state.lastAnswerIndex) {
    reasons.push("모순 패스가 마지막 답변보다 앞에 있습니다.");
  }
  if (unresolvedContradictions.length > 0) {
    reasons.push(
      `미해소 모순: ${unresolvedContradictions
        .map((contradiction) => contradiction.id)
        .join(", ")}`,
    );
  }

  if (!state.readiness.ready) {
    reasons.push(readinessLine(state.readiness));
  }

  const unroutedAmbiguities = [...state.ambiguities.values()].filter(
    (ambiguity) => !state.materialities.has(ambiguity.id),
  );
  if (unroutedAmbiguities.length > 0) {
    reasons.push(
      `중대성 라우팅 없음: ${unroutedAmbiguities.map((ambiguity) => ambiguity.id).join(", ")}`,
    );
  }

  const hardCriteriaWithoutExamples = [...state.criteria.values()].filter(
    (criterion) => criterion.type === "hard" && criterion.examples.length === 0,
  );
  if (hardCriteriaWithoutExamples.length > 0) {
    reasons.push(
      `hard 기준 예시 없음: ${hardCriteriaWithoutExamples
        .map((criterion) => criterion.id)
        .join(", ")}`,
    );
  }

  const hardCriteriaWithoutRules = [...state.criteria.values()].filter(
    (criterion) => criterion.type === "hard" && criterion.rule === null,
  );
  if (hardCriteriaWithoutRules.length > 0) {
    reasons.push(
      `hard 기준 rule 없음: ${hardCriteriaWithoutRules
        .map((criterion) => criterion.id)
        .join(", ")}`,
    );
  }

  return reasons;
};
