/**
 * Acceptance test for ac-B5 — laddering triadic/bipolar [forced-artifact]:
 * on a dimension tagged as a fuzzy preference, a triadic elicitation record
 * carries triadic_alternatives with exactly three elements (zod rejects
 * records with fewer than three, more than three, or a missing field); a
 * bipolar_pair captured from the "which two side together, and why" answer is
 * judged complete only when both poles (grouped pole, opposite pole) and the
 * why (reason) field are all present — a one-pole fixture gets the incomplete
 * flag, a both-poles contrast fixture does not (2-state contrast); when
 * upward "why does it matter" laddering is marked saturated, a stop signal is
 * emitted and no further upward step is scheduled, while an unsaturated
 * contrast fixture keeps climbing with no stop signal — the contrast fixtures
 * hold why_chain fixed and flip only the saturation mark, and a second pair
 * anti-correlates chain length with the expected branch, so the routing must
 * read the mark itself; the ladder structure carries a downward-path record
 * to observable instances (downward output field, parse-or-refuse existence);
 * and a captured (complete) bipolar_pair is recorded as a real glossary entry
 * — one that satisfies the ac-21 five-field entry schema (depends_on: ac-21),
 * is not the captured pair echoed back, and carries both poles verbatim in
 * its own text — while an empty glossary, an unrelated pair's record, and a
 * same-dimension decoy record are each judged fail; a structurally equal but
 * distinct copy of the record passes, so the check cannot be reference
 * identity.
 *
 * Frozen red: the modules under src/interview/laddering/ do not exist yet;
 * the piece-3 implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-B5.json (oracle_statement clauses 1-5).
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 * (a) bipolar content — whether the two captured poles and their reason
 *     correctly capture the user's real preference construct is not machined;
 *     completeness checking and record wiring are asserted on fixture-fixed
 *     pairs only;
 * (b) fuzzy-preference dimension identification — which dimension is a fuzzy
 *     preference eligible for laddering is fixed by the fixture tag; whether
 *     that identification is right in a real session is not closed here;
 * (c) concreteness of the three alternatives — whether the three elements are
 *     actually concrete alternatives is a human-judged predicate beyond the
 *     element-count check;
 * (d) the substance of the upward-saturation judgment — when the "why does it
 *     matter" climb is really saturated is fixed by the fixture; only the
 *     saturation-mark → stop-signal routing is machine-checked;
 * (e) observability and aptness of the downward instances — whether the
 *     downward output is genuinely observable and rightly exemplifies its
 *     pole lies outside the existence check;
 * (f) real-session elicitation — presenting the triadic set to a real user
 *     and obtaining the "which two side together, and why" answer needs real
 *     user answers; this test forces structure on fixture answers only.
 * No prose content of alternatives, poles, or instances is graded.
 */

import { describe, expect, test } from "bun:test";
// The shape of a glossary entry is ac-21's (depends_on: ac-21); clause 5 holds
// the recorded pair to that schema so an identity return cannot satisfy it.
import { glossaryEntrySchema } from "../src/interview/glossary/entry";
import { assessBipolarPair } from "../src/interview/laddering/bipolar-pair";
import {
  checkBipolarGlossaryRecord,
  recordBipolarPairToGlossary,
} from "../src/interview/laddering/glossary-record";
import { ladderSchema, routeUpwardLaddering } from "../src/interview/laddering/ladder-updown";
import { triadicElicitationSchema } from "../src/interview/laddering/triadic-alternatives";

// The fuzzy-preference tag on the dimension is fixture-fixed (residual b).
const THREE_ALTERNATIVES = [
  "a terse one-line verdict",
  "a warm conversational walkthrough",
  "a formal numbered report",
];

const FUZZY_DIMENSION_RECORD = {
  dimension: "feedback tone",
  preference_clarity: "fuzzy",
  triadic_alternatives: THREE_ALTERNATIVES,
};

const COMPLETE_BIPOLAR_PAIR = {
  dimension: "feedback tone",
  grouped_pole: "talks to me like a person",
  opposite_pole: "reads like a compliance report",
  reason: "the verdict and the walkthrough both feel like a colleague answering",
};

const GROUPED_POLE_ONLY_PAIR = {
  dimension: "feedback tone",
  grouped_pole: "talks to me like a person",
};

