/**
 * ac-10h acceptance — Searle plan-admissibility gate. Red-frozen.
 *
 * "A plan is admissible only when its terminal state entails the satisfaction
 * predicates" is enforced as a plan-acceptance-time gate, distinct from the
 * ac-4 completion-time gate. One of the two pure deterministic checks named
 * by §6 — deterministic in content too.
 *
 * Oracle (gate-a/rows/ac-10h.json), covered clauses:
 *  (1) planAdmissibilityGate(plan, goal_state) exists as a plan-acceptance
 *      gate over a structured plan (terminal-state field) and a goal_state
 *      (satisfaction predicate set), and returns admissible=false on both
 *      non-entailing fixtures: one where the terminal state entails none of
 *      the predicates, and one partial-fulfilment fixture where only some
 *      are entailed.
 *  (2) Contrast fixture — on a plan whose terminal state entails every
 *      satisfaction predicate the gate does NOT return admissible=false
 *      (pinning that the gate is not always-false).
 *  (3) The plan|=predicate check is purely deterministic: identical
 *      (plan, goal_state) inputs always yield the identical verdict, and the
 *      verdict is exactly the entailment check between the structured
 *      terminal state and the predicate set — no prose grading and no LLM
 *      judgment (rewording prose fields never changes the verdict; changing
 *      the structured terminal state does; the verdict agrees with direct
 *      evaluatePlanEntailment evaluation; the result is synchronous).
 *  (4) Distinction from ac-4, with two fixtures:
 *      (i) plan-acceptance-time fixture — planAdmissibilityGate judges from
 *          (plan, goal_state) alone, with no completion input, before any
 *          execution or completion (declared arity is exactly 2);
 *      (ii) completion-time fixture — ac-4's goalStateGate(item, completion)
 *          is a separate export with a separate input signature judging at
 *          completion time, and planAdmissibilityGate returning
 *          admissible=false neither replaces nor transforms goalStateGate's
 *          completion verdict (separate moments, separate gates).
 *
 * Residual: none. The row's residual list is empty — the contract declares
 * the plan|=predicate check deterministic in content as well, so every
 * clause of the oracle is asserted here.
 *
 * The modules imported below are planned in gate-a/rows/ac-10h.json
 * module_plan (plus ac-4's goal-state-gate, a declared dependency) and do
 * not exist yet; this file must fail red until piece 3 implements them.
 */
import { describe, expect, test } from "bun:test";
import { goalStateGate } from "../src/interview/goal-state-gate";
import { planAdmissibilityGate } from "../src/interview/plan-admissibility-gate";
import { evaluatePlanEntailment } from "../src/interview/plan-entailment";
import { planSchema } from "../src/interview/plan-schema";

// --- goal_state fixture: a set of structured satisfaction predicates --------
// Entailment predicates are structured data over the plan's terminal state
// (same deterministic predicate family the reading pass emits), never prose.

const legacyEmptyPredicate = {
  kind: "set_empty",
  path: "files_at_legacy_path",
} as const;

const todosEmptyPredicate = {
  kind: "set_empty",
  path: "unresolved_todos",
} as const;

const goalState = {
  derived_at: "2026-07-25T09:00:00.000Z",
  confirmed: true,
  predicates: [
    {
      id: "p-legacy-empty",
      statement: "no util file remains under the legacy path",
      verification_means: "entailment check over the plan's structured terminal state",
      judge: "oracle",
      entailment: legacyEmptyPredicate,
    },
    {
      id: "p-todos-empty",
      statement: "no migration todo remains unresolved",
      verification_means: "entailment check over the plan's structured terminal state",
      judge: "oracle",
      entailment: todosEmptyPredicate,
    },
  ],
} as const;

// --- plan fixtures: structured plans with a terminal-state field ------------

// Terminal state entails every satisfaction predicate.
const fullyEntailingPlan = {
  plan_id: "plan-ac10h-entails-all",
  steps: [
    "move date.ts to the shared path",
    "move format.ts to the shared path",
    "move parse.ts to the shared path",
    "resolve todo-1",
  ],
  terminal_state: { files_at_legacy_path: [], unresolved_todos: [] },
} as const;

