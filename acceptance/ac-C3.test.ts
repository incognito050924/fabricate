/**
 * Acceptance test for ac-C3 — SbE N-round forced example downshift
 * (extends ac-37; distinct from the ac-39/C3 fidelity ladder):
 * when abstract sparring on a hard leaf reaches round threshold N, a forced
 * downshift transformation ("이 입력이면 이 출력인가요?") fires and produces an
 * example_downshift record; continuing to emit abstract question turns at the
 * threshold without that record is refused with a reason.
 *
 * Frozen red: the modules under src/interview/mold/ do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-C3.json, oracle_statement clauses (1)-(7):
 *  (1) N-round counter — a pure function counts the abstract sparring rounds
 *      of a hard leaf's turn chain by consuming only the deterministic
 *      exchange tag (tag emitted upstream, pure machine routes on it): the
 *      count equals the number of abstract-tagged turns and the same fixture
 *      yields the same count on every call.
 *  (2) threshold firing — at N abstract rounds on a hard leaf the forced
 *      downshift fires and an example_downshift record is produced; at N-1
 *      rounds it does not fire (threshold exactness).
 *  (3) downshift record form — the example_downshift record parses under a
 *      zod schema requiring a proposed-input field, a proposed-output field
 *      (each non-empty), the target hard-leaf ref, and the firing round
 *      count; a fixture missing any one field is refused — the downshift
 *      artifact is forced into input->output example form by schema.
 *  (4) forcing (no silent continuation) — emitting a further abstract
 *      question turn at threshold without an example_downshift is refused
 *      with a reason; once the record is produced, continuation is allowed.
 *  (5) distinction from ac-39 — example_downshift carries its own record
 *      type; records typed prototype / three_alternatives (the ac-39
 *      escalation types) are refused by the example_downshift schema.
 *  (6) hard-leaf scoping — a soft leaf with the same round count never trips
 *      the downshift machinery (the contract GIVEN binds hard leaves only).
 *  (7) firing determinism — the firing decision and the gate are pure
 *      functions: the same input maps to the same verdict on every call.
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 *  - Example content adequacy: whether the proposed input/output truly
 *    represents the hard leaf's intent is human judgment; only field
 *    presence, form, and firing are enforced.
 *  - Downshift outcome: whether it "resolves instantly or exposes a real
 *    disagreement" requires a real user answer; only the firing and the
 *    example_downshift production are closed here.
 *  - Abstract-tag semantic fitness: whether a turn is truly abstract sparring
 *    is LLM/human judgment; the counter consumes the deterministic tag only.
 *  - N's operational adequacy: only exact firing at the fixture threshold
 *    (fires at N, silent at N-1) is checked, not which N is good in practice.
 */

import { describe, expect, test } from "bun:test";
import { countAbstractRounds } from "../src/interview/mold/abstract-round-counter";
import { gateAbstractTurnContinuation } from "../src/interview/mold/downshift-gate";
import {
  exampleDownshiftSchema,
  produceExampleDownshift,
} from "../src/interview/mold/example-downshift";

// --- Fixtures ---------------------------------------------------------------

const DOWNSHIFT_THRESHOLD = 3;

const hardLeaf = {
  id: "leaf-hard-1",
  statement: "a refund request is accepted only within 24 hours of purchase",
  type: "hard",
};

const softLeaf = {
  id: "leaf-soft-1",
  statement: "refund refusal messages should feel considerate",
  type: "soft",
  sufficiency_judge: "user",
};

// Turn records styled after the ac-1 turn chain; the deterministic tag field
// (exchange_tag) is the ONLY thing the counter may consume — tag emission is
// upstream LLM work, routing on the tag is the pure machine under test.
function abstractTurn(round: number, leafRef = "leaf-hard-1") {
  return {
    id: `turn-${leafRef}-${round}`,
    leaf_ref: leafRef,
    question_text: `'적시 환불'의 원칙적 의미를 다시 논의합니다 (라운드 ${round})`,
    asked_at: `2026-07-25T10:0${round}:00.000Z`,
    exchange_tag: "abstract",
  };
}

function concreteTurn(round: number, leafRef = "leaf-hard-1") {
  return {
    ...abstractTurn(round, leafRef),
    question_text: `구매 25시간 뒤 환불 요청이 오면 어떻게 되나요? (라운드 ${round})`,
    exchange_tag: "concrete",
  };
}

const threeAbstractRounds = [abstractTurn(1), abstractTurn(2), abstractTurn(3)];
const twoAbstractRounds = threeAbstractRounds.slice(0, 2);
const mixedChain = [
  abstractTurn(1),
  concreteTurn(2),
  abstractTurn(3),
  concreteTurn(4),
  abstractTurn(5),
];

