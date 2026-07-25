/**
 * Acceptance test for ac-C2 — i* HOW classification (extends ac-37):
 * when the user states a HOW ("Redis로 해"), the recorded utterance carries
 * how_classification ∈ {binding_prescription, outcome_sketch} exactly once,
 * and an unclassified HOW utterance raises a gate flag that references it.
 *
 * Frozen red: the modules under src/interview/mold/how-classification* do not
 * exist yet; the piece-3 implementation must turn this file green without
 * editing it.
 *
 * Oracle source: gate-a/rows/ac-C2.json, oracle_statement clauses (1)-(4):
 *  (1) classification field + enum — recording the HOW fixture yields a record
 *      with a how_classification field whose value is one of
 *      {binding_prescription, outcome_sketch}; zod parsing rejects an
 *      out-of-enum, empty, or missing classification.
 *  (2) exactly-once enforcement — attaching a second classification to an
 *      already-classified HOW utterance is refused (duplicate refusal fixture),
 *      and after recording the utterance's classification record count is
 *      exactly 1.
 *  (3) unclassified gate flag — for a HOW utterance recorded WITHOUT a
 *      classification (negative fixture) the gate raises an unclassified flag
 *      that references that utterance; for a classified fixture no flag is
 *      raised. The gate is deterministic on the same fixture input.
 *  (4) conditional boundary — a non-HOW utterance (HOW-ness is fixed by the
 *      fixture tag) is not required to be classified and never triggers the
 *      unclassified flag (contrast fixture for the contract's "when the user
 *      states a HOW" condition).
 *
 * Separation from ac-37 (draft lines 59, 289 — no parent-AC test-target
 * contamination): this file imports ONLY src/interview/mold/how-classification
 * and src/interview/mold/how-classification-gate — none of ac-37's mold
 * modules (ears-lint, example-record, leaf-typing, oracle-from-example).
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 *  (a) prescription vs sketch judgment — whether a given HOW utterance is
 *      truly a binding_prescription or an outcome_sketch is LLM/human
 *      judgment; the fixtures FIX the classification value and only the enum,
 *      the exactly-once enforcement, and the flag structure are asserted.
 *  (b) HOW-utterance detection itself — whether an utterance is a HOW (means
 *      statement) is fixed here by the fixture tag kind='how'; recognizing HOW
 *      in a real conversation is not closed by this criterion, and a missed
 *      HOW utterance never reaching this machinery remains human judgment.
 */

import { describe, expect, test } from "bun:test";
import {
  attachHowClassification,
  classifiedHowUtteranceSchema,
  recordHowUtterance,
} from "../src/interview/mold/how-classification";
import { howClassificationGate } from "../src/interview/mold/how-classification-gate";

// --- Fixtures ---------------------------------------------------------------
// kind is the fixture tag that FIXES HOW-ness (residual b): the gate routes on
// the tag; it never detects HOW from prose.

const HOW_UTTERANCE = {
  id: "utt-how-1",
  text: "Redis로 해",
  kind: "how",
};

// Negative fixture for clause 3: a HOW utterance recorded with no
// classification attached.
const UNCLASSIFIED_HOW_RECORD = {
  id: "utt-how-0",
  text: "캐시는 Redis로 해",
  kind: "how",
};

// Contrast fixture for clause 4: not a HOW (an outcome statement), fixed by
// the fixture tag.
const NON_HOW_UTTERANCE = {
  id: "utt-plain-1",
  text: "결제가 실패하면 사용자에게 실패 이유가 보여야 해",
  kind: "statement",
};

// --- Clause 1: classification field + enum -----------------------------------

describe("ac-C2 clause 1: how_classification field exists and is one of the two enum values", () => {
  test("recording the HOW fixture yields a record with the given classification, utterance preserved verbatim", () => {
    const prescription = recordHowUtterance(HOW_UTTERANCE, "binding_prescription");
    expect(prescription.how_classification).toBe("binding_prescription");
    expect(prescription.id).toBe("utt-how-1");
    expect(prescription.text).toBe("Redis로 해");

    const sketch = recordHowUtterance(HOW_UTTERANCE, "outcome_sketch");
    expect(sketch.how_classification).toBe("outcome_sketch");
  });

  test("schema accepts exactly the two enum values and preserves them verbatim", () => {
    for (const value of ["binding_prescription", "outcome_sketch"]) {
      const parsed = classifiedHowUtteranceSchema.safeParse({
        ...HOW_UTTERANCE,
        how_classification: value,
      });
      expect(parsed.success).toBe(true);
      expect(parsed.success ? parsed.data.how_classification : undefined).toBe(value);
    }
  });

  test("zod parsing rejects an out-of-enum classification value (negative fixtures)", () => {
    const englishNearMiss = classifiedHowUtteranceSchema.safeParse({
      ...HOW_UTTERANCE,
      how_classification: "use_redis",
    });
    expect(englishNearMiss.success).toBe(false);

    const koreanNearMiss = classifiedHowUtteranceSchema.safeParse({
      ...HOW_UTTERANCE,
      how_classification: "구속처방",
    });
    expect(koreanNearMiss.success).toBe(false);
  });

  test("zod parsing rejects an empty classification value", () => {
    const empty = classifiedHowUtteranceSchema.safeParse({
      ...HOW_UTTERANCE,
      how_classification: "",
    });
    expect(empty.success).toBe(false);
  });

  test("zod parsing rejects a record whose how_classification field is missing", () => {
    const missing = classifiedHowUtteranceSchema.safeParse({ ...HOW_UTTERANCE });
    expect(missing.success).toBe(false);
    const issuePaths = missing.success
      ? []
      : missing.error.issues.map((issue: { path: (string | number)[] }) => issue.path.join("."));
    expect(issuePaths).toContain("how_classification");
  });
});

