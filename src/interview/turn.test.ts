import { describe, expect, test } from "bun:test";
import { createSession, createTurnLog, recordFiredTurn } from "./turn";

/**
 * The turn log's refusal counters.
 *
 * A refused turn must leave a number behind. That is already the stated reason
 * `orphan_rejection_count` exists — "an interview that keeps firing unattached
 * questions leaves a visible number behind instead of a silent drop" — and the
 * refusal added for an unreadable goal state was returning a rejection to its
 * immediate caller while handing back a log that was byte-identical to the one
 * it was given. Nothing downstream of the call could tell that a turn had been
 * refused at all.
 *
 * These tests pin two things at once: that the new refusal is counted, and that
 * the two counters never bleed into each other. The bleed is the exact defect
 * the separate rejection kind was introduced to fix, so it is asserted in both
 * directions rather than only the one that was broken.
 */

const UNREADABLE_GOAL_STATE = { derived_at: "2026-07-25T09:00:00.000Z" };
const EMPTY_GOAL_STATE = { derived_at: "2026-07-25T09:00:00.000Z", predicates: [] };
const READABLE_GOAL_STATE = {
  derived_at: "2026-07-25T09:00:00.000Z",
  predicates: [{ id: "p-1" }],
};

const QUESTION = {
  question_text: "출력 형식을 무엇으로 할까요?",
  asked_at: "2026-07-25T10:00:00.000Z",
  goal_predicate_ref: "p-1",
};

describe("turn log: refusal counters start at zero", () => {
  test("a fresh turn log counts no refusal of either kind", () => {
    const log = createTurnLog();
    expect(log.orphan_rejection_count).toBe(0);
    expect(log.unreadable_goal_state_rejection_count).toBe(0);
  });

  test("a fresh session counts no refusal of either kind", () => {
    const session = createSession({ source_request: "받은 편지함을 정리해줘" });
    expect(session.orphan_rejection_count).toBe(0);
    expect(session.unreadable_goal_state_rejection_count).toBe(0);
  });
});

describe("turn log: an unreadable goal state refuses the turn and says so in the log", () => {
  test("the refusal is counted under its own kind and leaves the orphan counter alone", () => {
    const log = { ...createTurnLog(), goal_state: UNREADABLE_GOAL_STATE };

    const result = recordFiredTurn(log, QUESTION);

    expect(result.recorded).toBe(false);
    expect(result.rejection?.kind).toBe("unreadable_goal_state");
    expect(result.log.turns).toHaveLength(0);
    expect(result.log.unreadable_goal_state_rejection_count).toBe(1);
    expect(result.log.orphan_rejection_count).toBe(0);
  });

  test("the returned log differs from the one handed in — the refusal is observable", () => {
    const log = { ...createTurnLog(), goal_state: UNREADABLE_GOAL_STATE };

    const result = recordFiredTurn(log, QUESTION);

    expect(result.log).not.toEqual(log);
    // The input is not mutated: history is only ever replaced, never edited.
    expect(log.unreadable_goal_state_rejection_count).toBe(0);
  });

  test("repeated refusals accumulate rather than collapsing into one", () => {
    const first = recordFiredTurn(
      { ...createTurnLog(), goal_state: UNREADABLE_GOAL_STATE },
      QUESTION,
    );
    const second = recordFiredTurn(first.log, {
      ...QUESTION,
      asked_at: "2026-07-25T10:01:00.000Z",
    });

    expect(second.recorded).toBe(false);
    expect(second.log.unreadable_goal_state_rejection_count).toBe(2);
    expect(second.log.orphan_rejection_count).toBe(0);
    expect(second.log.turns).toHaveLength(0);
  });

  test("the rest of the session rides through the refusal unchanged", () => {
    const session = {
      ...createSession({ source_request: "받은 편지함을 정리해줘" }),
      goal_state: UNREADABLE_GOAL_STATE,
      delegations: [{ kind: "explicit_skip" }],
    };

    const result = recordFiredTurn(session, QUESTION);

    expect(result.log.delegations).toHaveLength(1);
    expect(result.log.goal_state).toBe(UNREADABLE_GOAL_STATE);
    expect(result.log.source_request).toBe("받은 편지함을 정리해줘");
  });
});

