import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runContradictionPass } from "../consistency/pass-run";
import { enterLock } from "../lock/enter";
import { deriveConflictingInput, evaluateConflictingFloor } from "./conflicting-input";

/**
 * H1 — "ran" is a claim about a pass that happened, so it needs the pass.
 *
 * An array-shaped `conflicts` field is not evidence: any object literal has one
 * for free, which is exactly how a never-run check gets read as a verified zero
 * (ADR-0018 / ac-31 clause 6 forbid that disguise). A pass result also carries
 * the id the pass runner minted, and nothing but a real run produces one — so
 * the id is what "ran" is derived from.
 *
 * The frozen acceptance tests cannot see this: ac-31 only ever feeds
 * `deriveConflictingInput` real pass results and an explicit not-run marker.
 * These cases are the only thing holding the line.
 */

const ANSWERS = [
  { id: "ans-1", question: "Q1?", answer: "A1" },
  { id: "ans-2", question: "Q2?", answer: "A2" },
];

describe("deriveConflictingInput demands evidence of a real pass", () => {
  test("a bare object with an empty conflicts array is NOT a verified zero", () => {
    expect(deriveConflictingInput({ conflicts: [] })).toEqual({ status: "not-run" });
  });

  test("the floor blocks that object, with the not-run reason", () => {
    const verdict = evaluateConflictingFloor(deriveConflictingInput({ conflicts: [] }));
    expect(verdict.blocked).toBe(true);
    expect(verdict.reason).toBe("consistency-pass-not-run");
  });

  test("a conflicts array with entries still needs the pass id", () => {
    expect(deriveConflictingInput({ conflicts: [{ answer_ids: ["ans-1", "ans-2"] }] })).toEqual({
      status: "not-run",
    });
  });

  test("an empty pass id is no id at all", () => {
    expect(deriveConflictingInput({ id: "", conflicts: [] })).toEqual({ status: "not-run" });
  });

  test("a non-string pass id does not qualify", () => {
    expect(deriveConflictingInput({ id: 7, conflicts: [] } as never)).toEqual({
      status: "not-run" as const,
    });
  });

  test("an explicit not-run marker stays not-run", () => {
    expect(deriveConflictingInput({ status: "not-run" })).toEqual({ status: "not-run" });
  });
});

describe("deriveConflictingInput accepts a real pass result", () => {
  test("a clean run is a verified zero, and the floor lets it through", () => {
    const pass = runContradictionPass({ answers: ANSWERS, judge: () => [] });
    expect(pass.id.length).toBeGreaterThan(0);
    expect(deriveConflictingInput(pass)).toEqual({ status: "ran", conflicting: 0 });
    expect(evaluateConflictingFloor(deriveConflictingInput(pass)).blocked).toBe(false);
  });

  test("the count is the run's conflict-list length, not a constant", () => {
    const pass = runContradictionPass({
      answers: ANSWERS,
      judge: () => [{ answer_ids: ["ans-1", "ans-2"] }],
    });
    expect(deriveConflictingInput(pass)).toEqual({ status: "ran", conflicting: 1 });
  });
});

/**
 * The lock path must reach its consistency record THROUGH this helper.
 *
 * H1 is worth nothing if the entry point assembles `{ status: "ran", … }` for
 * itself: the exported helper would keep its guarantee while the surface that
 * matters — the record the lock carries, the one ac-28 is specified to consume
 * — quietly bypassed it. That drift is invisible to the frozen tests and to
 * every behavioral probe available here, because a real pass always carries a
 * real id, so nothing observable distinguishes the two implementations.
 *
 * So it is pinned two ways: the record must equal what the helper derives from
 * that run's own pass, and the entry point must not state a ran-record at all.
 * The second rule is a source-shape rule, in the manner ac-26 clause 4a already
 * uses; it runs on comment-stripped source so a comment cannot satisfy it.
 */
const ENTER_SOURCE = readFileSync(resolve(import.meta.dir, "../lock/enter.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1");

describe("the lock path derives its record through this helper", () => {
  const CONFLICT_SETS = [
    [],
    [{ answer_ids: ["ans-1", "ans-2"] }],
    [{ answer_ids: ["ans-2", "ans-1"] }, { answer_ids: ["ans-1", "ans-2"] }],
  ];

  for (const reports of CONFLICT_SETS) {
    test(`with ${reports.length} conflict(s) the record equals the helper's derivation of that run's pass`, () => {
      const outcome = enterLock({ answers: ANSWERS, judge: () => reports });
      expect(outcome.pass).toBeDefined();
      const pass = outcome.pass;
      if (pass === undefined) throw new Error("the pass must be on the outcome");
      expect(outcome.record.consistency).toEqual(deriveConflictingInput(pass));
    });
  }

  test("the entry point calls the helper", () => {
    expect(ENTER_SOURCE).toContain("deriveConflictingInput(");
  });

  test("the record the lock carries is assigned FROM that call, not merely near it", () => {
    // Calling the helper and discarding the result, then assembling the record
    // some other way, satisfies the two rules around this one. This is the rule
    // that says the assignment itself must be the call.
    expect(ENTER_SOURCE).toMatch(/consistency\s*=\s*deriveConflictingInput\(/);
  });

  test("the entry point states no ran-record of its own", () => {
    // Any occurrence of the literal is a second producer of "ran" — the one
    // thing the helper exists to be sole owner of.
    expect(ENTER_SOURCE).not.toMatch(/["']ran["']/);
  });
});
