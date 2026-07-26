import { describe, expect, test } from "bun:test";
import { checkGlossaryConsistency } from "../glossary/consistency";
import { renderConceptSurface } from "../glossary/render";
import {
  checkBipolarGlossaryRecord,
  conceptOf,
  recordBipolarPairToGlossary,
} from "./glossary-record";
import { ladderSchema } from "./ladder-updown";

const PAIR = {
  dimension: "feedback tone",
  grouped_pole: "talks to me like a person",
  opposite_pole: "reads like a compliance report",
  reason: "the verdict and the walkthrough both feel like a colleague answering",
};

const SECOND_CONSTRUCT_SAME_DIMENSION = {
  dimension: "feedback tone",
  grouped_pole: "keeps every sentence under ten words",
  opposite_pole: "spells out the reasoning at length",
  reason: "the terse verdict and the report both refuse small talk",
};

describe("one dimension can hold several constructs", () => {
  test("the concept key names the construct, not the dimension alone", () => {
    const first = recordBipolarPairToGlossary(PAIR);
    const second = recordBipolarPairToGlossary(SECOND_CONSTRUCT_SAME_DIMENSION);

    expect(first.concept).toBe(conceptOf(PAIR.dimension, PAIR.grouped_pole));
    expect(first.concept).not.toBe(second.concept);
  });

  test("two constructs on one dimension form a consistent glossary and each renders", () => {
    const first = recordBipolarPairToGlossary(PAIR);
    const second = recordBipolarPairToGlossary(SECOND_CONSTRUCT_SAME_DIMENSION);
    const glossary = [first, second];

    expect(checkGlossaryConsistency(glossary)).toEqual({ ok: true, problems: [] });
    expect(renderConceptSurface(glossary, first.concept)).toBe(PAIR.grouped_pole);
    expect(renderConceptSurface(glossary, second.concept)).toBe(
      SECOND_CONSTRUCT_SAME_DIMENSION.grouped_pole,
    );
  });

  // The concept key joins two pieces of verbatim user text. A naive join is
  // ambiguous — ("tone", "warm — plain") and ("tone — warm", "plain") produce
  // the same key — and an ambiguous key makes an absence detector answer
  // "recorded" about a construct nobody recorded.
  test("the separator appearing inside the user's own text cannot forge another construct's key", () => {
    const SEPARATOR_IN_POLE = {
      dimension: "tone",
      grouped_pole: "warm — plain",
      opposite_pole: "cold and ornate",
      reason: "the two warm ones sit together",
    };
    const SEPARATOR_IN_DIMENSION = {
      dimension: "tone — warm",
      grouped_pole: "plain",
      opposite_pole: "ornate",
      reason: "the plain ones sit together",
    };

    expect(conceptOf(SEPARATOR_IN_POLE.dimension, SEPARATOR_IN_POLE.grouped_pole)).not.toBe(
      conceptOf(SEPARATOR_IN_DIMENSION.dimension, SEPARATOR_IN_DIMENSION.grouped_pole),
    );
  });

  test("neither of the colliding constructs is judged recorded by the other's entry", () => {
    const SEPARATOR_IN_POLE = {
      dimension: "tone",
      grouped_pole: "warm — plain",
      opposite_pole: "cold and ornate",
      reason: "the two warm ones sit together",
    };
    const SEPARATOR_IN_DIMENSION = {
      dimension: "tone — warm",
      grouped_pole: "plain",
      opposite_pole: "ornate",
      reason: "the plain ones sit together",
    };

    expect(
      checkBipolarGlossaryRecord(SEPARATOR_IN_DIMENSION, [
        recordBipolarPairToGlossary(SEPARATOR_IN_POLE),
      ]).verdict,
    ).toBe("fail");
    expect(
      checkBipolarGlossaryRecord(SEPARATOR_IN_POLE, [
        recordBipolarPairToGlossary(SEPARATOR_IN_DIMENSION),
      ]).verdict,
    ).toBe("fail");

    // …while each is still recognised in its own record.
    expect(
      checkBipolarGlossaryRecord(SEPARATOR_IN_POLE, [
        recordBipolarPairToGlossary(SEPARATOR_IN_POLE),
      ]).verdict,
    ).toBe("pass");
    expect(
      checkBipolarGlossaryRecord(SEPARATOR_IN_DIMENSION, [
        recordBipolarPairToGlossary(SEPARATOR_IN_DIMENSION),
      ]).verdict,
    ).toBe("pass");
  });

  // The two fixtures above pin one collision. They cannot pin the PROPERTY that
  // makes the key safe — injectivity — and a one-character slip (replaceAll →
  // replace) breaks injectivity while leaving both fixtures green. So the
  // property is searched rather than exemplified: every distinct (dimension,
  // grouped pole) pair over an alphabet built to stress the separator must
  // produce a distinct key.
  test("the concept key is injective: no two distinct constructs share a key", () => {
    const ALPHABET = ["a", " ", "—", "——", "–", "―", "-", " — ", "  "];
    const DEPTH = 3;

    let level = [""];
    const pieces = new Set<string>();
    for (let i = 0; i < DEPTH; i++) {
      level = level.flatMap((prefix) => ALPHABET.map((atom) => prefix + atom));
      for (const piece of level) pieces.add(piece);
    }

    const keys = new Set<string>();
    const collisions: string[] = [];
    for (const dimension of pieces) {
      for (const grouped of pieces) {
        const key = conceptOf(dimension, grouped);
        if (keys.has(key)) collisions.push(key);
        keys.add(key);
      }
    }

    expect({ pairs: pieces.size ** 2, collisions: collisions.length }).toEqual({
      pairs: pieces.size ** 2,
      collisions: 0,
    });
  });
});

