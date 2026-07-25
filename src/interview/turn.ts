/**
 * The turn log and the session it lives in. A question that has been asked of
 * the user is recorded only if it names the goal predicate it serves; orphan
 * questions are refused and counted, so an interview that keeps firing
 * unattached questions leaves a visible number behind instead of a silent drop.
 *
 * When the session carries a goal state, the named predicate must actually be
 * one of ITS predicates. A ref that resolves nowhere is an orphan wearing a
 * link, and a gate that only checked for a non-empty string would pass it.
 *
 * Every operation returns a new log — the caller cannot mutate history in place
 * — and the rest of the session (delegations, goal state) rides through
 * unchanged, because the thing being governed is the session, not a bare list.
 */

import { parseGoalState } from "./goal-state";
import { type OrphanRejection, hasGoalLink, orphanRejection } from "./orphan-gate";

export type FiredTurnInput = {
  question_text: string;
  asked_at: string;
  goal_predicate_ref?: string;
};

export type FiredQuestionTurn = {
  kind: "fired_question";
  question_text: string;
  asked_at: string;
  goal_predicate_ref: string;
};

export type UserUtteranceTurn = {
  kind: "user_utterance";
  tag: string;
  /** The user's words, byte-for-byte. */
  utterance: string;
};

export type SessionTurn = FiredQuestionTurn | UserUtteranceTurn;

export type TurnLog = {
  readonly turns: readonly SessionTurn[];
  readonly orphan_rejection_count: number;
  /** Present once round 0 has derived one; the orphan gate reads it. */
  readonly goal_state?: unknown;
};

export type Session = TurnLog & {
  source_request: string;
  delegations: unknown[];
};

export type RecordFiredTurnResult<L extends TurnLog> = {
  recorded: boolean;
  log: L;
  rejection?: OrphanRejection;
};

export function createTurnLog(): TurnLog {
  return { turns: [], orphan_rejection_count: 0 };
}

export function createSession(input: { source_request: string }): Session {
  return {
    source_request: input.source_request,
    turns: [],
    orphan_rejection_count: 0,
    delegations: [],
    goal_state: undefined,
  };
}

/** The predicate ids this log's goal state actually holds, if it holds one. */
function predicateIdsOf(log: TurnLog): Set<string> | null {
  if (log.goal_state === undefined) return null;
  try {
    return new Set(parseGoalState(log.goal_state).predicates.map((predicate) => predicate.id));
  } catch {
    // A goal state that does not parse cannot vouch for any ref.
    return new Set<string>();
  }
}

export function recordFiredTurn<L extends TurnLog>(
  log: L,
  turn: FiredTurnInput,
): RecordFiredTurnResult<L> {
  const reject = (rejection: OrphanRejection): RecordFiredTurnResult<L> => ({
    recorded: false,
    log: { ...log, orphan_rejection_count: log.orphan_rejection_count + 1 },
    rejection,
  });

  if (!hasGoalLink(turn.goal_predicate_ref)) {
    return reject(orphanRejection("goal_predicate_ref"));
  }

  const predicateIds = predicateIdsOf(log);
  if (predicateIds !== null && !predicateIds.has(turn.goal_predicate_ref)) {
    return reject(orphanRejection("goal_predicate_ref"));
  }

  const recorded: FiredQuestionTurn = {
    kind: "fired_question",
    question_text: turn.question_text,
    asked_at: turn.asked_at,
    goal_predicate_ref: turn.goal_predicate_ref,
  };
  return {
    recorded: true,
    log: { ...log, turns: [...log.turns, recorded] },
  };
}

export function appendUtteranceTurn<L extends TurnLog>(log: L, turn: UserUtteranceTurn): L {
  return { ...log, turns: [...log.turns, turn] };
}
