/**
 * ac-15 acceptance — U5 plan = teach-back (다른 말+구체 사례 ≥1, 에코 금지).
 * Frozen red: src/interview/charter/directives.ts and
 * src/interview/turn/teachback.ts do not exist yet; the piece-3
 * implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-15.json), covered clauses:
 *  (1) deterministic grep: the revised interview charter/directive source
 *      text exported by src/interview/charter/directives.ts contains the U5
 *      operative-cue — '다른 말+구체 사례 ≥1' and '에코 금지' — asserted as
 *      substring checks scoped to the U5 directive block. Block isolation is
 *      enforced, not merely declared: the returned block must name U5, be a
 *      strict subrange of the exported charter, differ from another
 *      directive's block (an argument-ignoring constant getter fails), and
 *      the U5-specific cue must occur nowhere outside the U5 block. Because
 *      '에코 금지' is deliberately shared with the U1 directive on the same
 *      surface, a masking adversarial case pins that a U5 block which lost
 *      '에코 금지' is judged FAIL even though a whole-file grep still passes.
 *  (2) countable examples (deterministic): the teach-back record structure
 *      exposes concrete examples as an enumerable array field whose length
 *      can be counted; the test deterministically asserts example count ≥1
 *      and that the count tracks the fixture (a constant-shaped return
 *      fails), and violating fixtures — zero examples, a blank example, a
 *      non-array examples value — are detected as violations with distinct
 *      rejection reasons (recording them is rejected).
 *  (3) fixture-turn structural observation (semi-deterministic): a fixture
 *      turn tagged as a plan presentation records a non-empty teach-back
 *      field — a restatement distinct from the original text plus a list of
 *      concrete examples — confirming that teach-back fired. Distinctness is
 *      enforced against violating fixtures, not only witnessed on a
 *      compliant one: a literal echo (restatement identical to the original,
 *      including whitespace-only variation) and an empty/whitespace-only or
 *      missing restatement are rejected with distinct reasons.
 *
 * Residual (NOT tested here, per row residual):
 *  - Teach-back content quality: whether the restatement genuinely preserves
 *    the original meaning while being a different expression (the substance
 *    of 에코 금지), and whether the concrete examples actually illustrate the
 *    plan, are human-judged predicates the contract itself declares residual.
 *    Only the mechanizable floor of 에코 금지 — literal (whitespace-normalized)
 *    identity with the original, and emptiness — is judged here; a
 *    semantically echoing but textually different restatement is accepted.
 *  - Activation compliance outside fixtures: the fixture-turn observation is
 *    semi-deterministic — it only checks the structure of tagged fixture
 *    cases; deciding whether a real conversational turn constitutes a plan
 *    presentation that must fire teach-back is not mechanized here, so no
 *    behaviour is asserted for turns tagged as anything but a plan
 *    presentation.
 *
 * Note: unlike U1/U2, the U5 contract wording carries no separate activation
 * condition phrase (per row draft_passage_found), so no activation-condition
 * grep is asserted.
 */
import { describe, expect, test } from "bun:test";
import { CHARTER_DIRECTIVES, getDirectiveBlock } from "../src/interview/charter/directives";
import { recordTeachbackTurn } from "../src/interview/turn/teachback";

const U5_PARAPHRASE_CUE = "다른 말+구체 사례 ≥1";
const U5_NO_ECHO_CUE = "에코 금지";

// A second directive that lives on the same charter surface. Used to pin
// id-dependence: getDirectiveBlock must answer about the id it was asked
// about, not return one constant. U1 is chosen deliberately — per the
// contract draft its cue also ends in '에코 금지', which is what makes the
// masking case below real rather than hypothetical.
const OTHER_DIRECTIVE_ID = "U1";

