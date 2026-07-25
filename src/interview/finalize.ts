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
import { preservationJudgmentSchema } from "./preservation-judgment";
import { type ResynthesisRoute, routeAfterPreservationFail } from "./resynthesis";
import { synthesisProvenanceSchema } from "./synthesis-provenance";

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

/**
 * The other half of finalizing: a candidate wording becomes recorded intent
 * only if it passed a session-blind preservation judgment. Fail-closed at every
 * missing record — an absent provenance or an absent judgment is a refusal, not
 * a "probably fine". A failed judgment does not come back to the driver for
 * editing; it routes to a fresh synthesis from the original request.
 */

export type IntentRecord = {
  statement: string;
  /** The user's own words, carried verbatim alongside what was derived. */
  source_request: string;
  synthesized_by: string;
};

export type IntentStore = {
  records: IntentRecord[];
};

export function createIntentStore(): IntentStore {
  return { records: [] };
}

export function listRecordedIntents(store: IntentStore): IntentRecord[] {
  return [...store.records];
}

export type FinalizeRejectionKind =
  | "missing_synthesis_provenance"
  | "invalid_synthesis_provenance"
  | "missing_preservation_judgment"
  | "invalid_preservation_judgment"
  | "preservation_failed";

export type FinalizeRejection = {
  kind: FinalizeRejectionKind;
  reason: string;
};

export type FinalizeCandidate = {
  source_request: string;
  candidate_statement: string;
  synthesis_provenance?: unknown;
  preservation_judgment?: unknown;
};

export type FinalizeOutcome =
  | { status: "accepted"; intent: IntentRecord }
  | { status: "rejected"; rejection: FinalizeRejection; routing?: ResynthesisRoute };

export function finalize(candidate: FinalizeCandidate, store: IntentStore): FinalizeOutcome {
  if (candidate.synthesis_provenance === undefined) {
    return {
      status: "rejected",
      rejection: {
        kind: "missing_synthesis_provenance",
        reason: "누가 합성했는지 기록이 없다 — 확정하지 않는다",
      },
    };
  }

  const provenance = synthesisProvenanceSchema.safeParse(candidate.synthesis_provenance);
  if (!provenance.success) {
    return {
      status: "rejected",
      rejection: {
        kind: "invalid_synthesis_provenance",
        reason: "합성 provenance가 형태 검사를 통과하지 못했다",
      },
    };
  }

  if (candidate.preservation_judgment === undefined) {
    return {
      status: "rejected",
      rejection: {
        kind: "missing_preservation_judgment",
        reason: "보존 판정 기록이 없다 — 판정 없이 확정하지 않는다",
      },
    };
  }

  const judgment = preservationJudgmentSchema.safeParse(candidate.preservation_judgment);
  if (!judgment.success) {
    return {
      status: "rejected",
      rejection: {
        kind: "invalid_preservation_judgment",
        reason: "보존 판정 brief가 형태 검사를 통과하지 못했다 — 맹검이 깨졌을 수 있다",
      },
    };
  }

  if (judgment.data.verdict === "fail") {
    return {
      status: "rejected",
      rejection: {
        kind: "preservation_failed",
        reason: "후보 문안이 원 요청을 보존하지 못했다 — 원문에서 다시 합성한다",
      },
      routing: routeAfterPreservationFail({
        source_request: candidate.source_request,
        judgment: judgment.data,
      }),
    };
  }

  const intent: IntentRecord = {
    statement: candidate.candidate_statement,
    source_request: candidate.source_request,
    synthesized_by: provenance.data.author_context,
  };
  store.records.push(intent);
  return { status: "accepted", intent };
}
