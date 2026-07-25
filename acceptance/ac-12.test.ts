/**
 * ac-12 acceptance — U2 said/inferred/assumed attribution marking (Grice).
 * Frozen red: src/interview/charter/directives.ts and
 * src/interview/turn/attribution.ts do not exist yet; the piece-3
 * implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-12.json), covered clauses:
 *  (1) the revised interview charter/directive source text exported by
 *      src/interview/charter/directives.ts contains the U2 operative-cue —
 *      the instruction to mark contributions under the three-way
 *      말한것/추론/가정 classification — asserted as deterministic substring
 *      grep, isolated to the U2 directive block. Isolation is enforced, not
 *      merely asserted in prose: the returned U2 block must be a STRICT
 *      subrange of the charter (never the whole text), must identify itself
 *      as U2, must differ from another directive's block (id-dependence, so
 *      an argument-ignoring constant fails), must be disjoint from that
 *      other block, and the three-way cue must occur NOWHERE outside the U2
 *      block — so a whole-file grep cannot stand in for the block grep. The
 *      cue is one instruction, not two unrelated greps: the classification
 *      and the marking verb must appear adjacent on one line.
 *  (2) the same source text states the activation condition verbatim as
 *      '계획·요약 문턱만' — deterministic substring grep, inside the U2 block
 *      and in the full charter text, and absent from another directive's
 *      block (the condition is U2's own, not a shared surface string)
 *  (3) fixture-turn structural observation (semi-deterministic): a fixture
 *      turn tagged as a plan threshold and one tagged as a summary threshold
 *      each produce a recorded turn structure carrying the three-compartment
 *      attribution field (one compartment per 말한것/추론/가정, labeled with
 *      those exact Korean strings, fixture content passed through verbatim),
 *      while an ordinary non-threshold fixture turn does NOT fire the
 *      marking — the '계획·요약 문턱만' gating is observed in turn structure
 *
 * Residual (NOT tested here, per row residual):
 *  - Classification correctness: whether a given piece of content actually
 *    belongs in the said / inferred / assumed compartment (Grice adequacy)
 *    is a human-judged predicate the contract itself declares residual.
 *    The fixtures fix the classification; only structural pass-through and
 *    compartment presence are asserted.
 *  - Activation compliance outside fixtures: the fixture-turn observation is
 *    semi-deterministic — it only checks the structure of tagged fixture
 *    cases. Deciding whether a real conversational turn constitutes a
 *    plan/summary threshold is not mechanized here.
 */
import { describe, expect, test } from "bun:test";
import { CHARTER_DIRECTIVES, getDirectiveBlock } from "../src/interview/charter/directives";
import { recordAttributedTurn } from "../src/interview/turn/attribution";

const THREE_WAY_CLASSIFICATION = "말한것/추론/가정";
const ACTIVATION_CONDITION = "계획·요약 문턱만";

// The cue is a single instruction: the three-way classification and the
// marking verb sit next to each other on one line, in either order. Two
// unrelated whole-block greps must not be able to satisfy it.
const MARKING_INSTRUCTION =
  /(말한것\/추론\/가정[^\n]{0,30}표기)|(표기[^\n]{0,30}말한것\/추론\/가정)/;

// A second directive that lives on the same charter surface. Used to pin
// id-dependence: getDirectiveBlock must answer about the id it was asked
// about, not return one constant.
const OTHER_DIRECTIVE_ID = "U9";

// Fixture-fixed classified content: which item belongs in which compartment
// is residual (human-judged); the fixture fixes it, the test only checks
// structural pass-through.
const SAID_ITEMS = ["사용자가 임시 파일을 백업 폴더로 옮겨 달라고 말했다"];
const INFERRED_ITEMS = ["이동 후 원본 위치에서 파일이 제거되기를 원한다고 추론했다"];
const ASSUMED_ITEMS = ["백업 폴더가 이미 존재한다고 가정했다"];

const FIXTURE_CONTENT = "임시 파일을 매일 자정에 백업 폴더로 옮기는 계획입니다";

function makeFixtureTurn(threshold_tag: "plan" | "summary" | "none", turn_id: string) {
  return {
    turn_id,
    threshold_tag,
    content: FIXTURE_CONTENT,
    said: [...SAID_ITEMS],
    inferred: [...INFERRED_ITEMS],
    assumed: [...ASSUMED_ITEMS],
  };
}

// Everything on the charter surface except the U2 block itself.
function charterOutsideU2Block(): string {
  const block = getDirectiveBlock("U2");
  if (!CHARTER_DIRECTIVES.includes(block)) {
    throw new Error("expected the U2 block to be a substring of the charter text");
  }
  return CHARTER_DIRECTIVES.split(block).join("");
}

