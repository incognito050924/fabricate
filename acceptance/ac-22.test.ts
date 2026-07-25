/**
 * ac-22 acceptance — reverse-direction (b): no forced translation.
 * Frozen red: the modules under src/interview/ do not exist yet; the piece-3
 * implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-22.json), covered clauses:
 *  (1) cue existence (deterministic grep) — the revised directive text
 *      exported by src/interview/charter/directives.ts carries the
 *      reverse-direction (b) operative-cue: the three phrases
 *      '자연 등가 없는 하중 용어', '영어 유지', '억지 번역' exist as
 *      substrings, AND all three are detected inside ONE cue sentence
 *      together with the priority direction — a '>' ordering in which
 *      '영어 유지' precedes '억지 번역'. Phrases scattered across separate
 *      sentences, a sentence without the '>' ordering, or an inverted
 *      priority ('억지 번역 > 영어 유지') must not satisfy the detector.
 *  (2) coherence with the separation decision (deterministic, structural
 *      level) — the rendering language-policy text exported by
 *      src/interview/render/language-policy.ts states the
 *      internal-English/user-Korean separation decision
 *      ('내부-영어/사용자-한국어 분리'), declares English retention of
 *      load-bearing terms as an explicit exception ('예외') to the
 *      user-Korean surface norm within one sentence, and the two surfaces
 *      cross-reference each other: the policy text carries the cue anchor
 *      ('자연 등가 없는 하중 용어') and the directive text carries the
 *      decision anchor. Neither surface declares the inverted priority.
 *
 * Residual (NOT tested here, per row residual):
 *  - Per-term translation judgment — whether a specific term IS a
 *    load-bearing term without a natural equivalent, and whether keeping it
 *    in English or translating it is right, is a human-judged predicate;
 *    only the cue string's existence is machine-checked.
 *  - Semantic depth of coherence — agreement with the separation decision is
 *    detected only at the structural level (phrase coexistence + direction
 *    match); deeper semantic coherence is not closed by this test.
 *  - Behavioral compliance — whether actual rendering turns keep
 *    load-bearing terms in English without forced translation is not closed
 *    here (agreed-vocabulary avoid-violation grep belongs to ac-21;
 *    failure-case ledger/regression belongs to ac-23).
 */
import { describe, expect, test } from "bun:test";
import { CHARTER_DIRECTIVES_TEXT } from "../src/interview/charter/directives";
import { LANGUAGE_POLICY_TEXT } from "../src/interview/render/language-policy";

const LOAD_TERM_PHRASE = "자연 등가 없는 하중 용어";
const KEEP_ENGLISH_PHRASE = "영어 유지";
const FORCED_TRANSLATION_PHRASE = "억지 번역";
const INVERTED_PRIORITY = "억지 번역 > 영어 유지";
const SEPARATION_DECISION_PHRASE = "내부-영어/사용자-한국어 분리";
const EXCEPTION_MARKER = "예외";
const LOAD_TERM_ANCHOR = "하중 용어";

/**
 * Sentence units are maximal runs between newlines and sentence-ending
 * punctuation. None of the asserted Korean phrases contain these
 * delimiters, so splitting can only make the same-sentence requirement
 * stricter, never looser.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[\n.!?]+/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
}

/**
 * Finds the reverse-direction (b) cue sentence: one sentence containing all
 * three phrases with the priority direction '영어 유지' -> '>' ->
 * '억지 번역'. Returns null when no sentence qualifies.
 */
function findReverseCueSentence(text: string): string | null {
  for (const sentence of splitSentences(text)) {
    if (!sentence.includes(LOAD_TERM_PHRASE)) continue;
    const keepIndex = sentence.indexOf(KEEP_ENGLISH_PHRASE);
    const forcedIndex = sentence.indexOf(FORCED_TRANSLATION_PHRASE);
    if (keepIndex < 0 || forcedIndex < 0) continue;
    const priorityIndex = sentence.indexOf(">", keepIndex + KEEP_ENGLISH_PHRASE.length);
    if (priorityIndex < 0) continue;
    if (keepIndex < priorityIndex && priorityIndex < forcedIndex) return sentence;
  }
  return null;
}

function reverseCueSentenceOrThrow(text: string): string {
  const sentence = findReverseCueSentence(text);
  if (sentence === null) {
    throw new Error("expected a reverse-direction (b) cue sentence in the directive text");
  }
  return sentence;
}

/**
 * Finds the sentence that declares English retention of load-bearing terms
 * as an explicit exception: one sentence carrying '하중 용어', '영어 유지'
 * and '예외' together. Returns null when no sentence qualifies.
 */
function findExceptionDeclarationSentence(text: string): string | null {
  for (const sentence of splitSentences(text)) {
    if (
      sentence.includes(LOAD_TERM_ANCHOR) &&
      sentence.includes(KEEP_ENGLISH_PHRASE) &&
      sentence.includes(EXCEPTION_MARKER)
    ) {
      return sentence;
    }
  }
  return null;
}

