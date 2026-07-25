/**
 * Acceptance test for ac-3 — orphan blocking (question, dimension, AC),
 * discovery-question qualification (explicit revision target), re-confirmation
 * on adoption, and seed-dimension drop releasing the finalize block.
 *
 * Frozen red: the modules under src/interview/ do not exist yet; the piece-3
 * implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-3.json (oracle_statement clauses 1-6).
 *
 * Clause 5 has two halves and both are machine-checked: the revision resets
 * confirmed to false, AND that reset actually withholds finalize until the
 * goal_state is confirmed again (a decorative confirmed flag that nobody reads
 * must fail here). Clause 4's orphan gate is also wired to the clause 5 adoption
 * path: a discovery question with no revises_goal_predicate cannot revise
 * goal_state by calling the adoption entry point directly.
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 * whether a goal_predicate_ref / revises_goal_predicate token semantically
 * reaches the real goal predicate is human judgment. This file only asserts
 * explicit ref-token presence and deterministic gate routing: reject/approve
 * booleans, the rejection counter, confirmed reset, and finalize block
 * release. No prose is graded.
 */

import { describe, expect, test } from "bun:test";
import { approveDimension, dropDimension } from "../src/interview/dimension";
import { finalizeIntent } from "../src/interview/finalize";
import { adoptDiscoveryQuestion } from "../src/interview/goal-revision";
import { approveDiscoveryQuestion } from "../src/interview/orphan-gate";
import { createTurnLog, recordFiredTurn } from "../src/interview/turn";

const P1_TEXT = "CLI prints an intent summary for the locked criteria";
const P2_TEXT = "the interview log file persists after the session ends";

function makeGoalState(confirmed: boolean) {
  return {
    derived_at: "2026-07-25T09:00:00.000Z",
    confirmed,
    predicates: [
      { id: "p-1", text: P1_TEXT, verification_means: "run the CLI and inspect stdout" },
      { id: "p-2", text: P2_TEXT, verification_means: "stat the log file after exit" },
    ],
  };
}

const coveredCriteria = [
  { id: "ac-x1", statement: "summary renders", goal_predicate_ref: "p-1" },
  { id: "ac-x2", statement: "log persists", goal_predicate_ref: "p-2" },
];

describe("ac-3 clause 1: fired question without goal_predicate_ref is rejected and counted", () => {
  test("rejects the orphan fired question, keeps it out of the log, and increments the rejection counter per rejection", () => {
    const log0 = createTurnLog();
    expect(log0.orphan_rejection_count).toBe(0);

    const first = recordFiredTurn(log0, {
      question_text: "Which output format do you want?",
      asked_at: "2026-07-25T10:00:00.000Z",
    });
    expect(first.recorded).toBe(false);
    expect(first.log.orphan_rejection_count).toBe(1);
    expect(first.log.turns).toHaveLength(0);

    const second = recordFiredTurn(first.log, {
      question_text: "Should errors be retried?",
      asked_at: "2026-07-25T10:01:00.000Z",
    });
    expect(second.recorded).toBe(false);
    expect(second.log.orphan_rejection_count).toBe(2);
    expect(second.log.turns).toHaveLength(0);
  });

  test("records a fired question carrying goal_predicate_ref and does not touch the rejection counter", () => {
    const log0 = createTurnLog();
    const result = recordFiredTurn(log0, {
      question_text: "Which output format do you want for the summary?",
      asked_at: "2026-07-25T10:02:00.000Z",
      goal_predicate_ref: "p-1",
    });
    expect(result.recorded).toBe(true);
    expect(result.log.turns).toHaveLength(1);
    expect(result.log.turns[0]?.goal_predicate_ref).toBe("p-1");
    expect(result.log.orphan_rejection_count).toBe(0);
  });
});

describe("ac-3 clause 2: orphan dimension is not approved", () => {
  test("does not approve a dimension without goal_predicate_ref", () => {
    const orphanDimension = {
      id: "dim-1",
      label: "output format",
      origin: "discovered",
      state: "open",
    };
    expect(approveDimension(orphanDimension).approved).toBe(false);
  });

  test("approves the same dimension once it carries goal_predicate_ref (contrast fixture)", () => {
    const linkedDimension = {
      id: "dim-1",
      label: "output format",
      origin: "discovered",
      state: "open",
      goal_predicate_ref: "p-1",
    };
    expect(approveDimension(linkedDimension).approved).toBe(true);
  });
});

describe("ac-3 clause 4: discovery question must name its revision target", () => {
  test("approves a discovery question that names revises_goal_predicate", () => {
    const result = approveDiscoveryQuestion({
      question_text: "Should the summary also expose the remaining gap?",
      asked_at: "2026-07-25T10:05:00.000Z",
      revises_goal_predicate: "p-1",
    });
    expect(result.approved).toBe(true);
  });

  test("rejects as orphan a discovery question without revises_goal_predicate (contrast fixture)", () => {
    const result = approveDiscoveryQuestion({
      question_text: "Should the summary also expose the remaining gap?",
      asked_at: "2026-07-25T10:05:00.000Z",
    });
    expect(result.approved).toBe(false);
    expect(result.rejection?.kind).toBe("orphan");
  });
});

