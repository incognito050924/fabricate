/**
 * Finalizing an interview into a recorded intent. Fail-closed: the intent is
 * recorded only when the goal state is confirmed, every acceptance criterion
 * names a goal predicate that actually exists, and no dimension is still open.
 * When anything blocks, no intent comes back at all — a partially recorded
 * intent would read as agreement that was never reached.
 */

import { type Dimension, isSettled } from "./dimension";
import type { RevisableGoalState } from "./goal-revision";
import { hasGoalLink } from "./orphan-gate";

export type AcceptanceCriterion = {
  id: string;
  statement: string;
  goal_predicate_ref?: string;
};

export type FinalizeInput = {
  goal_state: RevisableGoalState;
  criteria: AcceptanceCriterion[];
  dimensions: Dimension[];
};

export type FinalizeBlocker =
  | { kind: "unconfirmed_goal_state" }
  | { kind: "orphan_criterion"; criterion_id: string }
  | { kind: "unknown_predicate_ref"; criterion_id: string; goal_predicate_ref: string }
  | { kind: "open_dimension"; dimension_id: string };

export type RecordedIntent = {
  goal_state: RevisableGoalState;
  criteria: AcceptanceCriterion[];
  dimensions: Dimension[];
};

export type FinalizeResult = {
  finalized: boolean;
  intent?: RecordedIntent;
  blockers: FinalizeBlocker[];
};

export function finalizeIntent(input: FinalizeInput): FinalizeResult {
  const blockers: FinalizeBlocker[] = [];

  if (input.goal_state.confirmed !== true) {
    blockers.push({ kind: "unconfirmed_goal_state" });
  }

  const predicateIds = new Set(input.goal_state.predicates.map((predicate) => predicate.id));
  for (const criterion of input.criteria) {
    if (!hasGoalLink(criterion.goal_predicate_ref)) {
      blockers.push({ kind: "orphan_criterion", criterion_id: criterion.id });
      continue;
    }
    if (!predicateIds.has(criterion.goal_predicate_ref)) {
      blockers.push({
        kind: "unknown_predicate_ref",
        criterion_id: criterion.id,
        goal_predicate_ref: criterion.goal_predicate_ref,
      });
    }
  }

  for (const dimension of input.dimensions) {
    if (!isSettled(dimension)) {
      blockers.push({ kind: "open_dimension", dimension_id: dimension.id });
    }
  }

  if (blockers.length > 0) {
    return { finalized: false, blockers };
  }

  return {
    finalized: true,
    intent: {
      goal_state: input.goal_state,
      criteria: [...input.criteria],
      dimensions: [...input.dimensions],
    },
    blockers: [],
  };
}
