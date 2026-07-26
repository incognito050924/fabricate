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
 * counter alone.
 *
 * Separating the kind is only half of it: the refusal must also be countable.
 * A refusal that only travels back to its immediate caller hands the log
 * onward byte-identical, so nothing downstream can tell a turn was dropped —
 * exactly the silent drop the orphan counter exists to prevent. Each refusal
 * kind therefore has its own counter, and neither is ever incremented for the
 * other's reason. What the terminal failure mode should be (throw, or this
 * counted refusal) is still not settled here; counting it is what makes the
 * choice observable either way.
 *
 * Both counters are incremented undefended: a log arriving without one would
 * produce NaN rather than an error. That is deliberate. The type forbids such a
 * log, nothing in this repo deserializes a turn log, and the defence one would
 * reach for (`?? 0`) silently invents a count of zero for a record that was
 * never a valid log — fail-quiet, in a module whose whole subject is refusing
 * to swallow things silently. The fail-closed answer is a parse boundary for
 * the log itself, which belongs with the goal-state re-wiring, not here.
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
  /** How many fired questions were refused for naming no goal predicate. */
  readonly orphan_rejection_count: number;
  /**
   * How many fired questions were refused because this log's goal state could
   * not be read. Deliberately NOT the orphan counter: those questions may be
   * perfectly well linked, and mixing them in is what made the orphan number
   * report a schema mismatch.
   */
  readonly unreadable_goal_state_rejection_count: number;
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
  return { turns: [], orphan_rejection_count: 0, unreadable_goal_state_rejection_count: 0 };
}

export function createSession(input: { source_request: string }): Session {
  return {
    source_request: input.source_request,
    turns: [],
    orphan_rejection_count: 0,
    unreadable_goal_state_rejection_count: 0,
    delegations: [],
    goal_state: undefined,
  };
}

type UnjudgeableCause = "unreadable" | "no_predicates";

export const UNREADABLE_GOAL_STATE_REASON =
  "이 세션의 goal_state를 읽을 수 없다 — 참조가 목표에 닿는지 판정할 수 없으므로 기록하지 않는다(고아 아님)";

const UNJUDGEABLE_REASON: Record<UnjudgeableCause, string> = {
  unreadable: UNREADABLE_GOAL_STATE_REASON,
  no_predicates: UNREADABLE_GOAL_STATE_REASON,
};

/**
 * What this log's goal state can say about a ref.
 *  - `absent` — no goal state at all, so there is nothing to check against.
 *  - `unjudgeable` — a goal state exists but cannot be judged against, and the
 *    cause says which of the two ways.
 *  - `read` — the ids it names.
 *
 * An EMPTY predicate list joins the `unjudgeable` arm rather than becoming an
 * empty set, and that is a decision rather than a detail. An empty set would
 * refuse every ref as an orphan, which is observationally the very defect that
 * folding parse failures into "orphan" produced: a question that DID name a
 * predicate lands on the counter the contract reserves for questions that named
 * none. A goal state with no predicates is not a goal with nothing in it — the
 * live lens refuses it outright (goal-state.ts's `.min(1)`) and ac-2 clause 5
 * requires `predicates.length > 0` — so it is a defective standard, and the
 * honest report is "this cannot be judged against", not "your ref is wrong".
 *
 * The structural reader stays honest about the distinction (`readPredicateIds`
 * returns `[]`, which truthfully means "names no ids"); collapsing the two into
 * one refusal is a policy this gate owns, not a fact the reader should hide
 * from other callers.
 */
type GoalStateReading =
  | { status: "absent" }
  | { status: "unjudgeable"; cause: UnjudgeableCause }
  | { status: "read"; ids: Set<string> };

function readGoalState(log: TurnLog): GoalStateReading {
  if (log.goal_state === undefined) return { status: "absent" };
  const ids = readPredicateIds(log.goal_state);
  if (ids === null) return { status: "unjudgeable", cause: "unreadable" };
  if (ids.length === 0) return { status: "unjudgeable", cause: "no_predicates" };
  return { status: "read", ids: new Set(ids) };
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

  const goalState = readGoalState(log);
  if (goalState.status === "unjudgeable") {
    // Not an orphan: the ref may well be correct — this module simply cannot
    // tell. The orphan counter stays where it was; this refusal gets its own.
    return {
      recorded: false,
      log: {
        ...log,
        unreadable_goal_state_rejection_count: log.unreadable_goal_state_rejection_count + 1,
      },
      rejection: {
        kind: "unreadable_goal_state",
        reason: UNJUDGEABLE_REASON[goalState.cause],
      },
    };
  }
  if (goalState.status === "read" && !goalState.ids.has(turn.goal_predicate_ref)) {
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
