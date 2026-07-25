import { z } from "zod";

/**
 * Gate ② — criterion-set lock. Freezes the criterion-id membership so a run
 * cannot silently shrink its own goal: once locked, removals are refused;
 * additions (found scope) are admissible but reported. Re-locking (re-baselining
 * the set) is allowed only while no criterion carries a verdict — the moment
 * judging has started, the baseline may no longer be rewritten.
 */

export const criterionSetLock = z
  .object({
    criterion_ids: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type CriterionSetLock = z.infer<typeof criterionSetLock>;

const normalize = (ids: string[]): string[] =>
  [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))].sort();

/** Freeze the set. Normalized (trim/dedupe/sort) and copied; an empty set is refused. */
export function lockCriterionSet(criterionIds: string[]): CriterionSetLock {
  return criterionSetLock.parse({ criterion_ids: normalize(criterionIds) });
}

export interface CriterionSetCheck {
  admissible: boolean;
  removed: string[];
  added: string[];
  reason?: string;
}

/**
 * Enforce the lock against a proposed set. Fail-closed: any locked id missing
 * from the proposal refuses the move; additions are admissible and reported.
 */
export function checkCriterionSet(
  lock: CriterionSetLock,
  proposedIds: string[],
): CriterionSetCheck {
  const proposed = new Set(normalize(proposedIds));
  const locked = new Set(lock.criterion_ids);
  const removed = lock.criterion_ids.filter((id) => !proposed.has(id));
  const added = [...proposed].filter((id) => !locked.has(id));

  if (removed.length === 0) {
    return { admissible: true, removed, added };
  }
  return {
    admissible: false,
    removed,
    added,
    reason: `잠긴 조건 집합에서 제거는 거부된다 (제거 시도: ${removed.join(", ")})`,
  };
}

export type RelockDecision =
  | { admissible: true; lock: CriterionSetLock }
  | { admissible: false; reason: string };

/**
 * Re-baseline the lock. Admissible only while zero criteria carry a verdict;
 * afterwards the baseline is permanent.
 */
export function relockCriterionSet(
  proposedIds: string[],
  verdictedCriterionIds: string[],
): RelockDecision {
  if (verdictedCriterionIds.length > 0) {
    return {
      admissible: false,
      reason: `판정이 붙은 뒤의 재잠금은 거부된다 (판정된 조건: ${verdictedCriterionIds.join(", ")})`,
    };
  }
  return { admissible: true, lock: lockCriterionSet(proposedIds) };
}
