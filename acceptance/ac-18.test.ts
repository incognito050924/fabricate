/**
 * ac-18 acceptance — U8 terms by example (Wittgenstein→SbE→GATE): when a term
 * is blurry, do NOT ask for a definition — present concrete examples and have
 * the user split them positive/negative; agreed terms land in the PRODUCT
 * glossary, never in personal memory. Frozen red: the module_plan modules do
 * not exist yet; the piece-3 implementation must turn this file green without
 * editing it.
 *
 * Oracle (gate-a/rows/ac-18.json), covered clauses:
 *  (1) the revised interview charter/directive source text exported by
 *      src/interview/charter/directives.ts contains the U8 operative-cue
 *      '정의 묻지 말고 사례 분류' as a deterministic substring grep, isolated
 *      to the U8 directive block, and the block itself must be part of the
 *      exported charter text (no detached side-channel constant). Isolation is
 *      enforced, not merely asserted in prose: the block is a PROPER part of
 *      the charter (strictly shorter, not equal), it begins at U8's own header
 *      line, and the lookup is keyed by the directive id (an unrelated id must
 *      not yield U8's block or cue) — so an id-ignoring `() => CHARTER`
 *      identity shell cannot pass and cannot let another directive's text mask
 *      U8's own statements.
 *  (2) the same source text states that the landing path for agreed terms is
 *      the PRODUCT glossary and explicitly NOT personal memory — deterministic
 *      grep inside the U8 block (block isolation matters: the pain-case-ledger
 *      cue of ac-23 also says '제품 랜딩, 개인 메모리 아님' and must not mask
 *      U8's own landing statement) — and the glossary landing module
 *      (src/interview/glossary/landing.ts) exports a landing path constant
 *      that is positively a product-artifact FILE path (multi-segment,
 *      separator-bearing, non-empty segments, glossary-naming segment, a
 *      product artifact extension) as well as negatively not a personal-memory
 *      path (relative, no home anchor, no traversal, no .claude / CLAUDE.md /
 *      memory location). The positive shape is what makes the text↔module
 *      drift check non-vacuous: the block must carry the concrete path, which
 *      the bare word 'glossary' would not satisfy.
 *  (3) fixture-turn structural observation (semi-deterministic): a fixture
 *      turn tagged as term-blur produces a recorded turn structure whose
 *      clarification is an example-classification structure — example items
 *      plus a per-example classification field, non-empty, fixture content
 *      passed through verbatim — and NOT a definition-question; the term
 *      record captured from that turn is written to the product glossary
 *      landing path and to no personal-memory path, and no personal-memory
 *      destination appears anywhere in the recorded turn structure; an
 *      untagged ordinary fixture turn does not fire the structure (tag-driven
 *      gating only — real blur detection is residual)
 *
 * Residual (NOT tested here, per row residual):
 *  - Example-classification judgment — whether the presented examples really
 *    carve the term's boundary, and whether the user's positive/negative
 *    split accurately captures the term (Wittgenstein→SbE adequacy), is a
 *    human-judged predicate the contract itself declares residual. The
 *    fixtures fix the examples and their split; only structural presence and
 *    verbatim pass-through are asserted.
 *  - Activation compliance outside fixtures — the fixture-turn observation is
 *    semi-deterministic: it checks only the structure of tagged fixture
 *    cases. Deciding which term in a real conversational turn is 'blurry'
 *    enough to need example classification is not mechanized here.
 *  - Write-sink behaviour beyond the recorded turn structure — the row's
 *    module_plan contains no persistence module, so clause 3's 'written to
 *    the glossary, not to personal memory' is observed on the recorded turn
 *    structure (its declared destinations, and the absence of any personal
 *    destination anywhere in that structure), not on a filesystem effect.
 */
import { describe, expect, test } from "bun:test";
import { CHARTER_DIRECTIVES, getDirectiveBlock } from "../src/interview/charter/directives";
import { GLOSSARY_LANDING_PATH } from "../src/interview/glossary/landing";
import { recordExampleClassificationTurn } from "../src/interview/turn/example-classification";