// --- Clause 2: exactly-once enforcement --------------------------------------

describe("ac-C2 clause 2: a HOW utterance is classified exactly once", () => {
  test("after recording, the utterance carries exactly one classification record", () => {
    const record = recordHowUtterance(HOW_UTTERANCE, "binding_prescription");
    expect(record.classifications).toHaveLength(1);
    expect(record.classifications[0]?.value).toBe("binding_prescription");
  });

  test("attach succeeds on an unclassified record, then the second attempt is refused", () => {
    const first = attachHowClassification({ ...UNCLASSIFIED_HOW_RECORD }, "outcome_sketch");
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.record.how_classification).toBe("outcome_sketch");
    expect(first.record.classifications).toHaveLength(1);

    const second = attachHowClassification(first.record, "binding_prescription");
    expect(second.ok).toBe(false);
  });

  test("duplicate classification is refused with a refusal that references the utterance", () => {
    const record = recordHowUtterance(HOW_UTTERANCE, "binding_prescription");
    const attempt = attachHowClassification(record, "outcome_sketch");
    expect(attempt.ok).toBe(false);
    expect(attempt.ok ? undefined : attempt.refusal.kind).toBe("duplicate_how_classification");
    expect(attempt.ok ? undefined : attempt.refusal.utterance_id).toBe("utt-how-1");
  });

  test("a refused duplicate leaves the count at exactly 1 and the original value unchanged", () => {
    const record = recordHowUtterance(HOW_UTTERANCE, "binding_prescription");
    attachHowClassification(record, "outcome_sketch");
    expect(record.classifications).toHaveLength(1);
    expect(record.how_classification).toBe("binding_prescription");
  });
});

// --- Clause 3: unclassified gate flag ----------------------------------------

describe("ac-C2 clause 3: the gate flags an unclassified HOW utterance and references it", () => {
  test("a HOW utterance recorded without classification raises exactly one flag referencing it", () => {
    const flags = howClassificationGate([UNCLASSIFIED_HOW_RECORD]);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.kind).toBe("unclassified_how");
    expect(flags[0]?.utterance_id).toBe("utt-how-0");
  });

  test("a classified HOW utterance raises no flag (contrast fixture)", () => {
    const classified = recordHowUtterance(HOW_UTTERANCE, "outcome_sketch");
    const flags = howClassificationGate([classified]);
    expect(flags).toHaveLength(0);
  });

  test("the gate maps the same fixture input to the same flags on every call (deterministic)", () => {
    const batch = [UNCLASSIFIED_HOW_RECORD, NON_HOW_UTTERANCE];
    const firstRun = howClassificationGate(batch);
    const secondRun = howClassificationGate(batch);
    expect(secondRun).toEqual(firstRun);
  });
});

// --- Clause 4: conditional boundary — non-HOW utterances ----------------------

describe("ac-C2 clause 4: a non-HOW utterance is never required to classify and never flagged", () => {
  test("a non-HOW utterance without any classification raises no unclassified flag", () => {
    const flags = howClassificationGate([NON_HOW_UTTERANCE]);
    expect(flags).toHaveLength(0);
  });

  test("mixed batch: only the unclassified HOW utterance is flagged, never the non-HOW one", () => {
    const classified = recordHowUtterance(HOW_UTTERANCE, "binding_prescription");
    const flags = howClassificationGate([NON_HOW_UTTERANCE, UNCLASSIFIED_HOW_RECORD, classified]);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.utterance_id).toBe("utt-how-0");
    expect(
      flags.some((flag: { utterance_id: string }) => flag.utterance_id === NON_HOW_UTTERANCE.id),
    ).toBe(false);
  });
});
