/**
 * Controlled revision of the goal state. The goal is a living object, not a
 * frozen one: a discovery question may revise a predicate — but only by naming
 * which predicate it revises, and the revision costs the confirmation. The
 * revised goal state comes back unconfirmed so it must be re-confirmed before
 * anything downstream may finalize on it.
 */

import { type DiscoveryQuestion, approveDiscoveryQuestion, isNonBlank } from "./orphan-gate";

export type RevisablePredicate = {
  id: string;
  text: string;
  verification_means?: string;
};

export type RevisableGoalState = {
  derived_at: string;
  confirmed: boolean;
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
      predicate.id === targetId ? { ...predicate, text: revisedText } : { ...predicate },
    ),
  };
}
