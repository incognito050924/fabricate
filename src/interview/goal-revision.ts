/**
 * Controlled revision of the goal state. The goal is a living object, not a
 * frozen one: a discovery question may revise a predicate — but only by naming
 * which predicate it revises, and the revision costs the confirmation. The
 * revised goal state comes back unconfirmed so it must be re-confirmed before
 * anything downstream may finalize on it.
 */

import { type DiscoveryQuestion, approveDiscoveryQuestion, isNonBlank } from "./orphan-gate";

/**
 * A predicate as the revision path sees it. `text` and `statement` are the same
 * wording under two lenses (see goal-state.ts); a predicate written by round 0
 * carries `statement`, one written here carries `text`, and revision keeps
 * whichever it was handed in step with the other so the result can still be
 * re-parsed as a goal state.
 */
export type RevisablePredicate = {
  id: string;
  text?: string;
  statement?: string;
  verification_means?: string;
  confirmed?: boolean;
};

export type RevisableGoalState = {
  derived_at: string;
  confirmed?: boolean;
  predicates: RevisablePredicate[];
};

export type DiscoveryAdoption = DiscoveryQuestion & {
  /** The replacement text for the named predicate. */
  revised_text?: string;
};

/**
 * Adopt a discovery question into the goal state. Fail-closed at every step:
 * an orphan question, a blank revision, or an unknown target predicate all
 * refuse loudly rather than half-applying. The input state is never mutated.
 */
export function adoptDiscoveryQuestion(
  state: RevisableGoalState,
  question: DiscoveryAdoption,
): RevisableGoalState {
  const approval = approveDiscoveryQuestion(question);
  if (!approval.approved) {
    throw new Error(
      "개정 대상을 명시하지 않은 발굴 질문은 goal_state를 개정할 수 없다 — 고아로 거부한다",
    );
  }
  if (!isNonBlank(question.revised_text)) {
    throw new Error("개정문이 비어 있다 — 무엇으로 바꾸는지가 없으면 개정하지 않는다");
  }

  const targetId = question.revises_goal_predicate;
  const target = state.predicates.find((predicate) => predicate.id === targetId);
  if (!target) {
    throw new Error(`개정 대상 술어 ${targetId}가 goal_state에 없다 — 개정을 거부한다`);
  }

  const revisedText = question.revised_text;
  return {
    ...state,
    confirmed: false,
    predicates: state.predicates.map((predicate) =>
      unconfirm(predicate.id === targetId ? reword(predicate, revisedText) : { ...predicate }),
    ),
  };
}

/**
 * Revision costs the confirmation — at EVERY level that records one.
 *
 * Resetting only the whole-state flag is not enough: a reader that derives
 * confirmation from the per-predicate flags (goal-state.ts isGoalStateConfirmed,
 * for a state whose optional whole-state flag was dropped along the way) would
 * read the revised goal as still confirmed, and finalize would pass without any
 * re-confirmation ever happening. The stale per-predicate `true` is exactly the
 * "confirmed under the OLD wording" claim the revision invalidates.
 *
 * A predicate that never carried the flag is left alone rather than having one
 * invented for it; the derived rule already refuses to read such a predicate as
 * confirmed.
 */
function unconfirm(predicate: RevisablePredicate): RevisablePredicate {
  if (predicate.confirmed === undefined) return predicate;
  return { ...predicate, confirmed: false };
}

/**
 * Rewrite a predicate's wording. Both wording fields move together when both
 * are in play: updating one and leaving the other stale produced a hybrid that
 * no lens could re-read, and left the old wording sitting in the record as if
 * it were still the agreed one.
 */
function reword(predicate: RevisablePredicate, revisedText: string): RevisablePredicate {
  const revised: RevisablePredicate = { ...predicate, text: revisedText };
  if (predicate.statement !== undefined) {
    revised.statement = revisedText;
  }
  return revised;
}
