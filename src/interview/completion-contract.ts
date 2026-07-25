/**
 * The completion contract — "did every acceptance criterion of this item pass,
 * with evidence?". It answers only that question. Whether the goal the item was
 * created for actually stands is a separate judgment (see goal-state-gate.ts):
 * keeping the two apart is what lets a passing contract still fail to close.
 *
 * Its pass rule is an invariant that later work must not drift: a criterion
 * passes only when it is marked pass AND carries evidence, and a contract with
 * no criteria passes nothing.
 */

export type CompletionCriterion = {
  id: string;
  status: string;
  evidence: string[];
};

export type CompletionContract = {
  contract_id: string;
  criteria: CompletionCriterion[];
};

export type CompletionContractResult = {
  pass: boolean;
  reasons: string[];
};

export function evaluateCompletionContract(contract: CompletionContract): CompletionContractResult {
  const reasons: string[] = [];

  if (contract.criteria.length === 0) {
    reasons.push("완료계약에 조건이 하나도 없다 — 통과시킬 것이 없다");
    return { pass: false, reasons };
  }

  for (const criterion of contract.criteria) {
    if (criterion.status !== "pass") {
      reasons.push(`조건 ${criterion.id} 미통과(status=${criterion.status})`);
      continue;
    }
    if (criterion.evidence.length === 0) {
      reasons.push(`조건 ${criterion.id}에 증거가 없다 — 통과로 세지 않는다`);
    }
  }

  return { pass: reasons.length === 0, reasons };
}