const OPPOSITE_POLE_ONLY_PAIR = {
  dimension: "feedback tone",
  opposite_pole: "reads like a compliance report",
  reason: "the numbered report stands apart from the other two",
};

const POLES_WITHOUT_REASON_PAIR = {
  dimension: "feedback tone",
  grouped_pole: "talks to me like a person",
  opposite_pole: "reads like a compliance report",
};

describe("ac-B5 clause 1: triadic set — exactly three alternatives, zod parse-or-refuse", () => {
  test("accepts a fuzzy-tagged dimension record with exactly three alternatives and preserves them verbatim", () => {
    const parsed = triadicElicitationSchema.safeParse(FUZZY_DIMENSION_RECORD);
    expect(parsed.success).toBe(true);
    const alternatives = parsed.success ? parsed.data.triadic_alternatives : [];
    expect(alternatives).toHaveLength(3);
    expect(alternatives).toEqual(THREE_ALTERNATIVES);
  });

  test("rejects a record with fewer than three alternatives (negative fixtures)", () => {
    const twoElements = triadicElicitationSchema.safeParse({
      ...FUZZY_DIMENSION_RECORD,
      triadic_alternatives: THREE_ALTERNATIVES.slice(0, 2),
    });
    expect(twoElements.success).toBe(false);
    const issuePaths = twoElements.success
      ? []
      : twoElements.error.issues.map((issue: { path: (string | number)[] }) =>
          issue.path.join("."),
        );
    expect(issuePaths).toContain("triadic_alternatives");

    const oneElement = triadicElicitationSchema.safeParse({
      ...FUZZY_DIMENSION_RECORD,
      triadic_alternatives: THREE_ALTERNATIVES.slice(0, 1),
    });
    expect(oneElement.success).toBe(false);

    const empty = triadicElicitationSchema.safeParse({
      ...FUZZY_DIMENSION_RECORD,
      triadic_alternatives: [],
    });
    expect(empty.success).toBe(false);
  });

  test("rejects a record whose triadic_alternatives field is missing (negative fixture)", () => {
    const { triadic_alternatives: _dropped, ...withoutField } = FUZZY_DIMENSION_RECORD;
    const parsed = triadicElicitationSchema.safeParse(withoutField);
    expect(parsed.success).toBe(false);
    const issuePaths = parsed.success
      ? []
      : parsed.error.issues.map((issue: { path: (string | number)[] }) => issue.path.join("."));
    expect(issuePaths).toContain("triadic_alternatives");
  });

  test("rejects a record with more than three alternatives — exactly three is enforced", () => {
    const fourElements = triadicElicitationSchema.safeParse({
      ...FUZZY_DIMENSION_RECORD,
      triadic_alternatives: [...THREE_ALTERNATIVES, "a fourth spare alternative"],
    });
    expect(fourElements.success).toBe(false);
  });
});

describe("ac-B5 clause 2: bipolar pair completeness — both poles plus reason, 2-state incomplete flag", () => {
  test("judges a pair with both poles and a reason complete, with no incomplete flag (contrast fixture)", () => {
    const result = assessBipolarPair(COMPLETE_BIPOLAR_PAIR);
    expect(result.complete).toBe(true);
    expect(result.incomplete).toBe(false);
  });

  test("raises the incomplete flag when only the grouped pole was captured", () => {
    const result = assessBipolarPair(GROUPED_POLE_ONLY_PAIR);
    expect(result.incomplete).toBe(true);
    expect(result.complete).toBe(false);
  });

  test("raises the incomplete flag when only the opposite pole was captured, even with a reason", () => {
    const result = assessBipolarPair(OPPOSITE_POLE_ONLY_PAIR);
    expect(result.incomplete).toBe(true);
    expect(result.complete).toBe(false);
  });

  test("does not judge a pair complete when the why (reason) field is missing", () => {
    const result = assessBipolarPair(POLES_WITHOUT_REASON_PAIR);
    expect(result.complete).toBe(false);
  });
});

