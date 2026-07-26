import { describe, expect, test } from "bun:test";
import { STATIC_COPY_CATALOG } from "../i18n/static-copy-catalog";
import { scanAvoidViolations } from "./avoid-scan";
import { checkGlossaryConsistency } from "./consistency";
import { glossaryEntrySchema } from "./entry";
import { INTERVIEW_GLOSSARY, glossaryAvoidTerms } from "./interview-vocabulary";

describe("INTERVIEW_GLOSSARY is a real glossary, not a term list", () => {
  test("every member parses as an ac-21 five-field entry", () => {
    expect(INTERVIEW_GLOSSARY.length).toBeGreaterThan(0);
    for (const entry of INTERVIEW_GLOSSARY) {
      expect(glossaryEntrySchema.safeParse(entry).success).toBe(true);
    }
  });

  test("the glossary is self-consistent — no duplicate concept, no anchor on an avoid list", () => {
    expect(checkGlossaryConsistency(INTERVIEW_GLOSSARY)).toEqual({ ok: true, problems: [] });
  });

  test("every entry carries at least one rejected wording — an avoid-less entry screens nothing", () => {
    for (const entry of INTERVIEW_GLOSSARY) {
      expect(entry.avoid.length).toBeGreaterThan(0);
    }
  });

  test("each entry's negative examples demonstrate its own rejected wording", () => {
    for (const entry of INTERVIEW_GLOSSARY) {
      const shown = scanAvoidViolations([entry], entry.negative_examples.join(" "));
      expect(shown.length).toBeGreaterThan(0);
    }
  });
});

describe("glossaryAvoidTerms derives the avoid list — it is never written down twice", () => {
  test("the derived list is the union of the entries' avoid lists, first-seen order", () => {
    const derived = glossaryAvoidTerms([
      {
        concept: "a",
        korean: "가",
        positive_examples: ["가"],
        negative_examples: ["나"],
        avoid: ["나", "다"],
      },
      {
        concept: "b",
        korean: "라",
        positive_examples: ["라"],
        negative_examples: ["다"],
        avoid: ["다", "마"],
      },
    ]);

    expect(derived).toEqual(["나", "다", "마"]);
  });

  test("an empty glossary derives an empty list — nothing is invented", () => {
    expect(glossaryAvoidTerms([])).toEqual([]);
  });

  test("the interview list is non-empty, deduplicated, trimmed and Korean", () => {
    const terms = glossaryAvoidTerms(INTERVIEW_GLOSSARY);

    expect(terms.length).toBeGreaterThan(0);
    expect(new Set(terms).size).toBe(terms.length);
    for (const term of terms) {
      expect(term.trim()).toBe(term);
      expect(/[가-힣]/.test(term)).toBe(true);
    }
  });
});

describe("the avoid list actually reaches the real interview surface", () => {
  test("no copy in the live catalog contains a rejected wording", () => {
    for (const [key, entry] of Object.entries(STATIC_COPY_CATALOG)) {
      expect({ key, hits: scanAvoidViolations(INTERVIEW_GLOSSARY, entry.ko) }).toEqual({
        key,
        hits: [],
      });
    }
  });

  test("a rejected wording planted in real catalog copy IS caught (the list is live, not decorative)", () => {
    const [term] = glossaryAvoidTerms(INTERVIEW_GLOSSARY);
    const planted = `${term} 안내를 확인하세요`;

    expect(scanAvoidViolations(INTERVIEW_GLOSSARY, planted)).toHaveLength(1);
  });
});