describe("the record check demands an ENTRY, not two substrings somewhere", () => {
  test("the pair recording itself is not a record of the pair", () => {
    expect(checkBipolarGlossaryRecord(PAIR, [PAIR]).verdict).toBe("fail");
  });

  test("an arbitrary object that merely contains both pole strings fails", () => {
    expect(
      checkBipolarGlossaryRecord(PAIR, [{ junk: `${PAIR.grouped_pole} ${PAIR.opposite_pole}` }])
        .verdict,
    ).toBe("fail");
  });

  test("a bare string containing both poles fails", () => {
    expect(
      checkBipolarGlossaryRecord(PAIR, [`${PAIR.grouped_pole} ${PAIR.opposite_pole}`]).verdict,
    ).toBe("fail");
  });

  test("an entry with the right poles but a foreign concept key fails", () => {
    const entry = { ...recordBipolarPairToGlossary(PAIR), concept: "feedback tone" };

    expect(checkBipolarGlossaryRecord(PAIR, [entry]).verdict).toBe("fail");
  });

  test("an entry whose poles sit in the wrong fields fails — the sides are not interchangeable", () => {
    const swapped = {
      ...recordBipolarPairToGlossary(PAIR),
      positive_examples: [PAIR.opposite_pole],
      negative_examples: [PAIR.grouped_pole],
    };

    expect(checkBipolarGlossaryRecord(PAIR, [swapped]).verdict).toBe("fail");
  });

  // The swapped fixture above fails on the POSITIVE side first, so it can never
  // observe the negative side. This one is right everywhere except there.
  test("an entry right on the grouped side but not carrying the opposite pole fails", () => {
    const opposiveMissing = {
      ...recordBipolarPairToGlossary(PAIR),
      negative_examples: ["something else entirely"],
    };

    expect(checkBipolarGlossaryRecord(PAIR, [opposiveMissing]).verdict).toBe("fail");
  });

  // Everything the concept-key and pole-placement checks look at is correct
  // here; only entry-hood is not. Without the schema parse this is a pass.
  test("a near-entry with the right key and the right poles but missing fields fails", () => {
    const nearEntry = {
      concept: conceptOf(PAIR.dimension, PAIR.grouped_pole),
      positive_examples: [PAIR.grouped_pole],
      negative_examples: [PAIR.opposite_pole],
    };

    expect(checkBipolarGlossaryRecord(PAIR, [nearEntry]).verdict).toBe("fail");
  });

  test("a five-field candidate whose fields hold the wrong types fails as a non-entry", () => {
    const wrongTypes = {
      ...recordBipolarPairToGlossary(PAIR),
      avoid: "nothing to avoid",
    };

    expect(checkBipolarGlossaryRecord(PAIR, [wrongTypes]).verdict).toBe("fail");
  });

  test("the entry the recorder actually produces passes", () => {
    expect(checkBipolarGlossaryRecord(PAIR, [recordBipolarPairToGlossary(PAIR)]).verdict).toBe(
      "pass",
    );
  });
});

describe("the ladder record can carry both ends", () => {
  test("one record holds the downward instances and the upward chain together", () => {
    const parsed = ladderSchema.safeParse({
      dimension: "feedback tone",
      downward_observable_instances: ["the reply opens with one plain sentence"],
      why_chain: ["it keeps me reading the feedback"],
      saturated: true,
    });

    expect(parsed.success).toBe(true);
  });

  test("the upward half stays optional — a downward-only ladder is still a ladder", () => {
    const parsed = ladderSchema.safeParse({
      dimension: "feedback tone",
      downward_observable_instances: ["the reply opens with one plain sentence"],
    });

    expect(parsed.success).toBe(true);
  });

  test("the record is still strict — an undeclared field is refused", () => {
    const parsed = ladderSchema.safeParse({
      dimension: "feedback tone",
      downward_observable_instances: ["the reply opens with one plain sentence"],
      surprise: true,
    });

    expect(parsed.success).toBe(false);
  });
});