describe("ac-12 clause 1 — U2 operative-cue exists in the revised directives (deterministic grep)", () => {
  test("the U2 directive block carries the three-way marking cue as one instruction", () => {
    const block = getDirectiveBlock("U2");

    expect(block).toContain(THREE_WAY_CLASSIFICATION);
    // Not two independent greps: the classification and the marking verb are
    // adjacent on a single line of the U2 block.
    expect(block).toMatch(MARKING_INSTRUCTION);
  });

  test("the returned block is the U2 block: it names U2 and is a strict subrange of the charter", () => {
    const block = getDirectiveBlock("U2");

    expect(block).toContain("U2");
    expect(CHARTER_DIRECTIVES).toContain(block);
    // Strict: returning the whole charter (which would collapse every
    // block-scoped grep into a whole-file grep) is a failure.
    expect(block.length).toBeLessThan(CHARTER_DIRECTIVES.length);
    expect(block).not.toBe(CHARTER_DIRECTIVES);
  });

  test("the block depends on the requested id and is disjoint from another directive's block", () => {
    const u2Block = getDirectiveBlock("U2");
    const otherBlock = getDirectiveBlock(OTHER_DIRECTIVE_ID);

    // An argument-ignoring constant fails here.
    expect(otherBlock).not.toBe(u2Block);
    expect(otherBlock).toContain(OTHER_DIRECTIVE_ID);
    expect(CHARTER_DIRECTIVES).toContain(otherBlock);

    // Neither block swallows the other: they are separate pieces of the
    // surface, so a block grep really is narrower than a file grep.
    expect(u2Block).not.toContain(otherBlock);
    expect(otherBlock).not.toContain(u2Block);
    expect(otherBlock).not.toContain(THREE_WAY_CLASSIFICATION);
  });

  test("the three-way cue occurs nowhere outside the U2 block (whole-file grep cannot stand in)", () => {
    // The charter is more than the U2 cue: another directive block lives in
    // the remainder, so the surface is a real multi-directive text.
    const outside = charterOutsideU2Block();
    expect(outside).toContain(getDirectiveBlock(OTHER_DIRECTIVE_ID));

    // Isolation, enforced: if the U2 block ever loses the cue, no other cue
    // on the surface can mask that loss.
    expect(outside).not.toContain(THREE_WAY_CLASSIFICATION);
    expect(CHARTER_DIRECTIVES).toContain(THREE_WAY_CLASSIFICATION);
  });
});

describe("ac-12 clause 2 — activation condition '계획·요약 문턱만' is stated (deterministic grep)", () => {
  test("the U2 block states the gating condition verbatim", () => {
    expect(getDirectiveBlock("U2")).toContain(ACTIVATION_CONDITION);
  });

  test("the full charter source text states the gating condition verbatim", () => {
    expect(CHARTER_DIRECTIVES).toContain(ACTIVATION_CONDITION);
  });

  test("the condition is U2's own: another directive's block does not carry it", () => {
    expect(getDirectiveBlock(OTHER_DIRECTIVE_ID)).not.toContain(ACTIVATION_CONDITION);
  });
});

describe("ac-12 clause 3 — fixture-turn structure: marking fires only at plan/summary thresholds", () => {
  test("a plan-threshold fixture turn records the three-compartment attribution field", () => {
    const recorded = recordAttributedTurn(makeFixtureTurn("plan", "t-plan-1"));

    expect(recorded.attribution_fired).toBe(true);
    const attribution = recorded.attribution;
    if (!attribution) throw new Error("expected attribution to fire on a plan-threshold turn");

    // Exactly the three compartments — one per classification.
    expect(Object.keys(attribution).sort()).toEqual(["assumed", "inferred", "said"]);

    // Each compartment is labeled with the exact user-visible Korean string.
    expect(attribution.said.label).toBe("말한것");
    expect(attribution.inferred.label).toBe("추론");
    expect(attribution.assumed.label).toBe("가정");

    // Fixture-classified content passes through verbatim into its own
    // compartment (classification correctness itself is residual).
    expect(attribution.said.items).toEqual(SAID_ITEMS);
    expect(attribution.inferred.items).toEqual(INFERRED_ITEMS);
    expect(attribution.assumed.items).toEqual(ASSUMED_ITEMS);

    // The turn itself is preserved alongside the marking.
    expect(recorded.turn_id).toBe("t-plan-1");
    expect(recorded.content).toBe(FIXTURE_CONTENT);
  });

  test("a summary-threshold fixture turn also fires the marking (계획·요약 covers both)", () => {
    const recorded = recordAttributedTurn(makeFixtureTurn("summary", "t-summary-1"));

    expect(recorded.attribution_fired).toBe(true);
    const attribution = recorded.attribution;
    if (!attribution) throw new Error("expected attribution to fire on a summary-threshold turn");

    expect(Object.keys(attribution).sort()).toEqual(["assumed", "inferred", "said"]);
    expect(attribution.said.label).toBe("말한것");
    expect(attribution.inferred.label).toBe("추론");
    expect(attribution.assumed.label).toBe("가정");
    expect(attribution.said.items).toEqual(SAID_ITEMS);
    expect(attribution.inferred.items).toEqual(INFERRED_ITEMS);
    expect(attribution.assumed.items).toEqual(ASSUMED_ITEMS);
    expect(recorded.turn_id).toBe("t-summary-1");
  });

  test("an ordinary non-threshold fixture turn does not fire the marking (the '만' gating)", () => {
    const recorded = recordAttributedTurn(makeFixtureTurn("none", "t-ordinary-1"));

    expect(recorded.attribution_fired).toBe(false);
    expect(recorded.attribution).toBeUndefined();
    // The turn is still recorded — gating suppresses the marking, not the turn.
    expect(recorded.turn_id).toBe("t-ordinary-1");
    expect(recorded.content).toBe(FIXTURE_CONTENT);
  });
});
