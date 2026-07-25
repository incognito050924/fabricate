/**
 * ac-21 acceptance — reverse-direction (a) agreed-vocabulary anchor: the
 * glossary entry schema enforces five fields (concept, Korean surface term,
 * positive examples, negative examples, avoid list), the rendering path
 * consumes the glossary instead of re-translating, and avoid violations are
 * detected deterministically by grep. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-21.json), covered clauses:
 *  (1) field enforcement (deterministic): the glossary entry schema
 *      (src/interview/glossary/entry.ts) enforces all five fields — an entry
 *      carrying all five parses; dropping any one of the five is refused
 *      (parse-or-refuse).
 *  (2) rendering consumes instead of re-translating (structural): the
 *      rendering path (src/interview/glossary/render.ts) takes the glossary
 *      as input; for a concept that has an entry, the surface (Korean)
 *      output contains that entry's Korean field verbatim and none of the
 *      entry's avoid-list terms. Re-anchoring the Korean term in the input
 *      glossary must swap the rendered output accordingly — the anchor is
 *      consumed from the input, not produced by a built-in translation.
 *  (3) avoid-violation grep detection (deterministic): the avoid scanner
 *      (src/interview/glossary/avoid-scan.ts) reports each violation with
 *      the offending entry and term pointers when surface text contains an
 *      avoid term (substring grep, mid-sentence included), reports zero
 *      violations for clean text (including text that uses the anchored
 *      Korean term itself), and yields identical reports for identical
 *      input.
 *
 * All three checks assert structure (schema enforcement, consuming render
 * path, deterministic scanner), not the existence of a directive — per the
 * locked statement's "현행 지시(translationese 금지)가 있는데도 실패하므로
 * 구조가 필요하다".
 *
 * Residual (NOT tested here, per row residual):
 *  - Vocabulary-choice adequacy — whether the anchored Korean term, the
 *    positive/negative examples, and the avoid list are actually the
 *    vocabulary agreed with the user is a human-judged predicate the
 *    statement itself declares residual.
 *  - Consumption compliance outside fixtures — the render-consumption
 *    assertions are structural checks on fixture cases; ad-hoc translation
 *    of concepts absent from the glossary, and translationese not listed in
 *    any avoid list, are not exhaustively closed here (the avoid grep
 *    deterministically detects listed violations only).
 */
import { describe, expect, test } from "bun:test";
import { scanAvoidViolations } from "../src/interview/glossary/avoid-scan";
import { glossaryEntrySchema } from "../src/interview/glossary/entry";
import { renderConceptSurface } from "../src/interview/glossary/render";

// Fixture glossary. Contents are placeholders exercising the structure; the
// adequacy of the vocabulary itself is residual (see header).
const acceptanceCriterionEntry = {
  concept: "acceptance criterion",
  korean: "판정 기준",
  positive_examples: ["이 판정 기준을 만족하면 조각이 닫힌다."],
  negative_examples: ["이 수용 기준을 만족하면 조각이 닫힌다."],
  avoid: ["수용 기준", "수락 기준"],
};

const redTestEntry = {
  concept: "red test",
  korean: "빨간 테스트",
  positive_examples: ["빨간 테스트가 먼저 실패를 보여 준다."],
  negative_examples: ["레드 테스트가 먼저 실패를 보여 준다."],
  avoid: ["레드 테스트", "적색 테스트"],
};

const glossary = [acceptanceCriterionEntry, redTestEntry];

const FIVE_REQUIRED_FIELDS = [
  "concept",
  "korean",
  "positive_examples",
  "negative_examples",
  "avoid",
] as const;

const withoutField = (entry: Record<string, unknown>, field: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => key !== field));

describe("ac-21 clause 1 — glossary entry schema enforces the five fields (parse-or-refuse)", () => {
  test("an entry carrying all five fields parses", () => {
    const result = glossaryEntrySchema.safeParse(acceptanceCriterionEntry);
    expect(result.success).toBe(true);
  });

  for (const field of FIVE_REQUIRED_FIELDS) {
    test(`an entry missing '${field}' is refused`, () => {
      const incomplete = withoutField(acceptanceCriterionEntry, field);
      expect(glossaryEntrySchema.safeParse(incomplete).success).toBe(false);
    });
  }
});

describe("ac-21 clause 2 — rendering consumes the glossary anchor instead of re-translating", () => {
  test("surface output for an anchored concept contains the entry's Korean field verbatim", () => {
    const output = renderConceptSurface(glossary, "acceptance criterion");
    expect(output).toContain("판정 기준");
  });

  test("the same surface output contains none of the entry's avoid-list terms", () => {
    const output = renderConceptSurface(glossary, "acceptance criterion");
    expect(output).not.toContain("수용 기준");
    expect(output).not.toContain("수락 기준");
  });

  test("each anchored concept is rendered with its own Korean anchor, avoid terms absent", () => {
    const output = renderConceptSurface(glossary, "red test");
    expect(output).toContain("빨간 테스트");
    expect(output).not.toContain("레드 테스트");
    expect(output).not.toContain("적색 테스트");
  });

  test("re-anchoring the Korean term in the input glossary swaps the output (consumption, not built-in translation)", () => {
    const reanchored = [
      { ...acceptanceCriterionEntry, korean: "검수 기준", avoid: ["수용 기준", "판정 기준"] },
      redTestEntry,
    ];
    const output = renderConceptSurface(reanchored, "acceptance criterion");
    expect(output).toContain("검수 기준");
    expect(output).not.toContain("판정 기준");
  });
});

describe("ac-21 clause 3 — avoid violations are detected by deterministic grep", () => {
  test("surface text containing an avoid term is reported with entry and term pointers", () => {
    const text = "이 수용 기준을 만족하면 조각이 닫힌다.";
    const violations = scanAvoidViolations(glossary, text);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      concept: "acceptance criterion",
      term: "수용 기준",
    });
  });

  test("multiple avoid terms across entries are each reported (substring grep, mid-sentence)", () => {
    const text = "레드 테스트가 실패하면 수락 기준을 다시 본다.";
    const violations = scanAvoidViolations(glossary, text);
    expect(violations).toHaveLength(2);
    expect(
      violations.some(
        (violation: { concept: string; term: string }) =>
          violation.concept === "red test" && violation.term === "레드 테스트",
      ),
    ).toBe(true);
    expect(
      violations.some(
        (violation: { concept: string; term: string }) =>
          violation.concept === "acceptance criterion" && violation.term === "수락 기준",
      ),
    ).toBe(true);
  });

  test("text free of avoid terms reports zero violations, even when it uses the anchored Korean terms", () => {
    const text = "이 판정 기준을 만족하면 빨간 테스트가 초록이 된다.";
    expect(scanAvoidViolations(glossary, text)).toHaveLength(0);
  });

  test("detection is deterministic: identical input yields identical reports", () => {
    const text = "적색 테스트라는 말은 피해야 한다.";
    const first = scanAvoidViolations(glossary, text);
    const second = scanAvoidViolations(glossary, text);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ concept: "red test", term: "적색 테스트" });
    expect(second).toEqual(first);
  });
});