// Byte-exact Korean cue string required by the locked criterion statement.
const U8_CUE = "정의 묻지 말고 사례 분류";

// Markers whose presence in a landing path would make it a personal-memory
// location instead of a product artifact.
const PERSONAL_MEMORY_MARKERS = ["memory", ".claude", "claude.md", "메모리"];

// Fixture-fixed example classification: which examples are presented and how
// the user splits them positive/negative is residual (human-judged); the
// fixture fixes both, the test only checks structural pass-through.
const BLURRY_TERM = "정합성";
const FIXTURE_EXAMPLES = [
  {
    example: "게이트 행과 계약 문안이 같은 절을 가리키면 이 용어에 해당한다",
    classification: "양성",
  },
  {
    example: "요약이 원문에 없는 절을 새로 만들어내면 이 용어에 해당하지 않는다",
    classification: "음성",
  },
];

function makeFixtureTurn(blur_tag: "term-blur" | "none", turn_id: string) {
  return {
    turn_id,
    blur_tag,
    term: BLURRY_TERM,
    examples: FIXTURE_EXAMPLES.map((item) => ({ ...item })),
  };
}

function firstNonEmptyLine(text: string): string {
  return text.split("\n").find((line) => line.trim().length > 0) ?? "";
}

describe("ac-18 clause 1 — U8 operative-cue exists in the revised directives (deterministic grep)", () => {
  test("the U8 directive block carries the cue '정의 묻지 말고 사례 분류' verbatim", () => {
    expect(getDirectiveBlock("U8")).toContain(U8_CUE);
  });

  test("the U8 block is part of the exported charter source text itself", () => {
    const block = getDirectiveBlock("U8");

    // The cue must live in the injected directive text, not in a detached
    // constant that never reaches the interview surface.
    expect(CHARTER_DIRECTIVES).toContain(block);
    expect(CHARTER_DIRECTIVES).toContain(U8_CUE);
  });

  test("the U8 block is a proper, header-anchored part of the charter — not the whole text", () => {
    const block = getDirectiveBlock("U8");

    // Isolation, not self-containment: returning the entire charter would let
    // any other directive's wording stand in for U8's own statements.
    expect(block).not.toBe(CHARTER_DIRECTIVES);
    expect(block.length).toBeLessThan(CHARTER_DIRECTIVES.length);
    expect(block.trim().length).toBeGreaterThan(0);

    // The block starts at U8's own header line, so the returned span is U8's
    // and begins where U8 begins.
    expect(firstNonEmptyLine(block)).toContain("U8");
  });

  test("the block lookup is keyed by the directive id — an unrelated id yields neither U8's block nor its cue", () => {
    const block = getDirectiveBlock("U8");

    let foreign = "";
    try {
      foreign = getDirectiveBlock("not-a-directive-id");
    } catch {
      // Rejecting an unknown id is an acceptable keyed behaviour; an
      // id-ignoring constant return is not.
      foreign = "";
    }

    expect(foreign).not.toBe(block);
    expect(foreign).not.toContain(U8_CUE);
  });
});