// Partial fulfilment: the first predicate is entailed, the second is not.
const partiallyEntailingPlan = {
  plan_id: "plan-ac10h-partial",
  steps: [
    "move date.ts to the shared path",
    "move format.ts to the shared path",
    "move parse.ts to the shared path",
  ],
  terminal_state: { files_at_legacy_path: [], unresolved_todos: ["todo-1"] },
} as const;

// The terminal state entails none of the satisfaction predicates.
const nonEntailingPlan = {
  plan_id: "plan-ac10h-none",
  steps: ["move date.ts to the shared path"],
  terminal_state: {
    files_at_legacy_path: ["format.ts", "parse.ts"],
    unresolved_todos: ["todo-1"],
  },
} as const;

const allPlans = [fullyEntailingPlan, partiallyEntailingPlan, nonEntailingPlan] as const;

// --- ac-4 completion-time fixtures (item + completion, ac-4 signature) ------

const completedItem = {
  id: "wi-ac10h-completed",
  goal_state: goalState,
  oracle_satisfaction: [
    {
      predicate_id: "p-legacy-empty",
      satisfied: true,
      checked_at: "2026-07-25T10:00:00.000Z",
    },
    {
      predicate_id: "p-todos-empty",
      satisfied: true,
      checked_at: "2026-07-25T10:00:00.000Z",
    },
  ],
  user_judgments: [],
} as const;

const passingCompletion = {
  contract_id: "cc-ac10h-pass",
  criteria: [{ id: "cc-1", status: "pass", evidence: ["test"] }],
} as const;

// --- Tests -------------------------------------------------------------------

describe("ac-10h clause 1 — the plan-acceptance gate rejects non-entailing terminal states", () => {
  test("plans are structured with a terminal-state field: the schema keeps it verbatim and rejects a plan without one", () => {
    const parsed = planSchema.parse(fullyEntailingPlan);
    expect(parsed.terminal_state).toEqual({
      files_at_legacy_path: [],
      unresolved_todos: [],
    });

    const { terminal_state: _dropped, ...planWithoutTerminalState } = fullyEntailingPlan;
    expect(planSchema.safeParse(planWithoutTerminalState).success).toBe(false);
  });

  test("a plan whose terminal state entails none of the predicates is admissible=false", () => {
    // Pin the fixture's character with the structured entailment check itself.
    expect(evaluatePlanEntailment(legacyEmptyPredicate, nonEntailingPlan.terminal_state)).toBe(
      false,
    );
    expect(evaluatePlanEntailment(todosEmptyPredicate, nonEntailingPlan.terminal_state)).toBe(
      false,
    );

    expect(planAdmissibilityGate(nonEntailingPlan, goalState).admissible).toBe(false);
  });

  test("a partial-fulfilment plan (some but not all predicates entailed) is admissible=false", () => {
    expect(
      evaluatePlanEntailment(legacyEmptyPredicate, partiallyEntailingPlan.terminal_state),
    ).toBe(true);
    expect(evaluatePlanEntailment(todosEmptyPredicate, partiallyEntailingPlan.terminal_state)).toBe(
      false,
    );

    expect(planAdmissibilityGate(partiallyEntailingPlan, goalState).admissible).toBe(false);
  });
});

describe("ac-10h clause 2 — contrast: a fully entailing plan is not rejected", () => {
  test("when the terminal state entails every satisfaction predicate, the verdict is not admissible=false", () => {
    expect(evaluatePlanEntailment(legacyEmptyPredicate, fullyEntailingPlan.terminal_state)).toBe(
      true,
    );
    expect(evaluatePlanEntailment(todosEmptyPredicate, fullyEntailingPlan.terminal_state)).toBe(
      true,
    );

    const verdict = planAdmissibilityGate(fullyEntailingPlan, goalState);
    expect(verdict.admissible).not.toBe(false);
    expect(verdict.admissible).toBe(true);
  });
});

