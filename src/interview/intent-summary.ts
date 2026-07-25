import { type RemainingGap, computeRemainingGap } from "./remaining-gap";
import type {
  AutonomousDecision,
  ConfirmationRecord,
  InterviewSession,
  SessionGoalState,
} from "./session";

/**
 * The intent summary — one render carrying all four surfaces at once: the goal
 * state, what the user confirmed, what is still missing, and what was decided
 * without asking.
 *
 * One render, deliberately. Split across four separate outputs, each is
 * readable and the relation between them is not: how much of the goal stands,
 * how much does not, and how much was settled autonomously in between is
 * exactly the comparison that keeps convergence honest.
 */

export type IntentSummary = {
  goal_state: SessionGoalState;
  confirmed: ConfirmationRecord[];
  remaining_gap: RemainingGap;
  autonomous_decisions: AutonomousDecision[];
};

export function renderIntentSummary(session: InterviewSession): IntentSummary {
  return {
    goal_state: session.goal_state,
    confirmed: [...session.confirmations],
    remaining_gap: computeRemainingGap(session),
    autonomous_decisions: [...session.autonomous_decisions],
  };
}
