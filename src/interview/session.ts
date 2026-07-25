/**
 * The interview session as the summary reads it: the goal state that governs,
 * what the user has confirmed, and the decisions taken without them. Keeping
 * the three in one record is what makes a single render of all of them
 * possible — convergence is only visible if the same snapshot shows how far
 * the goal has come and what was decided on the way.
 */

export type SessionPredicate = {
  id: string;
  statement: string;
  verification_means: string;
  /** Whether the world-condition this predicate names is established yet. */
  satisfied: boolean;
};

export type SessionGoalState = {
  derived_at: string;
  confirmed: boolean;
  predicates: SessionPredicate[];
};

export type ConfirmationRecord = {
  predicate_id: string;
  /** The user's own words of confirmation — kept, not summarized. */
  utterance: string;
  confirmed_at: string;
};

export type AutonomousDecision = {
  decided_at: string;
  description: string;
  fork_class: string;
};

export type InterviewSession = {
  source_request: string;
  goal_state: SessionGoalState;
  confirmations: ConfirmationRecord[];
  autonomous_decisions: AutonomousDecision[];
};

export function createInterviewSession(input: InterviewSession): InterviewSession {
  return {
    source_request: input.source_request,
    goal_state: input.goal_state,
    confirmations: [...input.confirmations],
    autonomous_decisions: [...input.autonomous_decisions],
  };
}