describe("ac-18 clause 2 — glossary(product) landing path stated, personal memory excluded", () => {
  test("the U8 block states the product-glossary landing and the personal-memory exclusion", () => {
    const block = getDirectiveBlock("U8");

    // Block isolation (enforced in clause 1) is what makes these greps mean
    // 'U8 says it', not 'the charter says it somewhere': the ac-23 pain-case
    // ledger cue elsewhere also carries '개인 메모리 아님'.
    expect(block).toContain("glossary");
    expect(block).toContain("제품");
    expect(block).toContain("개인 메모리 아님");
  });

  test("the U8 block names the concrete landing path constant (no drift between text and module)", () => {
    // Non-vacuous because the constant is a multi-segment file path, not the
    // bare word 'glossary' already required by the grep above.
    expect(getDirectiveBlock("U8")).toContain(GLOSSARY_LANDING_PATH);
    expect(GLOSSARY_LANDING_PATH).not.toBe("glossary");
  });

  test("the exported landing path constant is positively shaped as a product-artifact file path", () => {
    const segments = GLOSSARY_LANDING_PATH.split("/");

    // A path, not a word: a directory separator with non-empty segments on
    // both sides.
    expect(GLOSSARY_LANDING_PATH).toContain("/");
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments.filter((segment) => segment.length === 0)).toEqual([]);

    // It names the glossary artifact in a path segment...
    expect(segments.some((segment) => segment.toLowerCase().includes("glossary"))).toBe(true);
    // ...and terminates in a product artifact file, not an open-ended prefix.
    expect(GLOSSARY_LANDING_PATH).toMatch(/\.(md|json|jsonl|ya?ml)$/);
  });

  test("the exported landing path constant stays inside the product tree", () => {
    // Relative, not home-anchored, no traversal escaping the product.
    expect(GLOSSARY_LANDING_PATH.startsWith("/")).toBe(false);
    expect(GLOSSARY_LANDING_PATH.startsWith("~")).toBe(false);
    expect(GLOSSARY_LANDING_PATH).not.toContain("..");
  });

  test("the exported landing path constant is not a personal-memory path", () => {
    const lowered = GLOSSARY_LANDING_PATH.toLowerCase();
    for (const marker of PERSONAL_MEMORY_MARKERS) {
      expect(lowered).not.toContain(marker);
    }
  });
});

describe("ac-18 clause 3 — fixture-turn structure: example classification, not a definition question", () => {
  test("a term-blur fixture turn fires a non-empty example-classification structure", () => {
    const recorded = recordExampleClassificationTurn(makeFixtureTurn("term-blur", "t-blur-1"));

    expect(recorded.clarification_fired).toBe(true);
    const clarification = recorded.clarification;
    if (!clarification) throw new Error("expected clarification to fire on a term-blur turn");

    // The recorded probe is an example-classification structure — asserting
    // the discriminant rules out a definition-question structure.
    expect(clarification.kind).toBe("example-classification");

    // Example items + per-example classification field, non-empty, fixture
    // content passed through verbatim (classification adequacy is residual).
    expect(clarification.examples).toEqual(FIXTURE_EXAMPLES);
    expect(clarification.examples.length).toBeGreaterThan(0);

    // The split carries both poles — examples are classified 양성/음성, not
    // collapsed into a single unlabeled list.
    const classifications = clarification.examples.map((item) => item.classification);
    expect(classifications).toContain("양성");
    expect(classifications).toContain("음성");
  });

  test("the term record from a fired turn lands in the product glossary and nowhere personal", () => {
    const recorded = recordExampleClassificationTurn(makeFixtureTurn("term-blur", "t-blur-2"));

    const termRecord = recorded.term_record;
    if (!termRecord) throw new Error("expected a term record from a term-blur turn");

    // The blurred term is captured verbatim.
    expect(termRecord.term).toBe(BLURRY_TERM);

    // Written to exactly the product glossary landing path — a single
    // declared destination, no second one.
    expect(termRecord.written_to).toEqual([GLOSSARY_LANDING_PATH]);
    expect(termRecord.written_to).toHaveLength(1);

    // And no personal-memory destination hides elsewhere in the recorded turn
    // structure (a second sink recorded under any other field would show up
    // here), while the glossary destination really is present in it.
    const serialized = JSON.stringify(recorded).toLowerCase();
    expect(serialized).toContain(GLOSSARY_LANDING_PATH.toLowerCase());
    for (const marker of PERSONAL_MEMORY_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
  });

  test("an untagged ordinary fixture turn does not fire the structure (tag-driven gating)", () => {
    const recorded = recordExampleClassificationTurn(makeFixtureTurn("none", "t-ordinary-1"));

    expect(recorded.clarification_fired).toBe(false);
    expect(recorded.clarification).toBeUndefined();
    expect(recorded.term_record).toBeUndefined();
    // The turn is still recorded — gating suppresses the probe, not the turn.
    expect(recorded.turn_id).toBe("t-ordinary-1");
  });
});
