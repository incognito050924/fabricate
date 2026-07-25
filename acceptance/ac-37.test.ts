/**
 * Acceptance test for ac-37 — B6 example-verdict concretization (the mold):
 * every hard leaf needs >=1 user-verdict example {input,expected,verdict,at},
 * the oracle is generated FROM the examples (consensus<->verification drift is
 * structurally blocked via a mandatory example ref), mold-record wording goes
 * through an EARS-parsing lint (parse failure = diagnostic, never silent),
 * every leaf is typed hard/soft (soft leaves are user-judged, never fake ACs),
 * evidence_required never exempts the example floor, and the EARS lint binds
 * mold records only — never question turns (mold record, not conversation).
 *
 * Frozen red: the modules under src/interview/mold/ do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-37.json, oracle_statement clauses (1)-(7):
 *  (1) example floor — zod schema requires all four fields; a hard leaf with
 *      zero (or only malformed) examples is refused lock, fail-closed.
 *  (2) oracle from examples — the generated oracle carries example refs to the
 *      originating examples of THAT leaf (two leaves with disjoint example ids
 *      pin the derivation); a ref-less oracle, an oracle naming an example the
 *      leaf does not own, and an oracle naming a different leaf are all refused
 *      attachment (reference integrity); generation is deterministic.
 *  (3) EARS lint — each parse-failure fixture emits a diagnostic whose
 *      record_ref is that record's own id and whose pointer is a non-blank
 *      excerpt of that record's own statement_text (no silent pass, no constant
 *      diagnostic); a parse-success fixture emits none.
 *  (4) hard/soft typing — untyped or out-of-enum leaves are rejected; soft
 *      leaves must carry sufficiency_judge='user'; promoting a soft leaf to a
 *      machine-judged AC is refused (fake AC).
 *  (5) anti-exemption — a filled evidence_required does not waive (1): the
 *      identical example_floor rejection still fires.
 *  (6) mold record not conversation — the lint stage attaches ears_lint to
 *      mold records only; a question turn passes through verbatim with no
 *      ears_lint field and is never required to parse as EARS.
 *  (7) determinism boundary — the machines of (2), (3), (4) map the same
 *      fixture input to the same output on every call.
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 *  - Example content adequacy: whether input/expected/verdict truly represent
 *    the hard leaf's intent is user judgment; only field presence and schema
 *    are enforced.
 *  - Verdict provenance: whether the verdict actually came from a real user
 *    is out of scope; only the field's presence is checked.
 *  - Hard/soft classification appropriateness: which leaves are truly hard is
 *    LLM/human judgment; only the typing field and the soft->user routing are
 *    enforced.
 *  - Korean-EARS tuning sufficiency: how well EARS templates fit Korean prose
 *    is not closed here; only the diagnostic-emission structure for pass/fail
 *    fixtures is asserted.
 */

import { describe, expect, test } from "bun:test";
import { applyEarsLintStage, lintEarsMoldRecord } from "../src/interview/mold/ears-lint";
import { exampleRecordSchema, gateLeafLock } from "../src/interview/mold/example-record";
import { gateLeafTyping, promoteLeafToMachineAc } from "../src/interview/mold/leaf-typing";
import {
  attachOracleToLeaf,
  generateOracleFromExamples,
} from "../src/interview/mold/oracle-from-example";

// --- Fixtures ---------------------------------------------------------------

const validExample = {
  id: "ex-1",
  input: "refund requested 25 hours after purchase",
  expected: "the request is refused",
  verdict: "pass",
  at: "2026-07-25T10:00:00.000Z",
};

const hardLeafWithExample = {
  id: "leaf-hard-1",
  statement: "a refund request is accepted only within 24 hours of purchase",
  type: "hard",
  examples: [validExample],
};

// A second hard leaf whose example ids are disjoint from leaf-hard-1's: any
// oracle generator that returns a constant (or ignores the leaf) is caught.
const secondExample = {
  id: "ex-2",
  input: "refund requested 2 hours after purchase",
  expected: "the request is accepted",
  verdict: "pass",
  at: "2026-07-25T10:05:00.000Z",
};

const thirdExample = {
  id: "ex-3",
  input: "refund requested exactly 24 hours after purchase",
  expected: "the request is accepted",
  verdict: "fail",
  at: "2026-07-25T10:10:00.000Z",
};

const hardLeafTwoExamples = {
  id: "leaf-hard-2",
  statement: "a refund request is accepted only within 24 hours of purchase",
  type: "hard",
  examples: [secondExample, thirdExample],
};

const hardLeafNoExamples = {
  id: "leaf-hard-0",
  statement: "a refund request is accepted only within 24 hours of purchase",
  type: "hard",
  examples: [],
};