/**
 * A goal state holding an EMPTY predicate list is treated as unreadable, not as
 * a state against which every ref is an orphan. It is not a state this gate can
 * judge a ref against: the live lens refuses it outright (goal-state.ts's
 * `.min(1)`) and ac-2 clause 5 requires `predicates.length > 0` of any session's
 * goal state, so it is a defective state rather than a goal with nothing in it.
 * Counting it as an orphan would put a question that DID name a predicate onto
 * the counter the contract defines as "fired questions carrying no
 * goal_predicate_ref" — the same corruption, by a different cause, that folding
 * parse failures into the orphan counter used to produce.
 */
describe("turn log: an empty predicate list is unreadable, not universally orphaning", () => {
  test("a linked question against an empty predicate list is refused as unreadable", () => {
    const log = { ...createTurnLog(), goal_state: EMPTY_GOAL_STATE };

    const result = recordFiredTurn(log, QUESTION);

    expect(result.recorded).toBe(false);
    expect(result.rejection?.kind).toBe("unreadable_goal_state");
    expect(result.log.unreadable_goal_state_rejection_count).toBe(1);
    expect(result.log.orphan_rejection_count).toBe(0);
    expect(result.log.turns).toHaveLength(0);
  });

  test("a question naming NO predicate is still an orphan even against an empty list", () => {
    // The missing-ref gate keeps priority: ac-3 clause 1 owns this case, and no
    // defect of the goal state may take a ref-less question off that counter.
    const log = { ...createTurnLog(), goal_state: EMPTY_GOAL_STATE };

    const result = recordFiredTurn(log, {
      question_text: "출력 형식을 무엇으로 할까요?",
      asked_at: "2026-07-25T10:00:00.000Z",
    });

    expect(result.rejection?.kind).toBe("orphan");
    expect(result.log.orphan_rejection_count).toBe(1);
    expect(result.log.unreadable_goal_state_rejection_count).toBe(0);
  });

  test("the line sits at exactly zero predicates: one predicate is judged normally", () => {
    const empty = recordFiredTurn({ ...createTurnLog(), goal_state: EMPTY_GOAL_STATE }, QUESTION);
    const one = recordFiredTurn({ ...createTurnLog(), goal_state: READABLE_GOAL_STATE }, QUESTION);

    expect(empty.rejection?.kind).toBe("unreadable_goal_state");
    expect(one.recorded).toBe(true);
  });
});

describe("turn log: the two refusal counters do not bleed into each other", () => {
  test("an orphan question leaves the unreadable counter alone", () => {
    const result = recordFiredTurn(createTurnLog(), {
      question_text: "출력 형식을 무엇으로 할까요?",
      asked_at: "2026-07-25T10:00:00.000Z",
    });

    expect(result.rejection?.kind).toBe("orphan");
    expect(result.log.orphan_rejection_count).toBe(1);
    expect(result.log.unreadable_goal_state_rejection_count).toBe(0);
  });

  test("a ref naming no predicate of a READABLE goal state is an orphan, not unreadable", () => {
    const log = { ...createTurnLog(), goal_state: READABLE_GOAL_STATE };

    const result = recordFiredTurn(log, { ...QUESTION, goal_predicate_ref: "p-99" });

    expect(result.rejection?.kind).toBe("orphan");
    expect(result.log.orphan_rejection_count).toBe(1);
    expect(result.log.unreadable_goal_state_rejection_count).toBe(0);
  });

  test("a recorded turn touches neither counter", () => {
    const log = { ...createTurnLog(), goal_state: READABLE_GOAL_STATE };

    const result = recordFiredTurn(log, QUESTION);

    expect(result.recorded).toBe(true);
    expect(result.log.turns).toHaveLength(1);
    expect(result.log.orphan_rejection_count).toBe(0);
    expect(result.log.unreadable_goal_state_rejection_count).toBe(0);
  });
});
