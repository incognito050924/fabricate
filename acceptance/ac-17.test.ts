/**
 * ac-17 acceptance — U7 hearback duty (aviation hearback): the revised
 * interview directives gain the NEW operative-cue "사용자 오복창 즉시 교정,
 * 침묵=위반" with the activation condition "발생 시만", and fixture-turn
 * structure observation confirms the firing. Frozen red:
 * src/interview/charter/directives.ts and src/interview/turn/hearback.ts do
 * not exist yet; the piece-3 implementation must turn this file green
 * without editing it.
 *
 * Oracle (gate-a/rows/ac-17.json), covered clauses:
 *  (1) the revised directives source text exported by
 *      src/interview/charter/directives.ts contains the U7 operative-cue —
 *      both halves, '사용자 오복창 즉시 교정' and '침묵=위반' — asserted as
 *      deterministic substring grep (byte-exact Korean), isolated to the U7
 *      directive block so other cues mentioning 침묵 elsewhere cannot mask a
 *      missing U7 cue, and also present in the full injected directives text
 *      (no detached side-channel constant). The block/surface relation is
 *      enforced, not assumed: the U7 block must be a STRICT, uniquely-located
 *      substring of the injected text, the U7-specific cue must not occur
 *      anywhere outside that block, a different directive id (U6) must yield
 *      a different, disjoint block that does not carry the U7 cue, and an
 *      adversarial surface whose U7 block was stripped of the cue while a
 *      decoy elsewhere still carries it is shown to fool a whole-surface grep
 *      yet fail the block-scoped check.
 *  (2) the same source text states the activation condition '발생 시만'
 *      verbatim — deterministic substring grep, in the U7 block and in the
 *      full directives text
 *  (3) fixture-turn structural observation (semi-deterministic): a fixture
 *      turn tagged as a user misreadback records a NON-EMPTY immediate
 *      correction utterance field (firing confirmed, fixture correction
 *      passed through verbatim); a misreadback-tagged fixture that passes in
 *      silence (no correction utterance) is recorded as a violation labeled
 *      with the cue's '침묵=위반' clause; and an ordinary non-misreadback
 *      fixture turn fires no correction AND records no violation — asserted
 *      in BOTH gating directions, i.e. also for an untagged turn that does
 *      supply a correction utterance, so that a tag-ignoring implementation
 *      keyed on "a correction string is present" cannot pass ('발생 시만')
 *
 * Residual (NOT tested here, per row residual):
 *  - Misreadback recognition judgment — whether a real user utterance is
 *    actually a misreadback (an incorrect read-back) of the agent's
 *    utterance is a human-judged predicate the contract itself declares
 *    residual. The fixtures fix the tag; only record structure is asserted.
 *  - Activation compliance outside fixtures — the fixture-turn observation
 *    is semi-deterministic: it checks only the structure of tagged fixture
 *    cases, and recognizing that a misreadback "occurred" in a real
 *    conversational turn is not mechanized here.
 */
import { describe, expect, test } from "bun:test";
import { directivesText, getDirectiveBlock } from "../src/interview/charter/directives";
import { recordHearbackTurn } from "../src/interview/turn/hearback";

// Byte-exact Korean strings required by the locked criterion statement.
const CORRECTION_CUE = "사용자 오복창 즉시 교정";
const SILENCE_CUE = "침묵=위반";
const ACTIVATION_CONDITION = "발생 시만";

// Fixture-fixed conversation content: whether the user utterance really is a
// misreadback is residual (human-judged); the fixture tag fixes it, the test
// only checks the recorded turn structure.
const AGENT_UTTERANCE = "백업은 매일 자정에 실행되도록 예약하겠습니다";
const MISREADBACK_UTTERANCE = "알겠습니다, 백업이 매주 일요일 자정에 실행되는 거군요";
const FAITHFUL_UTTERANCE = "알겠습니다, 백업이 매일 자정에 실행되는 거군요";
const CORRECTION_UTTERANCE = "아니요, 매주 일요일이 아니라 매일 자정에 실행됩니다";

function makeFixtureTurn(
  misreadback_tag: "misreadback" | "none",
  correction_utterance: string,
  turn_id: string,
) {
  return {
    turn_id,
    misreadback_tag,
    agent_utterance: AGENT_UTTERANCE,
    user_utterance: misreadback_tag === "misreadback" ? MISREADBACK_UTTERANCE : FAITHFUL_UTTERANCE,
    // Empty string models silence: the agent let the turn pass uncorrected.
    correction_utterance,
  };
}

