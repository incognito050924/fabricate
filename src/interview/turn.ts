/**
 * The fired-turn log. A question that has been asked of the user is recorded
 * only if it names the goal predicate it serves; orphan questions are refused
 * and counted, so an interview that keeps firing unattached questions leaves a
 * visible number behind instead of a silent drop.
 *
 * Every operation returns a new log — the caller cannot mutate history in place.
 */

import { type OrphanRejection, hasGoalLink, orphanRejection } from "./orphan-gate";

export type FiredTurnInput = {
  question_text: string;
  asked_at: string;
  goal_predicate_ref?: string;
};

export type RecordedTurn = {
  question_text: string;
  asked_at: string;
  goal_predicate_ref: string;
};

export type TurnLog = {
  readonly turns: readonly RecordedTurn[];
  readonly orphan_rejection_count: number;
};

export type RecordFiredTurnResult = {
  recorded: boolean;
  log: TurnLog;
  rejection?: OrphanRejection;
};

export function createTurnLog(): TurnLog {
  return { turns: [], orphan_rejection_count: 0 };
}

export function recordFiredTurn(log: TurnLog, turn: FiredTurnInput): RecordFiredTurnResult {
  if (!hasGoalLink(turn.goal_predicate_ref)) {
    return {
      recorded: false,
      log: {
        turns: log.turns,
        orphan_rejection_count: log.orphan_rejection_count + 1,
      },
      rejection: orphanRejection("goal_predicate_ref"),
    };
  }

  const recorded: RecordedTurn = {
    question_text: turn.question_text,
    asked_at: turn.asked_at,
    goal_predicate_ref: turn.goal_predicate_ref,
  };
  return {
    recorded: true,
    log: {
      turns: [...log.turns, recorded],
      orphan_rejection_count: log.orphan_rejection_count,
    },
  };
}