// Fixture-fixed teach-back content: whether the restatement truly preserves
// meaning and whether the examples truly illustrate the plan is residual
// (human-judged); the fixture fixes the wording, the test only checks the
// recorded structure and the mechanizable echo floor.
const PLAN_ORIGINAL =
  "매일 자정에 임시 파일을 백업 폴더로 옮기고 7일이 지난 백업본은 삭제하는 계획입니다";
const RESTATEMENT =
  "자정마다 임시 파일이 백업 위치로 이동되고, 일주일을 넘긴 백업본은 자동으로 정리된다는 뜻입니다";
const EXAMPLES = [
  "예: 7월 24일 23시에 생성된 tmp/a.log는 25일 00시에 backup/a.log로 이동된다",
  "예: 7월 17일에 이동된 backup/b.log는 25일 00시 실행에서 삭제 대상이 된다",
];

// A second, differently shaped compliant fixture. Its only job is to make
// constant-shaped returns fail: a record that always answers with the first
// fixture's restatement or its two-element example list cannot satisfy both.
const ALT_RESTATEMENT = "요약하면 임시 파일은 매일 옮겨지고 오래된 백업본은 지워진다는 계획입니다";
const ALT_EXAMPLES = ["예: 오늘 만든 tmp/c.log는 내일 00시에 backup/c.log가 된다"];

// Machine-readable rejection reasons. Distinct codes are required so the
// implementation must actually discriminate the violations rather than
// blanket-throw on anything it does not like.
const REASON_NO_EXAMPLE = "no_concrete_example";
const REASON_BLANK_EXAMPLE = "blank_example";
const REASON_EXAMPLES_NOT_ENUMERABLE = "examples_not_enumerable";
const REASON_ECHO = "echo_restatement";
const REASON_EMPTY_RESTATEMENT = "empty_restatement";

function makePlanTurn(overrides: Record<string, unknown> = {}) {
  return {
    turn_id: "t-plan-1",
    turn_tag: "plan-presentation" as const,
    original: PLAN_ORIGINAL,
    restatement: RESTATEMENT,
    examples: [...EXAMPLES],
    ...overrides,
  };
}

// Everything on the charter surface except the U5 block itself.
function charterOutsideU5Block(): string {
  const block = getDirectiveBlock("U5");
  if (!CHARTER_DIRECTIVES.includes(block)) {
    throw new Error("expected the U5 block to be a substring of the charter text");
  }
  return CHARTER_DIRECTIVES.split(block).join("");
}

