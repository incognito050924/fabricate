import type { InterviewSession, SessionPredicate } from "./session";

/**
 * The remaining gap — the predicates of the goal that do not hold yet. It is
 * derived from the predicate records every time it is asked for, never stored
 * as a number: a count kept alongside the predicates is a count that can be
 * right about a state the session has already left.
 *
 * Whether these are ALL the real gaps is a human judgment. What this computes
 * is the gap the session has actually recorded.
 */

export type RemainingGap = {
  count: number;
  predicates: SessionPredicate[];
};

export function computeRemainingGap(session: InterviewSession): RemainingGap {
  const unsatisfied = session.goal_state.predicates.filter(
    (predicate) => predicate.satisfied !== true,
  );
  return { count: unsatisfied.length, predicates: unsatisfied };
}