describe("ac-B5 clause 3: 'why does it matter' upward climb — saturation stops it, routing-branch contrast", () => {
  // When the climb is really saturated is fixture-fixed (residual d); only
  // the saturation-mark → stop-signal routing is asserted. The contrast pair
  // below differs in the saturation mark alone — same dimension, same
  // why_chain — so the branch cannot be decided by chain length.
  const SHARED_WHY_CHAIN = [
    "it keeps me reading the feedback",
    "feedback I read changes what I ship",
  ];

  const SATURATED_UPWARD_STATE = {
    dimension: "feedback tone",
    saturated: true,
    why_chain: SHARED_WHY_CHAIN,
  };

  const UNSATURATED_UPWARD_STATE = {
    dimension: "feedback tone",
    saturated: false,
    why_chain: SHARED_WHY_CHAIN,
  };

  // Second pair: chain length is anti-correlated with the expected branch —
  // the one-step chain is saturated (stop) and the three-step chain is not
  // (keep climbing) — so keying on why_chain.length inverts both answers.
  const SATURATED_SHORT_CHAIN_STATE = {
    dimension: "feedback tone",
    saturated: true,
    why_chain: ["it keeps me reading the feedback"],
  };

  const UNSATURATED_LONG_CHAIN_STATE = {
    dimension: "feedback tone",
    saturated: false,
    why_chain: [...SHARED_WHY_CHAIN, "what I ship is the only thing my team ever sees"],
  };

  test("emits a stop signal and schedules no further upward step when marked saturated", () => {
    const routed = routeUpwardLaddering(SATURATED_UPWARD_STATE);
    expect(routed.stop_signal).toBe(true);
    expect(routed.next_upward_scheduled).toBe(false);
  });

  test("contrast: same why_chain, saturation mark off — keeps climbing with no stop signal", () => {
    const routed = routeUpwardLaddering(UNSATURATED_UPWARD_STATE);
    expect(routed.stop_signal).toBe(false);
    expect(routed.next_upward_scheduled).toBe(true);
  });

  test("a one-step chain marked saturated still stops — the mark, not the chain length, routes", () => {
    const routed = routeUpwardLaddering(SATURATED_SHORT_CHAIN_STATE);
    expect(routed.stop_signal).toBe(true);
    expect(routed.next_upward_scheduled).toBe(false);
  });

  test("a three-step chain not marked saturated still climbs — length does not stop the ladder", () => {
    const routed = routeUpwardLaddering(UNSATURATED_LONG_CHAIN_STATE);
    expect(routed.stop_signal).toBe(false);
    expect(routed.next_upward_scheduled).toBe(true);
  });
});

describe("ac-B5 clause 4: ladder carries a downward-path record to observable instances", () => {
  // Whether the instances are genuinely observable is residual (e); the
  // downward output field's existence is enforced parse-or-refuse.
  const DOWNWARD_INSTANCES = [
    "the reply opens with one plain sentence naming what broke",
    "the reviewer quotes the exact failing line before suggesting a fix",
  ];

  const LADDER_WITH_DOWNWARD_PATH = {
    dimension: "feedback tone",
    downward_observable_instances: DOWNWARD_INSTANCES,
  };

  test("accepts a ladder whose downward observable-instances field is present and preserves it verbatim", () => {
    const parsed = ladderSchema.safeParse(LADDER_WITH_DOWNWARD_PATH);
    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.downward_observable_instances : []).toEqual(
      DOWNWARD_INSTANCES,
    );
  });

  test("rejects a ladder missing the downward output field (parse-or-refuse existence)", () => {
    const { downward_observable_instances: _dropped, ...withoutDownward } =
      LADDER_WITH_DOWNWARD_PATH;
    const parsed = ladderSchema.safeParse(withoutDownward);
    expect(parsed.success).toBe(false);
    const issuePaths = parsed.success
      ? []
      : parsed.error.issues.map((issue: { path: (string | number)[] }) => issue.path.join("."));
    expect(issuePaths).toContain("downward_observable_instances");
  });
});