const softLeafUserJudged = {
  id: "leaf-soft-1",
  statement: "refund refusal messages should feel considerate",
  type: "soft",
  sufficiency_judge: "user",
};

const untypedLeaf = {
  id: "leaf-untyped",
  statement: "the CLI prints an intent summary",
};

// Non-EARS text, deliberately phrased as a question: it must FAIL the lint as
// a mold record and pass through UNTOUCHED as a question turn (clauses 3, 6).
const nonEarsQuestionText = "환불 요청은 언제까지 접수되어야 하나요?";

const earsMoldRecord = {
  id: "mold-pass-1",
  statement_text:
    "When the user submits a refund request within 24 hours of purchase, " +
    "the system shall accept the request.",
};

const brokenMoldRecord = {
  id: "mold-fail-1",
  statement_text: nonEarsQuestionText,
};

// A second failure fixture with a different id and text that shares no
// non-whitespace character with the first: one constant diagnostic cannot
// satisfy both record_ref and pointer-excerpt checks. Being English, it also
// keeps language from lining up with the pass/fail split.
const otherBrokenMoldRecord = {
  id: "mold-fail-2",
  statement_text: "Refunds get handled by whoever picks up the ticket that day.",
};

const questionTurn = {
  id: "turn-1",
  kind: "question_turn",
  question_text: nonEarsQuestionText,
  asked_at: "2026-07-25T11:00:00.000Z",
};

// --- Clause 1: example floor -------------------------------------------------

describe("ac-37 clause 1: example floor — four-field schema and fail-closed lock gate", () => {
  test("parses a complete {input,expected,verdict,at} example record", () => {
    expect(exampleRecordSchema.safeParse(validExample).success).toBe(true);
  });

  test("refuses an example record missing any one of the four required fields", () => {
    for (const field of ["input", "expected", "verdict", "at"] as const) {
      const { [field]: _omitted, ...incomplete } = validExample;
      expect(exampleRecordSchema.safeParse(incomplete).success).toBe(false);
    }
  });

  test("refuses to lock a hard leaf with zero user-verdict examples (fail-closed)", () => {
    const result = gateLeafLock(hardLeafNoExamples);
    expect(result.locked).toBe(false);
    expect(result.rejection?.kind).toBe("example_floor");
  });

  test("refuses to lock a hard leaf whose only example is missing a field", () => {
    const { verdict: _omitted, ...verdictless } = validExample;
    const result = gateLeafLock({ ...hardLeafWithExample, examples: [verdictless] });
    expect(result.locked).toBe(false);
  });

  test("locks a hard leaf carrying one complete user-verdict example (contrast)", () => {
    expect(gateLeafLock(hardLeafWithExample).locked).toBe(true);
  });

  test("locks a soft leaf without examples — the floor binds hard leaves only", () => {
    expect(gateLeafLock(softLeafUserJudged).locked).toBe(true);
  });
});

// --- Clause 2: oracle generated from examples --------------------------------

