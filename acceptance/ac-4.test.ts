/**
 * Acceptance test for ac-4 — completion is judged as "goal establishment".
 *
 * Frozen red test (piece 2). The modules imported below are planned in
 * gate-a/rows/ac-4.json module_plan and do not exist yet; this file must fail
 * red until piece 3 implements them. The assertions here are the completion
 * definition for ac-4 — including the exported names, the accepted/rejected
 * shapes of the persisted schemas, and the verdict vocabulary.
 *
 * Oracle clause (6), "the whole bun test suite is green (exit 0)", is
 * discharged by the row's method ("run" over the whole suite), not by an
 * in-file assertion; it is not listed as residual and is not weakened here.
 *
 * Residual clauses NOT tested here (per gate-a/rows/ac-4.json residual):
 * - The orchestration that obtains a real user's judgment for judge:'user'
 *   predicates is out of scope (autopilot completion-stage concern). This file
 *   only closes the aggregation rule with fixtures: no judgment record means
 *   unverified (default-deny, close blocked); a recorded judgment lifts it.
 * - The substantive correctness of satisfaction judgments is out of scope.
 *   Judgments are held by oracleSatisfaction / user-judgment records and the
 *   gate is a pure reader, so fixtures pin the judgment values and the tests
 *   assert only the gate's reading and blocking behavior — not whether the
 *   pinned judgments are right.
 */

import { describe, expect, test } from "bun:test";

import { closeStop } from "../src/interview/close/stop";
import { closeWork } from "../src/interview/close/work";
import { evaluateCompletionContract } from "../src/interview/completion-contract";
// `persistedWorkItemSchema` is the storage-level record schema that carries
// goal_state as a member field — clause 5's "goal_state is part of the
// persisted schema" half. It lives with the goal-state module because
// module_plan defines no separate work-item module.
import { goalStateSchema, persistedWorkItemSchema } from "../src/interview/goal-state";
import { goalStateGate } from "../src/interview/goal-state-gate";
import { oracleSatisfactionRecordSchema } from "../src/interview/oracle-satisfaction";
import { userJudgmentRecordSchema } from "../src/interview/user-judgment";

// --- Fixtures ---------------------------------------------------------------

const passingCompletion = {
  contract_id: "cc-ac4-pass",
  criteria: [
    { id: "cc-1", status: "pass", evidence: ["test"] },
    { id: "cc-2", status: "pass", evidence: ["test"] },
  ],
};

const failingCompletion = {
  contract_id: "cc-ac4-fail",
  criteria: [
    { id: "cc-1", status: "pass", evidence: ["test"] },
    { id: "cc-2", status: "fail", evidence: [] },
  ],
};

const goalStateWithUnsatisfiedPredicate = {
  derived_at: "2026-07-25T09:00:00.000Z",
  confirmed: true,
  predicates: [
    {
      id: "p-oracle-satisfied",
      statement: "acceptance test file exists and runs under bun test",
      verification_means: "bun test acceptance/ac-4.test.ts",
      judge: "oracle",
    },
    {
      id: "p-oracle-unsatisfied",
      statement: "goal-state gate blocks close while a predicate is unsatisfied",
      verification_means: "bun test acceptance/ac-4.test.ts (gate fixtures)",
      judge: "oracle",
    },
  ],
};

const itemWithUnsatisfiedPredicate = {
  id: "wi-ac4-unsatisfied",
  goal_state: goalStateWithUnsatisfiedPredicate,
  oracle_satisfaction: [
    {
      predicate_id: "p-oracle-satisfied",
      satisfied: true,
      checked_at: "2026-07-25T10:00:00.000Z",
    },
    {
      predicate_id: "p-oracle-unsatisfied",
      satisfied: false,
      checked_at: "2026-07-25T10:00:00.000Z",
    },
  ],
  user_judgments: [],
};

const itemWithoutGoalState = {
  id: "wi-ac4-no-goal-state",
  oracle_satisfaction: [],
  user_judgments: [],
};

const userGoalState = {
  derived_at: "2026-07-25T09:00:00.000Z",
  confirmed: true,
  predicates: [
    {
      id: "p-oracle-green",
      statement: "oracle-judged predicate, already verified",
      verification_means: "bun test acceptance/ac-4.test.ts",
      judge: "oracle",
    },
    {
      id: "p-user-approves",
      statement: "user confirms the rendered summary matches their intent",
      verification_means: "recorded user judgment on this predicate",
      judge: "user",
    },
  ],
};

