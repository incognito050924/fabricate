import { describe, expect, test } from "bun:test";
import type { DimensionNode } from "../completeness/fragment-mapping";
import { evaluateReadiness, proceedToLock } from "./readiness-gate";
import { blockingSeedIds, isBlockingSeed } from "./seed-block";

/**
 * H2/H3 — the block lifts only on a positive resolution.
 *
 * The predicate used to read `state === "open"` and release on everything else,
 * so a discovered seed sitting in `unevaluated` — a close that was attempted and
 * refused by the ac-26 shell — released the lock, and so did a state the enum
 * has never heard of, and so did a drop with no reason (which
 * `dimension.ts:42 isSettled` and `finalize.ts:70` both refuse to call settled).
 *
 * The rule here is the opposite one: a seed blocks unless it can be shown to
 * have left the open state properly. Unknown is blocked, absent is blocked,
 * reasonless is blocked.
 *
 * The frozen tests cannot see this either: ac-25 clause 6 only exercises `open`
 * and `dropped`-with-reason, and ac-26's scan checks the shape of the branch,
 * not which side of it a seed lands on.
 */

const seed = (state: string | undefined, extra: Partial<DimensionNode> = {}): DimensionNode => ({
  id: "dim-seed-f-1",
  origin: "discovered",
  ...(state === undefined ? {} : { state }),
  ...extra,
});

describe("a discovered seed blocks unless it positively left the open state", () => {
  const blocking: Array<[string, DimensionNode]> = [
    ["open", seed("open")],
    ["unevaluated — a close attempted and not judged", seed("unevaluated")],
    ["a state the enum does not know", seed("definitely-not-a-state")],
    ["no state at all", seed(undefined)],
    ["dropped with no reason", seed("dropped")],
    ["dropped with a blank reason", seed("dropped", { drop_reason: "   \t\n" })],
    ["dropped with an empty reason", seed("dropped", { drop_reason: "" })],
  ];

  for (const [label, dimension] of blocking) {
    test(`blocks: ${label}`, () => {
      expect(isBlockingSeed(dimension)).toBe(true);
      expect(blockingSeedIds([dimension])).toEqual(["dim-seed-f-1"]);
    });
  }

  const released: Array<[string, DimensionNode]> = [
    ["resolved", seed("resolved")],
    [
      "dropped with a stated reason",
      seed("dropped", { drop_reason: "out of scope, user said so" }),
    ],
  ];

  for (const [label, dimension] of released) {
    test(`releases: ${label}`, () => {
      expect(isBlockingSeed(dimension)).toBe(false);
      expect(blockingSeedIds([dimension])).toEqual([]);
    });
  }
});

describe("the predicate is about discovered seeds only", () => {
  test("a user-origin dimension never blocks, whatever its state", () => {
    for (const state of ["open", "unevaluated", "definitely-not-a-state"]) {
      expect(isBlockingSeed({ id: "dim-1", origin: "user", state })).toBe(false);
    }
  });
});

describe("readiness and the lock cannot disagree", () => {
  const cases: Array<[string, DimensionNode, boolean]> = [
    ["open seed", seed("open"), false],
    ["unevaluated seed", seed("unevaluated"), false],
    ["off-enum seed", seed("definitely-not-a-state"), false],
    ["reasonless drop", seed("dropped"), false],
    ["resolved seed", seed("resolved"), true],
    ["dropped with reason", seed("dropped", { drop_reason: "out of scope" }), true],
  ];

  for (const [label, dimension, expected] of cases) {
    test(`${label}: readiness and proceedToLock return the same verdict`, () => {
      const dimensions = [dimension];
      expect(evaluateReadiness({ dimensions }).ready).toBe(expected);
      expect(proceedToLock({ dimensions }).locked).toBe(expected);
    });
  }

  test("a claimed-ready flag cannot lift the unevaluated block", () => {
    const dimensions = [seed("unevaluated")];
    const lock = proceedToLock({ dimensions, claimed_ready: true });
    expect(lock.locked).toBe(false);
    expect(lock.blockers).toEqual(["dim-seed-f-1"]);
  });
});