describe("ac-37 clause 2: oracle is generated from examples and must carry an example ref", () => {
  test("the generated oracle references the originating example and its leaf", () => {
    const oracle = generateOracleFromExamples(hardLeafWithExample);
    expect(oracle.example_refs).toEqual(["ex-1"]);
    expect(oracle.leaf_ref).toBe("leaf-hard-1");
  });

  test("a second leaf with disjoint example ids yields refs derived from THAT leaf", () => {
    const oracle = generateOracleFromExamples(hardLeafTwoExamples);
    expect(oracle.leaf_ref).toBe("leaf-hard-2");
    // Both of the leaf's own examples are carried, in the leaf's own order.
    expect(oracle.example_refs).toEqual(["ex-2", "ex-3"]);
    // ...and nothing from the other leaf leaks in.
    expect(oracle.example_refs).not.toContain("ex-1");
    expect(oracle).not.toEqual(generateOracleFromExamples(hardLeafWithExample));
  });

  test("refuses to attach a ref-less oracle to a hard leaf (drift structurally blocked)", () => {
    const emptyRefs = { leaf_ref: "leaf-hard-1", example_refs: [] };
    const emptyResult = attachOracleToLeaf(hardLeafWithExample, emptyRefs);
    expect(emptyResult.attached).toBe(false);
    expect(emptyResult.rejection?.kind).toBe("missing_example_ref");

    const { example_refs: _omitted, ...noRefField } = emptyRefs;
    const fieldlessResult = attachOracleToLeaf(hardLeafWithExample, noRefField);
    expect(fieldlessResult.attached).toBe(false);
    expect(fieldlessResult.rejection?.kind).toBe("missing_example_ref");
  });

  test("refuses an oracle naming an example the leaf does not own (reference integrity)", () => {
    const unknownRef = attachOracleToLeaf(hardLeafWithExample, {
      leaf_ref: "leaf-hard-1",
      example_refs: ["ex-does-not-exist"],
    });
    expect(unknownRef.attached).toBe(false);
    expect(unknownRef.rejection?.kind).toBe("unknown_example_ref");

    // One good ref does not launder a bad one: integrity binds every ref.
    const partiallyUnknown = attachOracleToLeaf(hardLeafTwoExamples, {
      leaf_ref: "leaf-hard-2",
      example_refs: ["ex-2", "ex-does-not-exist"],
    });
    expect(partiallyUnknown.attached).toBe(false);
    expect(partiallyUnknown.rejection?.kind).toBe("unknown_example_ref");

    // ...and the other leaf's real example ids are still foreign here.
    const foreignRef = attachOracleToLeaf(hardLeafWithExample, {
      leaf_ref: "leaf-hard-1",
      example_refs: ["ex-2"],
    });
    expect(foreignRef.attached).toBe(false);
    expect(foreignRef.rejection?.kind).toBe("unknown_example_ref");
  });

  test("refuses an oracle whose leaf_ref names a different leaf (reference integrity)", () => {
    const strayLeaf = attachOracleToLeaf(hardLeafWithExample, {
      leaf_ref: "leaf-hard-9",
      example_refs: ["ex-1"],
    });
    expect(strayLeaf.attached).toBe(false);
    expect(strayLeaf.rejection?.kind).toBe("leaf_ref_mismatch");

    // The oracle of the sibling leaf is valid in itself, yet refused here.
    const siblingOracle = generateOracleFromExamples(hardLeafTwoExamples);
    expect(attachOracleToLeaf(hardLeafWithExample, siblingOracle).attached).toBe(false);
  });

  test("attaches each generated oracle to its own hard leaf (contrast)", () => {
    expect(
      attachOracleToLeaf(hardLeafWithExample, generateOracleFromExamples(hardLeafWithExample))
        .attached,
    ).toBe(true);
    expect(
      attachOracleToLeaf(hardLeafTwoExamples, generateOracleFromExamples(hardLeafTwoExamples))
        .attached,
    ).toBe(true);
  });

  test("generation is deterministic: the same example fixture yields identical oracles", () => {
    const first = generateOracleFromExamples(hardLeafWithExample);
    const second = generateOracleFromExamples(hardLeafWithExample);
    expect(second).toEqual(first);
  });
});

// --- Clause 3: EARS-parsing lint ----------------------------------------------