const validDownshift = {
  type: "example_downshift",
  leaf_ref: "leaf-hard-1",
  proposed_input: "purchase at 09:00, refund requested at 10:30 the next day",
  proposed_output: "the refund request is refused",
  fired_at_round: 3,
};

// --- Clause 1: pure N-round counter over deterministic abstract tags ---------

describe("ac-C3 clause 1: pure N-round counter consumes only the deterministic abstract tag", () => {
  test("counts exactly the abstract-tagged turns of a mixed hard-leaf chain", () => {
    expect(countAbstractRounds(mixedChain)).toBe(3);
    expect(countAbstractRounds(twoAbstractRounds)).toBe(2);
  });

  test("counts zero on a chain with no abstract-tagged turn", () => {
    expect(countAbstractRounds([concreteTurn(1), concreteTurn(2)])).toBe(0);
  });

  test("is deterministic: the same fixture yields the same count on every call", () => {
    expect(countAbstractRounds(mixedChain)).toBe(countAbstractRounds(mixedChain));
    expect(countAbstractRounds(threeAbstractRounds)).toBe(countAbstractRounds(threeAbstractRounds));
  });
});

// --- Clause 2: threshold firing ------------------------------------------------

describe("ac-C3 clause 2: forced downshift fires at threshold N and not at N-1", () => {
  test("fires at N abstract rounds on a hard leaf and produces an example_downshift record", () => {
    const result = produceExampleDownshift({
      leaf: hardLeaf,
      turns: threeAbstractRounds,
      threshold: DOWNSHIFT_THRESHOLD,
    });
    expect(result.fired).toBe(true);
    expect(result.downshift?.type).toBe("example_downshift");
    expect(result.downshift?.leaf_ref).toBe("leaf-hard-1");
    expect(result.downshift?.fired_at_round).toBeGreaterThanOrEqual(DOWNSHIFT_THRESHOLD);
  });

  test("does not fire at N-1 abstract rounds (threshold exactness)", () => {
    const result = produceExampleDownshift({
      leaf: hardLeaf,
      turns: twoAbstractRounds,
      threshold: DOWNSHIFT_THRESHOLD,
    });
    expect(result.fired).toBe(false);
    expect(result.downshift).toBeUndefined();
  });

  test("only abstract tags advance the counter: concrete turns never fire the downshift", () => {
    // Four turns total but only two abstract rounds — still below N=3.
    const chain = [abstractTurn(1), concreteTurn(2), abstractTurn(3), concreteTurn(4)];
    const result = produceExampleDownshift({
      leaf: hardLeaf,
      turns: chain,
      threshold: DOWNSHIFT_THRESHOLD,
    });
    expect(result.fired).toBe(false);
  });
});

// --- Clause 3: example_downshift schema forces input->output example form -------

describe("ac-C3 clause 3: schema forces the '이 입력이면 이 출력인가요?' example form", () => {
  test("parses a complete example_downshift record", () => {
    expect(exampleDownshiftSchema.safeParse(validDownshift).success).toBe(true);
  });

  test("parses the record actually produced at threshold", () => {
    const result = produceExampleDownshift({
      leaf: hardLeaf,
      turns: threeAbstractRounds,
      threshold: DOWNSHIFT_THRESHOLD,
    });
    expect(exampleDownshiftSchema.safeParse(result.downshift).success).toBe(true);
  });

  test("refuses a record missing any one of the four required fields", () => {
    const requiredFields = [
      "proposed_input",
      "proposed_output",
      "leaf_ref",
      "fired_at_round",
    ] as const;
    for (const field of requiredFields) {
      const { [field]: _omitted, ...incomplete } = validDownshift;
      expect(exampleDownshiftSchema.safeParse(incomplete).success).toBe(false);
    }
  });

  test("refuses an empty proposed input or proposed output (each must be non-empty)", () => {
    expect(
      exampleDownshiftSchema.safeParse({ ...validDownshift, proposed_input: "" }).success,
    ).toBe(false);
    expect(
      exampleDownshiftSchema.safeParse({ ...validDownshift, proposed_output: "" }).success,
    ).toBe(false);
  });

  test("refuses a non-positive firing round count", () => {
    expect(exampleDownshiftSchema.safeParse({ ...validDownshift, fired_at_round: 0 }).success).toBe(
      false,
    );
  });
});

// --- Clause 4: forcing — no silent abstract continuation at threshold -----------