// Locate the U7 block inside the injected surface, proving it is a real,
// unambiguously-placed region of that surface rather than a detached string.
function u7BlockStart(block: string): number {
  const start = directivesText.indexOf(block);
  expect(start).toBeGreaterThanOrEqual(0);
  // Exactly one occurrence: the block region is unambiguous.
  expect(directivesText.indexOf(block, start + 1)).toBe(-1);
  return start;
}

describe("ac-17 clause 1 — new U7 operative-cue exists in the revised directives (deterministic grep)", () => {
  test("the U7 directive block carries both halves of the hearback cue", () => {
    const block = getDirectiveBlock("U7");

    // Block isolation: '침묵' appears in other cues on the same surface, so a
    // whole-file match alone could mask a missing U7 cue.
    expect(block).toContain(CORRECTION_CUE);
    expect(block).toContain(SILENCE_CUE);
  });

  test("the hearback cue is part of the injected directives source text itself", () => {
    // The cue must live in the injected directive text, not in a detached
    // constant that never reaches the interview surface.
    expect(directivesText).toContain(CORRECTION_CUE);
    expect(directivesText).toContain(SILENCE_CUE);
  });

  test("the U7 block is a strict subrange of the injected directives text, not the whole text", () => {
    const block = getDirectiveBlock("U7");

    // Containment plus strictness: a getDirectiveBlock that just hands back
    // the entire surface (or a one-line surface that IS the cue) fails here.
    expect(directivesText).toContain(block);
    expect(block.length).toBeLessThan(directivesText.length);
    u7BlockStart(block);
  });

  test("the U7-specific cue occurs only inside the U7 block, nowhere else on the surface", () => {
    const block = getDirectiveBlock("U7");
    const start = u7BlockStart(block);
    const outsideBlock =
      directivesText.slice(0, start) + directivesText.slice(start + block.length);

    // '사용자 오복창 즉시 교정' is U7's own; if it also sat outside the block
    // (a side-channel footnote or a duplicated constant), the block-scoped
    // grep above could be satisfied by the wrong occurrence.
    expect(outsideBlock).not.toContain(CORRECTION_CUE);
  });

  test("a different directive id yields a different, disjoint block that does not carry the U7 cue", () => {
    const u7 = getDirectiveBlock("U7");
    const u6 = getDirectiveBlock("U6");

    // An id-ignoring getDirectiveBlock (constant return) fails all three.
    expect(u6).not.toBe(u7);
    expect(u6.length).toBeGreaterThan(0);
    expect(u6).not.toContain(CORRECTION_CUE);

    // Both are regions of the same injected surface, and they do not overlap:
    // the U7 cue is attributed to U7 alone.
    expect(directivesText).toContain(u6);
    const u7Start = u7BlockStart(u7);
    const u6Start = directivesText.indexOf(u6);
    expect(u6Start).toBeGreaterThanOrEqual(0);
    const disjoint = u6Start + u6.length <= u7Start || u7Start + u7.length <= u6Start;
    expect(disjoint).toBe(true);
  });

  test("a surface whose U7 block lost the cue fails block-level even though whole-surface grep passes (masking)", () => {
    const block = getDirectiveBlock("U7");
    const start = u7BlockStart(block);

    // Strip both halves of the cue from the U7 block itself.
    const maskedBlock = block.replaceAll(CORRECTION_CUE, "").replaceAll(SILENCE_CUE, "");
    expect(maskedBlock.length).toBeLessThan(block.length);

    // Rebuild the surface with the gutted U7 block, and let some other cue
    // elsewhere still mention the same strings (the masking carrier).
    const decoySuffix = `\n- 각주: 다른 절에서의 ${CORRECTION_CUE}, ${SILENCE_CUE} 언급\n`;
    const adversarialSurface =
      directivesText.slice(0, start) +
      maskedBlock +
      directivesText.slice(start + block.length) +
      decoySuffix;

    // A whole-surface grep is fooled: both strings are still found globally.
    expect(adversarialSurface).toContain(CORRECTION_CUE);
    expect(adversarialSurface).toContain(SILENCE_CUE);

    // The block-scoped check is not fooled: the U7 region itself lost the cue,
    // so this input is judged FAIL by the assertions above.
    const adversarialU7Region = adversarialSurface.slice(start, start + maskedBlock.length);
    expect(adversarialU7Region).not.toContain(CORRECTION_CUE);
    expect(adversarialU7Region).not.toContain(SILENCE_CUE);
  });
});