describe("ac-22 clause 1 — reverse-direction (b) operative-cue exists (deterministic grep)", () => {
  test("all three cue phrases are present as substrings of the directive surface", () => {
    expect(CHARTER_DIRECTIVES_TEXT).toContain(LOAD_TERM_PHRASE);
    expect(CHARTER_DIRECTIVES_TEXT).toContain(KEEP_ENGLISH_PHRASE);
    expect(CHARTER_DIRECTIVES_TEXT).toContain(FORCED_TRANSLATION_PHRASE);
  });

  test("the three phrases are detected together inside one cue sentence", () => {
    const cue = findReverseCueSentence(CHARTER_DIRECTIVES_TEXT);
    expect(cue).not.toBeNull();
    if (cue === null) throw new Error("unreachable");

    expect(cue).toContain(LOAD_TERM_PHRASE);
    expect(cue).toContain(KEEP_ENGLISH_PHRASE);
    expect(cue).toContain(FORCED_TRANSLATION_PHRASE);
  });

  test("priority direction inside the cue sentence: '영어 유지' precedes '억지 번역' with '>' between them", () => {
    const cue = reverseCueSentenceOrThrow(CHARTER_DIRECTIVES_TEXT);

    const keepIndex = cue.indexOf(KEEP_ENGLISH_PHRASE);
    const priorityIndex = cue.indexOf(">", keepIndex + KEEP_ENGLISH_PHRASE.length);
    const forcedIndex = cue.indexOf(FORCED_TRANSLATION_PHRASE);

    expect(keepIndex).toBeGreaterThanOrEqual(0);
    expect(priorityIndex).toBeGreaterThan(keepIndex);
    expect(forcedIndex).toBeGreaterThan(priorityIndex);
  });

  test("the same-sentence detector is not satisfiable by proxy (fixture self-check)", () => {
    // Phrases scattered across separate sentences: whole-file grep would
    // pass, the one-cue-sentence requirement must not.
    const scattered = [
      "자연 등가 없는 하중 용어를 다룬다.",
      "영어 유지 원칙이 따로 있다.",
      "억지 번역은 나쁘다.",
    ].join("\n");
    expect(findReverseCueSentence(scattered)).toBeNull();

    // All three phrases in one sentence but without the '>' priority order.
    const noPriority = "자연 등가 없는 하중 용어는 영어 유지와 억지 번역 사이에서 고민한다";
    expect(findReverseCueSentence(noPriority)).toBeNull();

    // Inverted priority direction must be rejected.
    const inverted = `자연 등가 없는 하중 용어는 ${INVERTED_PRIORITY}`;
    expect(findReverseCueSentence(inverted)).toBeNull();

    // The canonical cue sentence must be accepted.
    const canonical = "자연 등가 없는 하중 용어는 영어 유지 > 억지 번역";
    expect(findReverseCueSentence(canonical)).toBe(canonical);
  });
});

describe("ac-22 clause 2 — coherence with the internal-English/user-Korean separation decision (structural)", () => {
  test("the rendering language-policy text states the separation decision", () => {
    expect(LANGUAGE_POLICY_TEXT).toContain(SEPARATION_DECISION_PHRASE);
  });

  test("English retention of load-bearing terms is declared as an explicit exception in one policy sentence", () => {
    const declaration = findExceptionDeclarationSentence(LANGUAGE_POLICY_TEXT);
    expect(declaration).not.toBeNull();
    if (declaration === null) throw new Error("unreachable");

    expect(declaration).toContain(LOAD_TERM_ANCHOR);
    expect(declaration).toContain(KEEP_ENGLISH_PHRASE);
    expect(declaration).toContain(EXCEPTION_MARKER);
  });

  test("the exception detector is sentence-scoped (fixture self-check)", () => {
    // Tokens scattered across separate sentences must not qualify as an
    // explicit exception declaration.
    const scattered = ["하중 용어가 있다.", "영어 유지가 원칙이다.", "예외는 없다."].join("\n");
    expect(findExceptionDeclarationSentence(scattered)).toBeNull();

    const canonical = "사용자-한국어 표면 규범의 예외로서 하중 용어는 영어 유지를 허용한다";
    expect(findExceptionDeclarationSentence(canonical)).toBe(canonical);
  });

  test("coexistence + cross-reference: each surface carries the other's anchor", () => {
    // The policy text references the cue's subject verbatim.
    expect(LANGUAGE_POLICY_TEXT).toContain(LOAD_TERM_PHRASE);
    // The directive surface references the separation decision verbatim.
    expect(CHARTER_DIRECTIVES_TEXT).toContain(SEPARATION_DECISION_PHRASE);
  });

  test("same direction: neither surface declares the inverted priority", () => {
    expect(CHARTER_DIRECTIVES_TEXT).not.toContain(INVERTED_PRIORITY);
    expect(LANGUAGE_POLICY_TEXT).not.toContain(INVERTED_PRIORITY);
  });
});
