/**
 * Gate — completion means the goal stands, not that a checklist was ticked.
 *
 * The gate is a pure reader. It never decides whether a predicate is satisfied:
 * oracle predicates are settled by oracle_satisfaction records and user
 * predicates by recorded user judgments, and the gate only reports what those
 * records say. Default-deny throughout — an unrecorded predicate is unverified,
 * never satisfied, so nothing gets closed by silence.
 *
 * It deliberately does not read the completion contract's verdict: the two
 * judgments must be able to disagree, which is the whole point of ac-4.
 */

import type { CompletionContract } from "./completion-contract";

export type JudgedPredicate = {
  id: string;
  judge: string;
};

export type SatisfactionRecord = {
  predicate_id: string;
  satisfied: boolean;
};

export type JudgmentRecord = {
  predicate_id: string;
  verdict: string;
};

export type GoalStateGateInput = {
  goal_state?: { predicates: JudgedPredicate[] };
  oracle_satisfaction: SatisfactionRecord[];
  user_judgments: JudgmentRecord[];
};

export type GoalStateGateResult = {
  pass: boolean;
  reasons: string[];
};

export function goalStateGate(
  item: GoalStateGateInput,
  _completion: CompletionContract,
): GoalStateGateResult {
  const goalState = item.goal_state;
  if (!goalState) {
    // No goal state was ever derived for this item — there is nothing for this
    // gate to read, so it stands aside instead of inventing a blocker.
    return { pass: true, reasons: [] };
  }

  const reasons: string[] = [];
  for (const predicate of goalState.predicates) {
    if (predicate.judge === "user") {
      const judgment = item.user_judgments.find((record) => record.predicate_id === predicate.id);
      if (!judgment) {
        reasons.push(`술어 ${predicate.id} 미검증 — 사용자 판정 기록이 없다(자동 통과 불가)`);
      } else if (judgment.verdict !== "satisfied") {
        reasons.push(`술어 ${predicate.id} 미충족 — 사용자 판정이 ${judgment.verdict}다`);
      }
      continue;
    }

    const satisfaction = item.oracle_satisfaction.find(
      (record) => record.predicate_id === predicate.id,
    );
    if (!satisfaction) {
      reasons.push(`술어 ${predicate.id} 미검증 — 충족 기록이 없다`);
    } else if (satisfaction.satisfied !== true) {
      reasons.push(`술어 ${predicate.id} 미충족 — 기록이 satisfied=false다`);
    }
  }

  return { pass: reasons.length === 0, reasons };
}