describe("ac-17 clause 2 — activation condition '발생 시만' is stated (deterministic grep)", () => {
  test("the U7 block states the activation condition verbatim", () => {
    expect(getDirectiveBlock("U7")).toContain(ACTIVATION_CONDITION);
  });

  test("the full directives source text states the activation condition verbatim", () => {
    expect(directivesText).toContain(ACTIVATION_CONDITION);
  });

  test("the activation condition is stated inside the injected U7 region, not only globally", () => {
    const block = getDirectiveBlock("U7");
    const start = u7BlockStart(block);

    // The condition must be readable at the U7 region of the surface that is
    // actually injected — not merely somewhere on the surface.
    expect(directivesText.slice(start, start + block.length)).toContain(ACTIVATION_CONDITION);
  });
});

describe("ac-17 clause 3 — fixture-turn structure: correction fires on misreadback, silence is a violation, no firing otherwise", () => {
  test("a misreadback-tagged fixture turn records a non-empty immediate correction utterance", () => {
    const recorded = recordHearbackTurn(
      makeFixtureTurn("misreadback", CORRECTION_UTTERANCE, "t-mis-corrected-1"),
    );

    expect(recorded.turn_id).toBe("t-mis-corrected-1");
    expect(recorded.hearback_fired).toBe(true);
    const correction = recorded.correction;
    if (!correction) throw new Error("expected a correction record on a misreadback turn");

    // The immediate-correction utterance field exists non-empty (firing
    // confirmed) and carries the fixture correction verbatim.
    expect(correction.utterance.length).toBeGreaterThan(0);
    expect(correction.utterance).toBe(CORRECTION_UTTERANCE);

    // A corrected misreadback is not a violation.
    expect(recorded.silence_violation).toBe(false);
    expect(recorded.violation_label).toBeUndefined();
  });

  test("a misreadback-tagged fixture that passes in silence is recorded as a violation (침묵=위반)", () => {
    const recorded = recordHearbackTurn(makeFixtureTurn("misreadback", "", "t-mis-silent-1"));

    expect(recorded.turn_id).toBe("t-mis-silent-1");
    // Silence: no correction fired, no correction record.
    expect(recorded.hearback_fired).toBe(false);
    expect(recorded.correction).toBeUndefined();

    // The turn is recorded as a violation, labeled with the cue's exact
    // '침묵=위반' clause so the record ties back to the operative-cue.
    expect(recorded.silence_violation).toBe(true);
    expect(recorded.violation_label).toBe(SILENCE_CUE);

    // The label is the directive surface's own wording, not a private string.
    expect(getDirectiveBlock("U7")).toContain(recorded.violation_label);
  });

  test("an ordinary non-misreadback turn neither fires a correction nor records a violation (the '발생 시만' gating)", () => {
    const recorded = recordHearbackTurn(makeFixtureTurn("none", "", "t-ordinary-1"));

    // No misreadback occurred: silence is NOT a violation here — the duty
    // activates only when a misreadback occurs ('발생 시만').
    expect(recorded.hearback_fired).toBe(false);
    expect(recorded.correction).toBeUndefined();
    expect(recorded.silence_violation).toBe(false);
    expect(recorded.violation_label).toBeUndefined();
    // The turn is still recorded — gating suppresses the duty, not the turn.
    expect(recorded.turn_id).toBe("t-ordinary-1");
  });

  test("gating is tag-driven: an untagged turn does not fire even when a correction utterance is supplied", () => {
    const recorded = recordHearbackTurn(
      makeFixtureTurn("none", CORRECTION_UTTERANCE, "t-ordinary-with-correction-1"),
    );

    // The duty is gated on the misreadback tag, not on the mere presence of a
    // correction string: an implementation computing hearback_fired from
    // correction_utterance.length alone fires here and fails.
    expect(recorded.hearback_fired).toBe(false);
    expect(recorded.correction).toBeUndefined();
    expect(recorded.silence_violation).toBe(false);
    expect(recorded.violation_label).toBeUndefined();
    expect(recorded.turn_id).toBe("t-ordinary-with-correction-1");
  });
});