// Returns the rejection message, or fails loudly if the fixture was accepted.
function rejectionMessage(turn: Record<string, unknown>): string {
  let recorded: unknown;
  try {
    recorded = recordTeachbackTurn(turn as never);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error(`expected recordTeachbackTurn to reject the fixture, got ${String(recorded)}`);
}

describe("ac-15 clause 1 — U5 operative-cue exists in the revised directives (deterministic grep)", () => {
  test("the U5 directive block carries both cue fragments verbatim", () => {
    const block = getDirectiveBlock("U5");

    expect(block).toContain(U5_PARAPHRASE_CUE);
    expect(block).toContain(U5_NO_ECHO_CUE);
    // It is the U5 block, not some other directive handed back.
    expect(block).toContain("U5");
  });

  test("the returned block is a strict subrange of the exported charter, not the whole text", () => {
    const block = getDirectiveBlock("U5");

    // The cue must live in the injected directive text, not in a detached
    // constant that never reaches the interview surface.
    expect(CHARTER_DIRECTIVES).toContain(block);
    expect(CHARTER_DIRECTIVES).toContain(U5_PARAPHRASE_CUE);
    expect(CHARTER_DIRECTIVES).toContain(U5_NO_ECHO_CUE);

    // Strict: returning the whole charter would collapse every block-scoped
    // grep below into a whole-file grep.
    expect(block.length).toBeLessThan(CHARTER_DIRECTIVES.length);
    expect(block).not.toBe(CHARTER_DIRECTIVES);
  });

  test("the block depends on the requested id and is disjoint from another directive's block", () => {
    const u5Block = getDirectiveBlock("U5");
    const otherBlock = getDirectiveBlock(OTHER_DIRECTIVE_ID);

    // An argument-ignoring constant getter fails here.
    expect(otherBlock).not.toBe(u5Block);
    expect(otherBlock).toContain(OTHER_DIRECTIVE_ID);
    expect(CHARTER_DIRECTIVES).toContain(otherBlock);

    // Neither block swallows the other: they are separate pieces of the
    // surface, so a block grep really is narrower than a file grep.
    expect(u5Block).not.toContain(otherBlock);
    expect(otherBlock).not.toContain(u5Block);
    expect(otherBlock).not.toContain(U5_PARAPHRASE_CUE);
  });

  test("the U5-specific cue occurs nowhere outside the U5 block (whole-file grep cannot stand in)", () => {
    const outside = charterOutsideU5Block();

    // The charter is more than the U5 cue: another directive block lives in
    // the remainder, so the surface is a real multi-directive text.
    expect(outside).toContain(getDirectiveBlock(OTHER_DIRECTIVE_ID));

    // Isolation, enforced: if the U5 block ever loses '다른 말+구체 사례 ≥1',
    // no other cue on the surface can mask that loss.
    expect(outside).not.toContain(U5_PARAPHRASE_CUE);
  });

  test("a U5 block that lost '에코 금지' fails block-level even though whole-file grep still passes", () => {
    const u5Block = getDirectiveBlock("U5");

    // Precondition that makes masking possible at all: '에코 금지' is a
    // shared phrase — the U1 directive on the same surface carries it too.
    expect(charterOutsideU5Block()).toContain(U5_NO_ECHO_CUE);

    const maskedU5 = u5Block.split(U5_NO_ECHO_CUE).join("");
    const adversarialSurface = CHARTER_DIRECTIVES.split(u5Block).join(maskedU5);

    // A whole-file grep is fooled: both cue fragments are still found
    // globally on the adversarial surface.
    expect(adversarialSurface).toContain(U5_PARAPHRASE_CUE);
    expect(adversarialSurface).toContain(U5_NO_ECHO_CUE);

    // The block-level assertion is not fooled: the U5 block itself lost
    // '에코 금지', so this input is judged FAIL.
    expect(maskedU5).toContain(U5_PARAPHRASE_CUE);
    expect(maskedU5).not.toContain(U5_NO_ECHO_CUE);
  });
});

describe("ac-15 clause 2 — concrete examples are countable, count ≥1 enforced (deterministic)", () => {
  test("the teach-back record exposes examples as an enumerable array whose length is counted", () => {
    const recorded = recordTeachbackTurn(makePlanTurn());

    const teachback = recorded.teachback;
    if (!teachback) throw new Error("expected a teach-back record on a plan-presentation turn");

    // Enumerable field (array), length countable, fixture content verbatim.
    expect(Array.isArray(teachback.examples)).toBe(true);
    expect(teachback.examples).toEqual(EXAMPLES);
    expect(teachback.examples.length).toBe(2);
    expect(teachback.examples.length).toBeGreaterThanOrEqual(1);
  });

  test("the recorded example list tracks the fixture rather than a constant list", () => {
    const recorded = recordTeachbackTurn(
      makePlanTurn({
        turn_id: "t-plan-2",
        restatement: ALT_RESTATEMENT,
        examples: [...ALT_EXAMPLES],
      }),
    );

    const teachback = recorded.teachback;
    if (!teachback) throw new Error("expected a teach-back record on a plan-presentation turn");

    // A record that always answers with the first fixture's values fails
    // this pair of assertions.
    expect(teachback.examples).toEqual(ALT_EXAMPLES);
    expect(teachback.examples.length).toBe(1);
    expect(teachback.restatement).toBe(ALT_RESTATEMENT);
    expect(recorded.turn_id).toBe("t-plan-2");
  });

  test("a zero-example teach-back fixture is detected as a violation", () => {
    // Fail-closed: a plan-presentation teach-back with no concrete example
    // must not be recordable as a valid teach-back.
    const message = rejectionMessage(makePlanTurn({ examples: [] }));
    expect(message).toContain(REASON_NO_EXAMPLE);
    expect(message).not.toContain(REASON_ECHO);
  });

  test("a blank example does not count as a concrete example", () => {
    // ['   '] has array length 1 but zero concrete examples; counting the
    // slots instead of the examples is the violation this pins.
    const message = rejectionMessage(makePlanTurn({ examples: ["   "] }));
    expect(message).toContain(REASON_BLANK_EXAMPLE);

    // A blank slot alongside a real example is still a blank slot.
    expect(rejectionMessage(makePlanTurn({ examples: [EXAMPLES[0], ""] }))).toContain(
      REASON_BLANK_EXAMPLE,
    );
  });

  test("a non-array examples value is rejected: the field must be enumerable", () => {
    // A bare string also has a .length ≥ 1, so a length-only check would
    // wave this through as if it were one example.
    const message = rejectionMessage(makePlanTurn({ examples: EXAMPLES[0] }));
    expect(message).toContain(REASON_EXAMPLES_NOT_ENUMERABLE);

    expect(rejectionMessage(makePlanTurn({ examples: undefined }))).toContain(
      REASON_EXAMPLES_NOT_ENUMERABLE,
    );
  });
});

describe("ac-15 clause 3 — plan-presentation fixture turn records a non-empty teach-back (semi-deterministic)", () => {
  test("the tagged fixture turn fires teach-back with restatement + example list, non-empty", () => {
    const recorded = recordTeachbackTurn(makePlanTurn());

    expect(recorded.teachback_fired).toBe(true);
    const teachback = recorded.teachback;
    if (!teachback) throw new Error("expected teach-back to fire on a plan-presentation turn");

    // The original plan text is preserved verbatim on the record so the
    // restatement has an in-record anchor to differ from.
    expect(recorded.turn_id).toBe("t-plan-1");
    expect(recorded.original).toBe(PLAN_ORIGINAL);

    // Non-empty restatement, passed through verbatim, structurally distinct
    // from the original text (whether it is a genuine meaning-preserving
    // paraphrase is residual).
    expect(teachback.restatement).toBe(RESTATEMENT);
    expect(teachback.restatement.length).toBeGreaterThan(0);
    expect(teachback.restatement).not.toBe(recorded.original);

    // Non-empty concrete example list confirms the teach-back field is not
    // an empty shell.
    expect(teachback.examples.length).toBeGreaterThan(0);
  });

  test("a literal echo of the original is rejected — the mechanizable floor of '에코 금지'", () => {
    // Same string back = echo. This is not the residual quality judgement;
    // it is textual identity, which is fully mechanizable.
    const message = rejectionMessage(makePlanTurn({ restatement: PLAN_ORIGINAL }));
    expect(message).toContain(REASON_ECHO);
    expect(message).not.toContain(REASON_NO_EXAMPLE);
  });

  test("an echo dressed up with surrounding whitespace is still an echo", () => {
    const message = rejectionMessage(makePlanTurn({ restatement: `  ${PLAN_ORIGINAL}\n` }));
    expect(message).toContain(REASON_ECHO);
  });

  test("an empty, whitespace-only or missing restatement is rejected as empty, not as an echo", () => {
    const empty = rejectionMessage(makePlanTurn({ restatement: "" }));
    expect(empty).toContain(REASON_EMPTY_RESTATEMENT);
    expect(empty).not.toContain(REASON_ECHO);

    expect(rejectionMessage(makePlanTurn({ restatement: "   \n  " }))).toContain(
      REASON_EMPTY_RESTATEMENT,
    );
    expect(rejectionMessage(makePlanTurn({ restatement: undefined }))).toContain(
      REASON_EMPTY_RESTATEMENT,
    );
  });
});
