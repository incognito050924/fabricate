/**
 * ac-13 acceptance — U3 speech-act force respect (화행론): the revised
 * interview directives gain the NEW operative-cue "no promoting
 * preferences/asides to demands", while the rebuilt charter PRESERVES the
 * existing §3 cue "do not read questions/status checks as go-ahead
 * instructions". Red-frozen.
 *
 * Oracle (gate-a/rows/ac-13.json), covered clauses:
 *  (1) new cue — the revised interview-surface directive source text exported
 *      by src/interview/charter/directives.ts contains the U3 operative-cue
 *      '선호·혼잣말을 요구로 승격 금지' as a deterministic substring grep
 *      (byte-exact Korean). The cue is pinned to the SAME exported surface the
 *      sibling U-tests grep (the surface is reached under all of its exported
 *      names, and the U3 cue sits inside an extractable U3 block that is a
 *      strict subrange of that surface) — so a detached constant that never
 *      reaches the interview surface, or a third alias carrying only the cue,
 *      does not satisfy this clause.
 *  (2) regression guard — the rebuilt charter source text exported by
 *      src/interview/charter/charter.ts still contains the existing §3 cue
 *      '질문·상태확인을 착수지시로 안 읽음' as a deterministic substring grep;
 *      removing or rewording that phrase turns this test red
 *      (preservation-only assertion).
 *  (3) separation — the two greps are separate test cases: clause 1 is the
 *      only new-addition check, and the clause-2 preservation case carries
 *      exactly one assertion with no new requirement attached to it
 *      ("신규 가치는 전자에만" per the locked statement).
 *
 * Subject identification (not a new requirement): clause 2's regression guard
 * presupposes a subject — the rebuilt charter. A lone constant holding only
 * the §3 cue preserves nothing, because there is no charter to regress from.
 * A separate case therefore identifies the subject using only OTHER
 * pre-existing charter content (the current charter's 'translationese 금지'
 * directive, quoted by the contract as already living in charter.ts) plus
 * structural facts (the §3 cue is a strict subrange of a multi-line document,
 * and the two cues occupy distinct locations). This demands nothing new of the
 * charter — it only pins that the text under test is the charter — and it is
 * kept out of the preservation-only case so clause 3 stays intact.
 *
 * Scope note: unlike U1/U2, the U3 item and the ac-13 statement declare no
 * trigger condition, so no trigger-gating check is included (per the row's
 * draft_passage_found note). The check range is limited to cue existence +
 * regression preservation via deterministic grep, exactly as the statement
 * self-declares.
 *
 * Residual (NOT tested here, per row residual):
 *  - Force classification judgment — whether a real utterance is a
 *    preference/aside versus a binding demand, or a question/status check
 *    versus a go-ahead instruction, is a human-judged speech-act call; the
 *    machine checks only cue-string existence and preservation.
 *  - Behavioral compliance — grep inspects the directive/charter source text
 *    only, so whether actual conversation turns really avoid promoting
 *    preferences/asides to demands (and avoid reading questions/status
 *    checks as go-ahead) is not closed by this verdict; structural blocking
 *    via the speech-act 6-force enum gate belongs to ac-B4.
 */
import { describe, expect, test } from "bun:test";
import { charterText } from "../src/interview/charter/charter";
import {
  CHARTER_DIRECTIVES,
  CHARTER_DIRECTIVES_TEXT,
  directivesText,
  getDirectiveBlock,
} from "../src/interview/charter/directives";

// Byte-exact Korean cue strings required by the locked criterion statement.
const NEW_U3_CUE = "선호·혼잣말을 요구로 승격 금지";
const EXISTING_SECTION_3_CUE = "질문·상태확인을 착수지시로 안 읽음";

// A different, pre-existing charter directive quoted verbatim by the contract
// as already present in the current charter (contract-draft.md line 193:
// 현행 지시(charter.ts:83 "translationese 금지")). Used only to identify the
// subject of the clause-2 regression guard — nothing new is demanded of it.
const EXISTING_CHARTER_NEIGHBOUR_CUE = "translationese 금지";

function u3DirectiveBlock(): string {
  const block = getDirectiveBlock("U3");
  if (typeof block !== "string" || block.length === 0) {
    throw new Error("expected a non-empty U3 directive block on the interview surface");
  }
  return block;
}

function nonEmptyLineCount(text: string): number {
  return text.split("\n").filter((line) => line.trim().length > 0).length;
}

describe("ac-13 clause 1 — new U3 operative-cue exists in the revised directives", () => {
  test("the revised directive source text contains '선호·혼잣말을 요구로 승격 금지' (deterministic grep)", () => {
    // The new value of ac-13 lives in this assertion: the revised
    // interview-surface directives must carry the new speech-act cue
    // verbatim. An empty or unrelated directives string fails here.
    expect(directivesText).toContain(NEW_U3_CUE);
  });

  test("the U3 cue lives inside an extractable U3 block, not loose on the surface", () => {
    const block = u3DirectiveBlock();

    expect(block).toContain(NEW_U3_CUE);
    // The block is part of the injected surface itself, and only part of it —
    // a surface that IS the cue (a bare constant) fails the strict subrange.
    expect(directivesText).toContain(block);
    expect(block.length).toBeLessThan(directivesText.length);
  });

  test("the cue reaches the same exported interview surface every U-test greps", () => {
    // The directives module is imported under three names across the U-tests
    // (directivesText / CHARTER_DIRECTIVES / CHARTER_DIRECTIVES_TEXT). They
    // must denote one and the same text, otherwise the U3 cue could be parked
    // on a third alias that no interview turn ever sees.
    expect(CHARTER_DIRECTIVES).toBe(directivesText);
    expect(CHARTER_DIRECTIVES_TEXT).toBe(directivesText);
    expect(CHARTER_DIRECTIVES).toContain(NEW_U3_CUE);
    expect(CHARTER_DIRECTIVES_TEXT).toContain(NEW_U3_CUE);
  });
});

describe("ac-13 clause 2 — regression guard preserves the existing §3 cue in the charter", () => {
  test("charter source text still contains '질문·상태확인을 착수지시로 안 읽음' (preservation-only)", () => {
    // Preservation-only assertion: this case demands nothing new of the
    // charter — it only pins the pre-existing §3 cue so that removing or
    // rewording the phrase during the charter rebuild turns this red.
    expect(charterText).toContain(EXISTING_SECTION_3_CUE);
  });

  test("the guarded subject is the rebuilt charter document, not the cue alone", () => {
    // Subject identification only: every string checked here is pre-existing
    // charter content, so no new requirement is attached to the preservation.
    expect(charterText).toContain(EXISTING_CHARTER_NEIGHBOUR_CUE);

    // The two pre-existing cues occupy distinct locations: deleting either one
    // leaves the other standing, so neither is a proxy for the other.
    expect(charterText.replaceAll(EXISTING_SECTION_3_CUE, "")).toContain(
      EXISTING_CHARTER_NEIGHBOUR_CUE,
    );
    expect(charterText.replaceAll(EXISTING_CHARTER_NEIGHBOUR_CUE, "")).toContain(
      EXISTING_SECTION_3_CUE,
    );

    // The §3 cue is a strict subrange of a multi-line charter document, not
    // the whole of it — a two-line constant shell fails this floor.
    expect(charterText.length).toBeGreaterThan(EXISTING_SECTION_3_CUE.length);
    expect(nonEmptyLineCount(charterText)).toBeGreaterThanOrEqual(20);
  });
});