const itemAwaitingUserJudgment = {
  id: "wi-ac4-user-pending",
  goal_state: userGoalState,
  oracle_satisfaction: [
    {
      predicate_id: "p-oracle-green",
      satisfied: true,
      checked_at: "2026-07-25T10:00:00.000Z",
    },
  ],
  user_judgments: [],
};

const userJudgmentRecord = {
  predicate_id: "p-user-approves",
  verdict: "satisfied",
  judged_at: "2026-07-25T11:00:00.000Z",
};

const rejectingUserJudgmentRecord = {
  predicate_id: "p-user-approves",
  verdict: "unsatisfied",
  judged_at: "2026-07-25T11:00:00.000Z",
};

const itemWithUserJudgment = {
  ...structuredClone(itemAwaitingUserJudgment),
  id: "wi-ac4-user-judged",
  user_judgments: [userJudgmentRecord],
};

const itemWithRejectingUserJudgment = {
  ...structuredClone(itemAwaitingUserJudgment),
  id: "wi-ac4-user-rejected",
  user_judgments: [rejectingUserJudgmentRecord],
};

// --- Tests -------------------------------------------------------------------

describe("ac-4: completion is judged as goal establishment", () => {
  describe("clause 1: unsatisfied predicate blocks close even when the completion contract passes", () => {
    test("goalStateGate(item, completion) fails separately from the passing completion contract", () => {
      expect(evaluateCompletionContract(passingCompletion).pass).toBe(true);
      const gate = goalStateGate(itemWithUnsatisfiedPredicate, passingCompletion);
      expect(gate.pass).toBe(false);
      expect(gate.reasons.length).toBeGreaterThan(0);
      expect(gate.reasons.some((reason: string) => reason.includes("p-oracle-unsatisfied"))).toBe(
        true,
      );
      // the satisfied predicate must NOT be named as a blocker
      expect(gate.reasons.some((reason: string) => reason.includes("p-oracle-satisfied"))).toBe(
        false,
      );
    });

    test("work close path is blocked by the goal-state gate", () => {
      const result = closeWork(itemWithUnsatisfiedPredicate, passingCompletion);
      expect(result.closed).toBe(false);
      expect(result.blocked_by).toBe("goal_state_gate");
    });

    test("stop close path is blocked by the goal-state gate", () => {
      const result = closeStop(itemWithUnsatisfiedPredicate, passingCompletion);
      expect(result.closed).toBe(false);
      expect(result.blocked_by).toBe("goal_state_gate");
    });
  });

  describe("clause 2: completion-contract pass invariant is regression-guarded", () => {
    test("the canonical passing completion input still evaluates to pass", () => {
      expect(evaluateCompletionContract(passingCompletion).pass).toBe(true);
    });

    test("a failing completion input still evaluates to fail (evaluation is not vacuous)", () => {
      expect(evaluateCompletionContract(failingCompletion).pass).toBe(false);
    });

    test("a failing completion contract still blocks close on both paths, independent of goal_state", () => {
      const work = closeWork(itemWithoutGoalState, failingCompletion);
      const stop = closeStop(itemWithoutGoalState, failingCompletion);
      expect(work.closed).toBe(false);
      expect(work.blocked_by).toBe("completion_contract");
      expect(stop.closed).toBe(false);
      expect(stop.blocked_by).toBe("completion_contract");
    });
  });

  describe("clause 3: absent goal_state makes the gate a no-op", () => {
    test("goalStateGate returns pass:true with empty reasons when goal_state is absent", () => {
      const gate = goalStateGate(itemWithoutGoalState, passingCompletion);
      expect(gate.pass).toBe(true);
      expect(gate.reasons).toEqual([]);
    });

    test("close proceeds as before on both paths", () => {
      const work = closeWork(itemWithoutGoalState, passingCompletion);
      const stop = closeStop(itemWithoutGoalState, passingCompletion);
      expect(work.closed).toBe(true);
      expect(work.blocked_by).toBe(null);
      expect(stop.closed).toBe(true);
      expect(stop.blocked_by).toBe(null);
    });
  });

  describe("clause 4: judge:'user' predicates default-deny without a judgment record", () => {
    test("a user-judged predicate without a judgment record counts as unverified and blocks close", () => {
      const gate = goalStateGate(itemAwaitingUserJudgment, passingCompletion);
      expect(gate.pass).toBe(false);
      expect(gate.reasons.some((reason: string) => reason.includes("p-user-approves"))).toBe(true);
      expect(closeWork(itemAwaitingUserJudgment, passingCompletion).closed).toBe(false);
      expect(closeStop(itemAwaitingUserJudgment, passingCompletion).closed).toBe(false);
    });

    test("adding the user judgment record lifts the block", () => {
      const gate = goalStateGate(itemWithUserJudgment, passingCompletion);
      expect(gate.pass).toBe(true);
      expect(gate.reasons).toEqual([]);
      const work = closeWork(itemWithUserJudgment, passingCompletion);
      const stop = closeStop(itemWithUserJudgment, passingCompletion);
      expect(work.closed).toBe(true);
      expect(work.blocked_by).toBe(null);
      expect(stop.closed).toBe(true);
      expect(stop.blocked_by).toBe(null);
    });

    test("a judgment record whose verdict is 'unsatisfied' does NOT lift the block (the verdict is read, not the record's presence)", () => {
      const gate = goalStateGate(itemWithRejectingUserJudgment, passingCompletion);
      expect(gate.pass).toBe(false);
      expect(gate.reasons.some((reason: string) => reason.includes("p-user-approves"))).toBe(true);
      expect(closeWork(itemWithRejectingUserJudgment, passingCompletion).blocked_by).toBe(
        "goal_state_gate",
      );
      expect(closeStop(itemWithRejectingUserJudgment, passingCompletion).blocked_by).toBe(
        "goal_state_gate",
      );
    });
  });

  describe("clause 5a: goal_state is a persistent field of the stored work-item record", () => {
    test("goalStateSchema accepts the canonical goal_state and survives a JSON round-trip verbatim", () => {
      const parsed = goalStateSchema.parse(goalStateWithUnsatisfiedPredicate);
      expect(parsed).toEqual(goalStateWithUnsatisfiedPredicate);
      const reparsed = goalStateSchema.parse(JSON.parse(JSON.stringify(parsed)));
      expect(reparsed).toEqual(goalStateWithUnsatisfiedPredicate);
    });

    test("goalStateSchema rejects a goal_state without predicates", () => {
      const { predicates: _dropped, ...withoutPredicates } = goalStateWithUnsatisfiedPredicate;
      expect(() => goalStateSchema.parse(withoutPredicates)).toThrow();
    });

    test("goalStateSchema rejects a predicate missing its judge", () => {
      expect(() =>
        goalStateSchema.parse({
          ...goalStateWithUnsatisfiedPredicate,
          predicates: [
            {
              id: "p-no-judge",
              statement: "a predicate with no judge assigned",
              verification_means: "none",
            },
          ],
        }),
      ).toThrow();
    });

    test("goalStateSchema pins the judge vocabulary to oracle|user", () => {
      expect(() =>
        goalStateSchema.parse({
          ...goalStateWithUnsatisfiedPredicate,
          predicates: [
            {
              id: "p-bad-judge",
              statement: "a predicate judged by nobody in particular",
              verification_means: "none",
              judge: "maybe",
            },
          ],
        }),
      ).toThrow();
      expect(goalStateSchema.parse(userGoalState)).toEqual(userGoalState);
    });

    test("goalStateSchema rejects a non-ISO derived_at and a non-boolean confirmed", () => {
      expect(() =>
        goalStateSchema.parse({ ...goalStateWithUnsatisfiedPredicate, derived_at: "yesterday" }),
      ).toThrow();
      expect(() =>
        goalStateSchema.parse({ ...goalStateWithUnsatisfiedPredicate, confirmed: "yes" }),
      ).toThrow();
    });

    test("the persisted work-item schema carries goal_state as a member field and preserves it verbatim", () => {
      const parsedItem = persistedWorkItemSchema.parse(itemWithUnsatisfiedPredicate);
      expect(parsedItem.goal_state).toEqual(goalStateWithUnsatisfiedPredicate);
      const roundTripped = persistedWorkItemSchema.parse(
        JSON.parse(JSON.stringify(parsedItem)),
      ) as typeof itemWithUnsatisfiedPredicate;
      expect(roundTripped.goal_state).toEqual(goalStateWithUnsatisfiedPredicate);
      expect(roundTripped).toEqual(itemWithUnsatisfiedPredicate);
    });

    test("the persisted work-item schema validates the goal_state member (a malformed goal_state is refused)", () => {
      expect(() =>
        persistedWorkItemSchema.parse({
          ...itemWithUnsatisfiedPredicate,
          goal_state: { derived_at: "2026-07-25T09:00:00.000Z", confirmed: true },
        }),
      ).toThrow();
      expect(() =>
        persistedWorkItemSchema.parse({
          ...itemWithUnsatisfiedPredicate,
          oracle_satisfaction: [{ predicate_id: "p-oracle-satisfied", satisfied: "true" }],
        }),
      ).toThrow();
    });

    test("goal_state is optional in storage, and an item parsed from storage drives the gate identically", () => {
      const parsedWithout = persistedWorkItemSchema.parse(itemWithoutGoalState);
      expect(goalStateGate(parsedWithout, passingCompletion).pass).toBe(true);
      const parsedWith = persistedWorkItemSchema.parse(itemWithUnsatisfiedPredicate);
      const gate = goalStateGate(parsedWith, passingCompletion);
      expect(gate.pass).toBe(false);
      expect(gate.reasons.some((reason: string) => reason.includes("p-oracle-unsatisfied"))).toBe(
        true,
      );
    });
  });

  describe("clause 5b: satisfaction judgments live in their own persisted records", () => {
    test("oracleSatisfactionRecordSchema accepts a record verbatim and does not coerce satisfied:false", () => {
      const unsatisfied = itemWithUnsatisfiedPredicate.oracle_satisfaction[1];
      const parsed = oracleSatisfactionRecordSchema.parse(unsatisfied);
      expect(parsed).toEqual(unsatisfied);
      expect(parsed.satisfied).toBe(false);
    });

    test("oracleSatisfactionRecordSchema rejects a non-boolean satisfied, a missing checked_at, and a missing predicate_id", () => {
      expect(() =>
        oracleSatisfactionRecordSchema.parse({
          predicate_id: "p-oracle-unsatisfied",
          satisfied: "false",
          checked_at: "2026-07-25T10:00:00.000Z",
        }),
      ).toThrow();
      expect(() =>
        oracleSatisfactionRecordSchema.parse({
          predicate_id: "p-oracle-unsatisfied",
          satisfied: false,
        }),
      ).toThrow();
      expect(() =>
        oracleSatisfactionRecordSchema.parse({
          satisfied: false,
          checked_at: "2026-07-25T10:00:00.000Z",
        }),
      ).toThrow();
    });

    test("userJudgmentRecordSchema pins the verdict vocabulary to satisfied|unsatisfied", () => {
      expect(userJudgmentRecordSchema.parse(userJudgmentRecord)).toEqual(userJudgmentRecord);
      expect(userJudgmentRecordSchema.parse(rejectingUserJudgmentRecord)).toEqual(
        rejectingUserJudgmentRecord,
      );
      expect(() =>
        userJudgmentRecordSchema.parse({ ...userJudgmentRecord, verdict: "kinda" }),
      ).toThrow();
      expect(() =>
        userJudgmentRecordSchema.parse({ ...userJudgmentRecord, verdict: true }),
      ).toThrow();
    });

    test("userJudgmentRecordSchema rejects a record missing predicate_id or judged_at", () => {
      const { predicate_id: _p, ...withoutPredicateId } = userJudgmentRecord;
      const { judged_at: _j, ...withoutJudgedAt } = userJudgmentRecord;
      expect(() => userJudgmentRecordSchema.parse(withoutPredicateId)).toThrow();
      expect(() => userJudgmentRecordSchema.parse(withoutJudgedAt)).toThrow();
    });
  });

  describe("clause 5c: the gate is a pure reader", () => {
    test("calling the gate does not mutate its inputs (serialization identical before and after)", () => {
      const itemBefore = JSON.stringify(itemWithUnsatisfiedPredicate);
      const completionBefore = JSON.stringify(passingCompletion);
      goalStateGate(itemWithUnsatisfiedPredicate, passingCompletion);
      expect(JSON.stringify(itemWithUnsatisfiedPredicate)).toBe(itemBefore);
      expect(JSON.stringify(passingCompletion)).toBe(completionBefore);
    });

    test("the gate reads recorded judgments instead of judging: flipping the record flips the verdict", () => {
      const flipped = structuredClone(itemWithUnsatisfiedPredicate);
      flipped.oracle_satisfaction[1].satisfied = true;
      expect(goalStateGate(itemWithUnsatisfiedPredicate, passingCompletion).pass).toBe(false);
      expect(goalStateGate(flipped, passingCompletion).pass).toBe(true);
      expect(goalStateGate(flipped, passingCompletion).reasons).toEqual([]);
    });

    test("flipping only the user judgment verdict flips the verdict for the same item id", () => {
      const lifted = structuredClone(itemWithRejectingUserJudgment);
      lifted.user_judgments[0].verdict = "satisfied";
      expect(goalStateGate(itemWithRejectingUserJudgment, passingCompletion).pass).toBe(false);
      expect(goalStateGate(lifted, passingCompletion).pass).toBe(true);
      expect(closeWork(lifted, passingCompletion).closed).toBe(true);
      expect(closeStop(lifted, passingCompletion).closed).toBe(true);
    });
  });
});
