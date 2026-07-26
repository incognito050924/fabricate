import { describe, expect, test } from "bun:test";
import { InconsistentGlossaryError, checkGlossaryConsistency } from "./consistency";
import type { GlossaryEntry } from "./entry";
import { AvoidViolationInSurfaceError, renderConceptSurface } from "./render";

const entry = (
  over: Partial<GlossaryEntry> & { concept: string; korean: string },
): GlossaryEntry => ({
  positive_examples: ["긍정 사례"],
  negative_examples: ["부정 사례"],
  avoid: [],
  ...over,
});

describe("checkGlossaryConsistency", () => {
  test("a glossary of well-formed, non-conflicting entries is consistent", () => {
    const report = checkGlossaryConsistency([
      entry({ concept: "a", korean: "판정 기준", avoid: ["수용 기준"] }),
      entry({ concept: "b", korean: "빨간 테스트", avoid: ["레드 테스트"] }),
    ]);

    expect(report.ok).toBe(true);
    expect(report.problems).toEqual([]);
  });

  test("a candidate that is not a five-field entry is reported with its index", () => {
    const report = checkGlossaryConsistency([
      entry({ concept: "a", korean: "판정 기준" }),
      { concept: "b", korean: "빨간 테스트" },
      "그냥 문자열",
    ]);

    expect(report.ok).toBe(false);
    expect(report.problems).toEqual([
      { kind: "not_an_entry", index: 1 },
      { kind: "not_an_entry", index: 2 },
    ]);
  });

  test("two entries claiming the same concept collide — one construct per concept key", () => {
    const report = checkGlossaryConsistency([
      entry({ concept: "feedback tone", korean: "따뜻한 어조" }),
      entry({ concept: "feedback tone", korean: "간결한 어조" }),
    ]);

    expect(report.ok).toBe(false);
    expect(report.problems).toEqual([{ kind: "duplicate_concept", concept: "feedback tone" }]);
  });

  test("one entry's anchor sitting on another entry's avoid list is a conflict naming both", () => {
    const report = checkGlossaryConsistency([
      entry({ concept: "a", korean: "수용 기준" }),
      entry({ concept: "b", korean: "판정 기준", avoid: ["수용 기준"] }),
    ]);

    expect(report.ok).toBe(false);
    expect(report.problems).toEqual([
      { kind: "anchor_hits_avoid", concept: "a", conflicting_concept: "b", term: "수용 기준" },
    ]);
  });

  test("an entry whose anchor hits its OWN avoid list is not this check's business", () => {
    // Self-contradiction is caught where the surface is emitted, scoped to that
    // entry's own list. Reporting it here too would make one of the two guards
    // unreachable, and an unreachable guard is a guard nobody can trust.
    const report = checkGlossaryConsistency([
      entry({ concept: "a", korean: "새 수용 기준", avoid: ["수용 기준"] }),
    ]);

    expect(report).toEqual({ ok: true, problems: [] });
  });

  test("the examples are NOT scanned — an avoid term is exactly what a negative example shows", () => {
    const report = checkGlossaryConsistency([
      entry({
        concept: "a",
        korean: "판정 기준",
        positive_examples: ["이 판정 기준을 만족한다"],
        negative_examples: ["이 수용 기준을 만족한다"],
        avoid: ["수용 기준"],
      }),
    ]);

    expect(report.ok).toBe(true);
  });
});

describe("renderConceptSurface refuses instead of emitting a violating surface", () => {
  test("an inconsistent glossary is refused before any concept is looked up", () => {
    const glossary = [
      entry({ concept: "a", korean: "수용 기준" }),
      entry({ concept: "b", korean: "판정 기준", avoid: ["수용 기준"] }),
    ];

    expect(() => renderConceptSurface(glossary, "a")).toThrow(InconsistentGlossaryError);
  });

  test("a duplicate concept is refused rather than silently rendering the first entry", () => {
    const glossary = [
      entry({ concept: "feedback tone", korean: "따뜻한 어조" }),
      entry({ concept: "feedback tone", korean: "간결한 어조" }),
    ];

    expect(() => renderConceptSurface(glossary, "feedback tone")).toThrow(
      InconsistentGlossaryError,
    );
  });

  test("the emitted surface is scanned against that entry's OWN avoid list", () => {
    const glossary = [entry({ concept: "a", korean: "새 수용 기준", avoid: ["수용 기준"] })];

    expect(() => renderConceptSurface(glossary, "a")).toThrow(AvoidViolationInSurfaceError);
  });

  test("a consistent glossary still renders the anchor verbatim", () => {
    const glossary = [
      entry({ concept: "a", korean: "판정 기준", avoid: ["수용 기준"] }),
      entry({ concept: "b", korean: "빨간 테스트", avoid: ["레드 테스트"] }),
    ];

    expect(renderConceptSurface(glossary, "a")).toBe("판정 기준");
    expect(renderConceptSurface(glossary, "b")).toBe("빨간 테스트");
  });

  test("the surface scanner is exported as a refusal, not a boolean nobody reads", () => {
    expect(AvoidViolationInSurfaceError.prototype).toBeInstanceOf(Error);
  });
});