describe("ac-37 clause 3: EARS lint emits a pointing diagnostic on failure, none on success", () => {
  test("each failing mold record emits a diagnostic keyed to its own id and text", () => {
    for (const record of [brokenMoldRecord, otherBrokenMoldRecord]) {
      const result = lintEarsMoldRecord(record);
      expect(result.parsed).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);

      const diagnostic = result.diagnostics[0];
      // record_ref is derived from the offending record, not a constant.
      expect(diagnostic?.record_ref).toBe(record.id);

      const pointer = diagnostic?.pointer;
      expect(typeof pointer).toBe("string");
      // The pointer is a non-blank excerpt of THIS record's own wording, so it
      // actually points at the failure site instead of naming a fixed token.
      expect(String(pointer).trim().length).toBeGreaterThan(0);
      expect(record.statement_text.includes(String(pointer))).toBe(true);
    }
  });

  test("the two failing records do not share one canned diagnostic", () => {
    const first = lintEarsMoldRecord(brokenMoldRecord).diagnostics[0];
    const second = lintEarsMoldRecord(otherBrokenMoldRecord).diagnostics[0];
    expect(second?.record_ref).not.toBe(first?.record_ref);
    expect(second?.pointer).not.toBe(first?.pointer);
  });

  test("a mold record that parses as EARS emits no diagnostic", () => {
    const result = lintEarsMoldRecord(earsMoldRecord);
    expect(result.parsed).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});

// --- Clause 4: hard/soft typing -----------------------------------------------

describe("ac-37 clause 4: hard/soft typing is mandatory and soft leaves are user-judged", () => {
  test("rejects an untyped leaf", () => {
    expect(gateLeafTyping(untypedLeaf).approved).toBe(false);
  });

  test("rejects a leaf typed outside {hard, soft}", () => {
    expect(gateLeafTyping({ ...untypedLeaf, type: "warm" }).approved).toBe(false);
  });

  test("approves a hard leaf and a soft leaf carrying sufficiency_judge='user'", () => {
    expect(gateLeafTyping(hardLeafWithExample).approved).toBe(true);
    expect(gateLeafTyping(softLeafUserJudged).approved).toBe(true);
  });

  test("rejects a soft leaf that does not carry sufficiency_judge='user'", () => {
    const { sufficiency_judge: _omitted, ...judgeless } = softLeafUserJudged;
    expect(gateLeafTyping(judgeless).approved).toBe(false);
    expect(gateLeafTyping({ ...softLeafUserJudged, sufficiency_judge: "llm" }).approved).toBe(
      false,
    );
  });

  test("refuses to promote a soft leaf to a machine-judged AC (fake AC)", () => {
    const result = promoteLeafToMachineAc(softLeafUserJudged);
    expect(result.promoted).toBe(false);
    expect(result.rejection?.kind).toBe("fake_ac");
  });

  test("promotes a hard leaf carrying a complete example (contrast)", () => {
    expect(promoteLeafToMachineAc(hardLeafWithExample).promoted).toBe(true);
  });
});

// --- Clause 5: anti-exemption --------------------------------------------------

describe("ac-37 clause 5: evidence_required never exempts the example floor", () => {
  test("refuses to lock an example-less hard leaf even when evidence_required is filled", () => {
    const result = gateLeafLock({ ...hardLeafNoExamples, evidence_required: ["test"] });
    expect(result.locked).toBe(false);
    // The very same rejection as clause 1 fires — no separate waived branch.
    expect(result.rejection?.kind).toBe("example_floor");
  });
});

// --- Clause 6: mold record, not conversation -----------------------------------

describe("ac-37 clause 6: EARS lint binds mold records only, never question turns", () => {
  test("the lint stage attaches an ears_lint result to a mold record", () => {
    const staged = applyEarsLintStage({ kind: "mold_record", ...brokenMoldRecord });
    expect(Object.hasOwn(staged, "ears_lint")).toBe(true);
    expect(staged.ears_lint?.parsed).toBe(false);
    expect(staged.ears_lint?.diagnostics[0]?.record_ref).toBe("mold-fail-1");

    // The attached result tracks the record it staged, rather than a fixed one.
    const stagedPass = applyEarsLintStage({ kind: "mold_record", ...earsMoldRecord });
    expect(stagedPass.ears_lint?.parsed).toBe(true);
    expect(stagedPass.ears_lint?.diagnostics).toEqual([]);
  });

  test("the same non-EARS text in a question turn passes through with no ears_lint field", () => {
    const staged = applyEarsLintStage(questionTurn);
    expect(Object.hasOwn(staged, "ears_lint")).toBe(false);
    expect(staged).toEqual(questionTurn);
    expect(staged.question_text).toBe(nonEarsQuestionText);
  });
});

// --- Clause 7: determinism boundary ---------------------------------------------

describe("ac-37 clause 7: the machines of clauses 2-4 are deterministic", () => {
  test("EARS lint maps the same fixture to the same output, and differing inputs apart", () => {
    expect(lintEarsMoldRecord(brokenMoldRecord)).toEqual(lintEarsMoldRecord(brokenMoldRecord));
    expect(lintEarsMoldRecord(earsMoldRecord)).toEqual(lintEarsMoldRecord(earsMoldRecord));
    expect(lintEarsMoldRecord(otherBrokenMoldRecord)).toEqual(
      lintEarsMoldRecord(otherBrokenMoldRecord),
    );
    // Determinism is sameness per input, not one answer for every input.
    expect(lintEarsMoldRecord(brokenMoldRecord)).not.toEqual(lintEarsMoldRecord(earsMoldRecord));
    expect(lintEarsMoldRecord(brokenMoldRecord)).not.toEqual(
      lintEarsMoldRecord(otherBrokenMoldRecord),
    );
  });

  test("the typing gate maps the same fixture to the same output, and differing inputs apart", () => {
    expect(gateLeafTyping(softLeafUserJudged)).toEqual(gateLeafTyping(softLeafUserJudged));
    expect(gateLeafTyping(untypedLeaf)).toEqual(gateLeafTyping(untypedLeaf));
    expect(gateLeafTyping(softLeafUserJudged)).not.toEqual(gateLeafTyping(untypedLeaf));
  });

  test("the oracle generator maps the same fixture to the same output, per leaf", () => {
    expect(generateOracleFromExamples(hardLeafWithExample)).toEqual(
      generateOracleFromExamples(hardLeafWithExample),
    );
    expect(generateOracleFromExamples(hardLeafTwoExamples)).toEqual(
      generateOracleFromExamples(hardLeafTwoExamples),
    );
    // A constant generator would satisfy repeat-equality but not this.
    expect(generateOracleFromExamples(hardLeafTwoExamples)).not.toEqual(
      generateOracleFromExamples(hardLeafWithExample),
    );
  });
});