describe("ac-10h clause 3 — the plan|=predicate check is purely deterministic, content included", () => {
  test("identical (plan, goal_state) inputs always yield the identical verdict", () => {
    for (const plan of allPlans) {
      const first = planAdmissibilityGate(plan, goalState);
      const second = planAdmissibilityGate(plan, goalState);
      const third = planAdmissibilityGate(plan, goalState);
      expect(second).toEqual(first);
      expect(third).toEqual(first);
    }
  });

  test("the verdict is exactly the conjunction of structured entailment checks over the predicate set", () => {
    for (const plan of allPlans) {
      const expected = goalState.predicates.every((predicate) =>
        evaluatePlanEntailment(predicate.entailment, plan.terminal_state),
      );
      expect(planAdmissibilityGate(plan, goalState).admissible).toBe(expected);
    }
  });

  test("rewording every prose field never changes the verdict — no prose grading, no LLM judgment", () => {
    const rewordedGoalState = {
      ...goalState,
      predicates: goalState.predicates.map((predicate) => ({
        ...predicate,
        statement: `completely different prose: ${predicate.statement}`,
        verification_means: "reworded prose that a grader would score differently",
      })),
    };

    expect(planAdmissibilityGate(partiallyEntailingPlan, rewordedGoalState).admissible).toBe(false);
    expect(planAdmissibilityGate(fullyEntailingPlan, rewordedGoalState).admissible).toBe(true);
  });

  test("changing the structured terminal state is what flips the verdict", () => {
    const regressedPlan = {
      ...fullyEntailingPlan,
      terminal_state: { files_at_legacy_path: ["parse.ts"], unresolved_todos: [] },
    };

    expect(planAdmissibilityGate(fullyEntailingPlan, goalState).admissible).toBe(true);
    expect(planAdmissibilityGate(regressedPlan, goalState).admissible).toBe(false);
  });

  test("the verdict is synchronous structured data, not a deferred (LLM-shaped) judgment", () => {
    const verdict = planAdmissibilityGate(nonEntailingPlan, goalState);
    expect(verdict).not.toBeInstanceOf(Promise);
    expect(typeof verdict.admissible).toBe("boolean");
  });
});

describe("ac-10h clause 4 — plan-acceptance moment vs ac-4 completion moment (two fixtures)", () => {
  test("(i) plan-acceptance fixture: the gate judges from (plan, goal_state) alone, before execution, with no completion input", () => {
    // Declared signature takes exactly the two pre-execution inputs —
    // there is no completion parameter to pass.
    expect(planAdmissibilityGate.length).toBe(2);

    // The judgment succeeds from the plan and goal_state alone; the fixtures
    // carry no completion contract and no execution record.
    const verdict = planAdmissibilityGate(nonEntailingPlan, goalState);
    expect(verdict.admissible).toBe(false);
    expect(Object.hasOwn(nonEntailingPlan, "completion")).toBe(false);
    expect(Object.hasOwn(goalState, "completion")).toBe(false);
  });

  test("(ii) completion fixture: goalStateGate is a separate export with a separate input signature", () => {
    expect(typeof goalStateGate).toBe("function");
    expect(goalStateGate).not.toBe(planAdmissibilityGate);

    // Separate signatures and separate verdict vocabularies: the completion
    // gate reads (item, completion) and answers pass; the plan gate reads
    // (plan, goal_state) and answers admissible.
    const completionVerdict = goalStateGate(completedItem, passingCompletion);
    const planVerdict = planAdmissibilityGate(nonEntailingPlan, goalState);
    expect(Object.hasOwn(completionVerdict, "pass")).toBe(true);
    expect(Object.hasOwn(planVerdict, "admissible")).toBe(true);
  });

  test("(ii) admissible=false neither replaces nor transforms the completion verdict", () => {
    const baseline = goalStateGate(completedItem, passingCompletion);
    expect(baseline.pass).toBe(true);

    // The plan-acceptance gate rejects a plan for the very same goal_state...
    expect(planAdmissibilityGate(nonEntailingPlan, goalState).admissible).toBe(false);

    // ...and the completion-time verdict is untouched: same gate, same
    // inputs, same verdict — separate moments, separate gates.
    const after = goalStateGate(completedItem, passingCompletion);
    expect(after.pass).toBe(true);
    expect(after).toEqual(baseline);
  });
});