describe("ac-3 clause 5: adopting a discovery question revises goal_state and forces re-confirmation", () => {
  test("revises the targeted predicate and resets confirmed from true to false", () => {
    const confirmedGoal = makeGoalState(true);
    expect(confirmedGoal.confirmed).toBe(true);

    const revisedText = "CLI prints an intent summary with a remaining-gap section";
    const revised = adoptDiscoveryQuestion(confirmedGoal, {
      question_text: "Should the summary also expose the remaining gap?",
      asked_at: "2026-07-25T10:05:00.000Z",
      revises_goal_predicate: "p-1",
      revised_text: revisedText,
    });

    expect(revised.confirmed).toBe(false);

    const target = revised.predicates.find((p) => p.id === "p-1");
    expect(target?.text).toBe(revisedText);
    expect(target?.text).not.toBe(P1_TEXT);

    const untouched = revised.predicates.find((p) => p.id === "p-2");
    expect(untouched?.text).toBe(P2_TEXT);
  });

  test("the reset withholds finalize until the revised goal_state is confirmed again", () => {
    const revised = adoptDiscoveryQuestion(makeGoalState(true), {
      question_text: "Should the summary also expose the remaining gap?",
      asked_at: "2026-07-25T10:05:00.000Z",
      revises_goal_predicate: "p-1",
      revised_text: "CLI prints an intent summary with a remaining-gap section",
    });
    expect(revised.confirmed).toBe(false);

    const blocked = finalizeIntent({
      goal_state: revised,
      criteria: coveredCriteria,
      dimensions: [],
    });
    expect(blocked.finalized).toBe(false);
    expect(blocked.intent).toBeUndefined();

    const reconfirmed = { ...revised, confirmed: true };
    const released = finalizeIntent({
      goal_state: reconfirmed,
      criteria: coveredCriteria,
      dimensions: [],
    });
    expect(released.finalized).toBe(true);
    expect(released.intent?.criteria.map((c) => c.id)).toEqual(["ac-x1", "ac-x2"]);
  });

  test("an unconfirmed goal_state alone fails finalize closed, with every other input clean", () => {
    const result = finalizeIntent({
      goal_state: makeGoalState(false),
      criteria: coveredCriteria,
      dimensions: [],
    });
    expect(result.finalized).toBe(false);
    expect(result.intent).toBeUndefined();
  });

  test("a discovery question naming no revision target cannot revise goal_state through the adoption path", () => {
    const confirmedGoal = makeGoalState(true);
    let outcome:
      | undefined
      | { confirmed: boolean; predicates: Array<{ id: string; text: string }> };
    let refusedLoudly = false;

    try {
      outcome = adoptDiscoveryQuestion(confirmedGoal, {
        question_text: "Should the summary also expose the remaining gap?",
        asked_at: "2026-07-25T10:06:00.000Z",
        revised_text: "hijacked predicate text",
      });
    } catch {
      refusedLoudly = true;
    }

    // The orphan gate must stop this adoption. Either the call refuses loudly,
    // or it hands back a goal_state whose predicate text and confirmation are
    // both untouched — silently applying the revision is the failure mode.
    if (!refusedLoudly) {
      expect(outcome?.predicates.find((p) => p.id === "p-1")?.text).toBe(P1_TEXT);
      expect(outcome?.confirmed).toBe(true);
    }

    expect(confirmedGoal.predicates.find((p) => p.id === "p-1")?.text).toBe(P1_TEXT);
    expect(confirmedGoal.confirmed).toBe(true);
  });
});

describe("ac-3 clause 3: orphan AC makes finalize fail closed with no intent recorded", () => {
  test("finalizes and records intent when every AC references a goal predicate (contrast fixture)", () => {
    const result = finalizeIntent({
      goal_state: makeGoalState(true),
      criteria: coveredCriteria,
      dimensions: [],
    });
    expect(result.finalized).toBe(true);
    expect(result.intent?.criteria.map((c) => c.id)).toEqual(["ac-x1", "ac-x2"]);
  });

  test("fails closed and records no intent when one AC has no goal_predicate_ref", () => {
    const result = finalizeIntent({
      goal_state: makeGoalState(true),
      criteria: [
        { id: "ac-x1", statement: "summary renders", goal_predicate_ref: "p-1" },
        { id: "ac-x2", statement: "log persists" },
      ],
      dimensions: [],
    });
    expect(result.finalized).toBe(false);
    expect(result.intent).toBeUndefined();
  });
});

describe("ac-3 clause 6: seed dimension blocks finalize until dropped with a reason (2-state)", () => {
  const openSeed = {
    id: "dim-seed-1",
    label: "unaddressed request fragment: log retention",
    origin: "seed",
    state: "open",
  };

  test("a non-dropped seed dimension still blocks finalize", () => {
    const result = finalizeIntent({
      goal_state: makeGoalState(true),
      criteria: coveredCriteria,
      dimensions: [openSeed],
    });
    expect(result.finalized).toBe(false);
    expect(result.intent).toBeUndefined();
  });

  test("dropping the seed dimension with a reason releases the finalize block", () => {
    const dropped = dropDimension(openSeed, "user confirmed log retention is out of scope");
    expect(dropped.state).toBe("dropped");
    expect(dropped.drop_reason).toBe("user confirmed log retention is out of scope");

    const result = finalizeIntent({
      goal_state: makeGoalState(true),
      criteria: coveredCriteria,
      dimensions: [dropped],
    });
    expect(result.finalized).toBe(true);
    expect(result.intent?.criteria).toHaveLength(2);
  });

  test("refuses to drop a dimension without a reason", () => {
    expect(() => dropDimension(openSeed, "")).toThrow();
  });
});
