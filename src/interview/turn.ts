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
 * A goal state this module cannot READ is a third thing, and it is kept
 * separate on purpose. Folding it into "orphan" made every correctly-linked
 * question of a differently-shaped goal state a rejection and inflated the
 * orphan counter — a number that is supposed to mean "unattached questions
 * were fired" was reporting a schema mismatch instead. So an unreadable goal
 * state refuses the turn under its own rejection kind and leaves the orphan
 * counter alone. What the terminal failure mode should be (throw, or this
 * explicit report) is not settled here.
 *
 * Every operation returns a new log — the caller cannot mutate history in place
 * — and the rest of the session (delegations, goal state) rides through
 * unchanged, because the thing being governed is the session, not a bare list.
 */

import { readPredicateIds } from "./goal-state";
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

/** Refused because the session's goal state could not be read at all. */
export type UnreadableGoalStateRejection = {
  kind: "unreadable_goal_state";
  reason: string;
};

export type FiredTurnRejection = OrphanRejection | UnreadableGoalStateRejection;

export type RecordFiredTurnResult<L extends TurnLog> = {
  recorded: boolean;
  log: L;
  rejection?: FiredTurnRejection;
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

const UNREADABLE_GOAL_STATE =
  "이 세션의 goal_state를 읽을 수 없다 — 참조가 목표에 닿는지 판정할 수 없으므로 기록하지 않는다(고아 아님)";

/**
 * The predicate ids this log's goal state holds.
 *  - `undefined` — no goal state at all, so there is nothing to check against.
 *  - `null` — a goal state exists but cannot be read.
 *  - a set — the ids it names.
 */
function predicateIdsOf(log: TurnLog): Set<string> | null | undefined {
  if (log.goal_state === undefined) return undefined;
  const ids = readPredicateIds(log.goal_state);
  return ids === null ? null : new Set(ids);
}

export function recordFiredTurn<L extends TurnLog>(
  log: L,
  turn: FiredTurnInput,
): RecordFiredTurnResult<L> {
  const rejectAsOrphan = (rejection: OrphanRejection): RecordFiredTurnResult<L> => ({
    recorded: false,
    log: { ...log, orphan_rejection_count: log.orphan_rejection_count + 1 },
    rejection,
  });

  if (!hasGoalLink(turn.goal_predicate_ref)) {
    return rejectAsOrphan(orphanRejection("goal_predicate_ref"));
  }

  const predicateIds = predicateIdsOf(log);
  if (predicateIds === null) {
    // Not an orphan: the ref may well be correct — this module simply cannot
    // tell. The orphan counter stays where it was.
    return {
      recorded: false,
      log,
      rejection: { kind: "unreadable_goal_state", reason: UNREADABLE_GOAL_STATE },
    };
  }
  if (predicateIds !== undefined && !predicateIds.has(turn.goal_predicate_ref)) {
    return rejectAsOrphan(orphanRejection("goal_predicate_ref"));
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