describe("ac-B5 clause 5: captured pair recorded to glossary with both poles verbatim; absence fails", () => {
  // A pair on a different dimension entirely.
  const UNRELATED_PAIR = {
    dimension: "error verbosity",
    grouped_pole: "shows the full stack trace",
    opposite_pole: "hides everything behind an error code",
    reason: "the two verbose modes let me debug without re-running",
  };

  // A decoy on the SAME dimension with different poles: a check that compares
  // dimensions only, and never the pole text, would wrongly call this a match.
  const SAME_DIMENSION_DECOY_PAIR = {
    dimension: "feedback tone",
    grouped_pole: "keeps every sentence under ten words",
    opposite_pole: "spells out the reasoning at length",
    reason: "the terse verdict and the report both refuse small talk",
  };

  // Every string reachable inside a recorded entry, whatever its field layout.
  const textsOf = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(textsOf);
    if (value !== null && typeof value === "object") {
      return Object.values(value as Record<string, unknown>).flatMap(textsOf);
    }
    return [];
  };

  const carriesVerbatim = (entry: unknown, pole: string): boolean =>
    textsOf(entry).some((text) => text.includes(pole));

  // Structurally equal, distinct object graph: defeats reference identity.
  const detachedCopy = <T>(entry: T): T => JSON.parse(JSON.stringify(entry)) as T;

  test("the record is a real glossary entry (ac-21 five-field schema), not the captured pair echoed back", () => {
    const entry = recordBipolarPairToGlossary(COMPLETE_BIPOLAR_PAIR);
    expect(glossaryEntrySchema.safeParse(entry).success).toBe(true);
    expect(entry).not.toBe(COMPLETE_BIPOLAR_PAIR);
    expect(entry).not.toEqual(COMPLETE_BIPOLAR_PAIR);
  });

  test("the glossary entry produced from a complete pair carries both poles verbatim", () => {
    const entry = recordBipolarPairToGlossary(COMPLETE_BIPOLAR_PAIR);
    expect(carriesVerbatim(entry, COMPLETE_BIPOLAR_PAIR.grouped_pole)).toBe(true);
    expect(carriesVerbatim(entry, COMPLETE_BIPOLAR_PAIR.opposite_pole)).toBe(true);
  });

  test("a different pair yields an entry carrying its own poles and not the other pair's", () => {
    const unrelatedEntry = recordBipolarPairToGlossary(UNRELATED_PAIR);
    expect(carriesVerbatim(unrelatedEntry, UNRELATED_PAIR.grouped_pole)).toBe(true);
    expect(carriesVerbatim(unrelatedEntry, UNRELATED_PAIR.opposite_pole)).toBe(true);
    expect(carriesVerbatim(unrelatedEntry, COMPLETE_BIPOLAR_PAIR.grouped_pole)).toBe(false);
    expect(carriesVerbatim(unrelatedEntry, COMPLETE_BIPOLAR_PAIR.opposite_pole)).toBe(false);
  });

  test("a glossary holding a detached copy of the pair's record passes — content, not object identity", () => {
    const entry = detachedCopy(recordBipolarPairToGlossary(COMPLETE_BIPOLAR_PAIR));
    const glossary = [
      recordBipolarPairToGlossary(UNRELATED_PAIR),
      entry,
      recordBipolarPairToGlossary(SAME_DIMENSION_DECOY_PAIR),
    ];
    const checked = checkBipolarGlossaryRecord(COMPLETE_BIPOLAR_PAIR, glossary);
    expect(checked.verdict).toBe("pass");
  });

  test("an empty glossary fails the record check (record-absence fixture)", () => {
    const checked = checkBipolarGlossaryRecord(COMPLETE_BIPOLAR_PAIR, []);
    expect(checked.verdict).toBe("fail");
  });

  test("a glossary holding only an unrelated pair's record still fails — absence is judged per pair", () => {
    const unrelatedEntry = recordBipolarPairToGlossary(UNRELATED_PAIR);
    const checked = checkBipolarGlossaryRecord(COMPLETE_BIPOLAR_PAIR, [unrelatedEntry]);
    expect(checked.verdict).toBe("fail");
  });

  test("a same-dimension decoy record fails — the poles, not the dimension, decide the match", () => {
    const decoyEntry = recordBipolarPairToGlossary(SAME_DIMENSION_DECOY_PAIR);
    const checked = checkBipolarGlossaryRecord(COMPLETE_BIPOLAR_PAIR, [decoyEntry]);
    expect(checked.verdict).toBe("fail");
    // Symmetric: the complete pair's record is likewise not the decoy's record.
    const reverse = checkBipolarGlossaryRecord(SAME_DIMENSION_DECOY_PAIR, [
      recordBipolarPairToGlossary(COMPLETE_BIPOLAR_PAIR),
    ]);
    expect(reverse.verdict).toBe("fail");
  });
});