describe("ac-C3 clause 4: no silent continuation — abstract turns at threshold require the downshift", () => {
  test("refuses, with a reason, a further abstract turn at threshold without an example_downshift", () => {
    const verdict = gateAbstractTurnContinuation({
      leaf: hardLeaf,
      turns: threeAbstractRounds,
      proposedTurn: abstractTurn(4),
      threshold: DOWNSHIFT_THRESHOLD,
      downshifts: [],
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.rejection?.kind).toBe("downshift_required");
    expect(typeof verdict.rejection?.reason).toBe("string");
    expect(verdict.rejection?.reason.length).toBeGreaterThan(0);
  });

  test("allows continuation once an example_downshift for the leaf has been produced", () => {
    const verdict = gateAbstractTurnContinuation({
      leaf: hardLeaf,
      turns: threeAbstractRounds,
      proposedTurn: abstractTurn(4),
      threshold: DOWNSHIFT_THRESHOLD,
      downshifts: [validDownshift],
    });
    expect(verdict.allowed).toBe(true);
  });

  test("allows an abstract turn below the threshold — the forcing binds at N, not before", () => {
    const verdict = gateAbstractTurnContinuation({
      leaf: hardLeaf,
      turns: twoAbstractRounds,
      proposedTurn: abstractTurn(3),
      threshold: DOWNSHIFT_THRESHOLD,
      downshifts: [],
    });
    expect(verdict.allowed).toBe(true);
  });
});

// --- Clause 5: distinct record type from the ac-39 escalation -------------------

describe("ac-C3 clause 5: example_downshift is a distinct type from ac-39 escalation records", () => {
  test("refuses an ac-39 prototype escalation record, even one carrying downshift-like fields", () => {
    expect(exampleDownshiftSchema.safeParse({ ...validDownshift, type: "prototype" }).success).toBe(
      false,
    );
  });

  test("refuses an ac-39 three_alternatives escalation record", () => {
    expect(
      exampleDownshiftSchema.safeParse({ ...validDownshift, type: "three_alternatives" }).success,
    ).toBe(false);
  });

  test("refuses a record with no type discriminator at all", () => {
    const { type: _omitted, ...untyped } = validDownshift;
    expect(exampleDownshiftSchema.safeParse(untyped).success).toBe(false);
  });
});

// --- Clause 6: hard-leaf scoping -------------------------------------------------

describe("ac-C3 clause 6: soft leaves never trip the downshift machinery", () => {
  const softChain = [
    abstractTurn(1, "leaf-soft-1"),
    abstractTurn(2, "leaf-soft-1"),
    abstractTurn(3, "leaf-soft-1"),
  ];

  test("does not fire the downshift on a soft leaf at the same abstract round count", () => {
    const result = produceExampleDownshift({
      leaf: softLeaf,
      turns: softChain,
      threshold: DOWNSHIFT_THRESHOLD,
    });
    expect(result.fired).toBe(false);
    expect(result.downshift).toBeUndefined();
  });

  test("allows continued abstract turns on a soft leaf without any downshift", () => {
    const verdict = gateAbstractTurnContinuation({
      leaf: softLeaf,
      turns: softChain,
      proposedTurn: abstractTurn(4, "leaf-soft-1"),
      threshold: DOWNSHIFT_THRESHOLD,
      downshifts: [],
    });
    expect(verdict.allowed).toBe(true);
  });
});

// --- Clause 7: firing determinism --------------------------------------------------

describe("ac-C3 clause 7: firing decision and gate are deterministic pure functions", () => {
  test("the producer maps the same fixture to the same result on every call", () => {
    const atThreshold = {
      leaf: hardLeaf,
      turns: threeAbstractRounds,
      threshold: DOWNSHIFT_THRESHOLD,
    };
    expect(produceExampleDownshift(atThreshold)).toEqual(produceExampleDownshift(atThreshold));

    const belowThreshold = {
      leaf: hardLeaf,
      turns: twoAbstractRounds,
      threshold: DOWNSHIFT_THRESHOLD,
    };
    expect(produceExampleDownshift(belowThreshold)).toEqual(
      produceExampleDownshift(belowThreshold),
    );
  });

  test("the gate maps the same fixture to the same verdict on every call", () => {
    const blocked = {
      leaf: hardLeaf,
      turns: threeAbstractRounds,
      proposedTurn: abstractTurn(4),
      threshold: DOWNSHIFT_THRESHOLD,
      downshifts: [],
    };
    expect(gateAbstractTurnContinuation(blocked)).toEqual(gateAbstractTurnContinuation(blocked));

    const released = { ...blocked, downshifts: [validDownshift] };
    expect(gateAbstractTurnContinuation(released)).toEqual(gateAbstractTurnContinuation(released));
  });
});
