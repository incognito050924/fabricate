/**
 * ac-11 acceptance — U1 question-behind-the-request reconstruction (Collingwood).
 * Frozen red: the modules under src/interview/ do not exist yet; the piece-3
 * implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-11.json), covered clauses:
 *  (1) the revised directive/charter text exported by
 *      src/interview/charter/directives.ts carries the U1 operative-cue as an
 *      identifiable, isolated block: WITHIN that single U1 block both
 *      '요청이 답하는 상황/문제를 한 줄로' and '에코 금지' appear together —
 *      not as two independent whole-file substrings. A surface whose U1 block
 *      lost '에코 금지' while the U5 cue elsewhere on the same surface still
 *      carries it (so a whole-file grep would falsely pass by proxy) is
 *      judged FAIL by the block-level assertion.
 *  (2) the same directive text states the U1 activation condition
 *      '비단순 요청만', detected by deterministic grep, and the condition is
 *      stated as U1's own (it lives inside the U1 cue block).
 *  (3) fixture-turn structural observation (semi-deterministic): a turn
 *      tagged non-simple records a non-empty U1 reconstruction field (the
 *      one-line situation/problem the request answers) so firing is
 *      confirmed; a turn tagged simple does not fire that field, even when a
 *      line is supplied; a non-simple turn without a non-empty line is
 *      rejected fail-closed — the activation gating is observed in the turn
 *      structure itself.
 *
 * Residual (NOT tested here, per row residual):
 *  - Reconstruction content quality — whether the one line actually names
 *    the situation/problem the request answers (Collingwood adequacy) is a
 *    human-judged predicate; these tests never grade the line's content.
 *  - Real-conversation firing compliance outside fixtures — whether an
 *    actual request is 'non-simple' is not mechanized; complexity tags are
 *    fixture input and only the tagged cases' structure is observed.
 */
import { describe, expect, test } from "bun:test";
import { CHARTER_DIRECTIVES_TEXT, extractCueBlock } from "../src/interview/charter/directives";
import { recordTurnReconstruction } from "../src/interview/turn/reconstruction";

const U1_SITUATION_ELEMENT = "요청이 답하는 상황/문제를 한 줄로";
const U1_NO_ECHO_ELEMENT = "에코 금지";
const U1_ACTIVATION_CONDITION = "비단순 요청만";

// Complexity tags are fixture input; whether a request really is non-simple
// is residual and never judged here.
const NON_SIMPLE_REQUEST =
  "배포가 실패할 때마다 수동으로 되돌리고 있는데, 롤백 스크립트를 정리하고 실패 알림까지 붙여줘";
const SIMPLE_REQUEST = "README 오타 고쳐줘";

// Content quality of this line is residual; only its non-empty presence in
// the turn record is asserted.
const RECONSTRUCTION_LINE =
  "반복되는 배포 실패를 수동 복구로 버티는 비용이 커진 상황이 이 요청이 답하는 문제다";

function u1BlockOrThrow(text: string): string {
  const block = extractCueBlock(text, "U1");
  if (block === null) throw new Error("expected a U1 cue block to be extractable");
  return block;
}

describe("ac-11 clause 1 — U1 operative-cue exists as an isolated block unit", () => {
  test("both cue elements appear together inside the single U1 block", () => {
    const block = extractCueBlock(CHARTER_DIRECTIVES_TEXT, "U1");
    expect(block).not.toBeNull();
    if (block === null) throw new Error("unreachable");

    expect(block).toContain(U1_SITUATION_ELEMENT);
    expect(block).toContain(U1_NO_ECHO_ELEMENT);
  });

  test("the U1 block is a strict subrange of the directive surface, not the whole text", () => {
    const block = u1BlockOrThrow(CHARTER_DIRECTIVES_TEXT);

    expect(CHARTER_DIRECTIVES_TEXT).toContain(block);
    expect(block.length).toBeLessThan(CHARTER_DIRECTIVES_TEXT.length);
  });

  test("a surface whose U1 block lost '에코 금지' fails block-level even though whole-file grep passes (U5 masking)", () => {
    const u1Block = u1BlockOrThrow(CHARTER_DIRECTIVES_TEXT);

    // Precondition that makes masking possible at all: the U5 cue on the
    // same directive surface carries '에코 금지' outside the U1 block.
    expect(CHARTER_DIRECTIVES_TEXT.replace(u1Block, "")).toContain(U1_NO_ECHO_ELEMENT);

    const maskedU1 = u1Block.replaceAll(U1_NO_ECHO_ELEMENT, "");
    const adversarialSurface = CHARTER_DIRECTIVES_TEXT.replace(u1Block, maskedU1);

    // A whole-file grep is fooled: both elements are still found globally.
    expect(adversarialSurface).toContain(U1_SITUATION_ELEMENT);
    expect(adversarialSurface).toContain(U1_NO_ECHO_ELEMENT);

    // The block-level assertion is not fooled: the U1 block itself lacks
    // '에코 금지', so this input is judged FAIL.
    const adversarialU1 = extractCueBlock(adversarialSurface, "U1");
    expect(adversarialU1).not.toBeNull();
    if (adversarialU1 === null) throw new Error("unreachable");
    expect(adversarialU1).toContain(U1_SITUATION_ELEMENT);
    expect(adversarialU1).not.toContain(U1_NO_ECHO_ELEMENT);
  });
});

describe("ac-11 clause 2 — activation condition '비단순 요청만' is stated", () => {
  test("deterministic grep finds the activation condition in the directive text", () => {
    expect(CHARTER_DIRECTIVES_TEXT).toContain(U1_ACTIVATION_CONDITION);
  });

  test("the activation condition is U1's own: it lives inside the U1 cue block", () => {
    expect(u1BlockOrThrow(CHARTER_DIRECTIVES_TEXT)).toContain(U1_ACTIVATION_CONDITION);
  });
});

describe("ac-11 clause 3 — fixture-turn structure observes U1 firing and its gating", () => {
  test("a non-simple-tagged turn records a non-empty reconstruction field (firing confirmed)", () => {
    const result = recordTurnReconstruction({
      request_text: NON_SIMPLE_REQUEST,
      complexity_tag: "non_simple",
      situation_problem_line: RECONSTRUCTION_LINE,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.u1_fired).toBe(true);
    expect(result.record.situation_problem_line).toBe(RECONSTRUCTION_LINE);
  });

  test("a simple-tagged turn does not fire the reconstruction field", () => {
    const result = recordTurnReconstruction({
      request_text: SIMPLE_REQUEST,
      complexity_tag: "simple",
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.u1_fired).toBe(false);
    expect(result.record.situation_problem_line).toBeUndefined();
  });

  test("gating is tag-driven: the same request tagged simple does not fire even with a line supplied", () => {
    const result = recordTurnReconstruction({
      request_text: NON_SIMPLE_REQUEST,
      complexity_tag: "simple",
      situation_problem_line: RECONSTRUCTION_LINE,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.u1_fired).toBe(false);
    expect(result.record.situation_problem_line).toBeUndefined();
  });

  test("a non-simple-tagged turn without a non-empty line is rejected fail-closed", () => {
    const missing = recordTurnReconstruction({
      request_text: NON_SIMPLE_REQUEST,
      complexity_tag: "non_simple",
    });
    expect(missing.accepted).toBe(false);
    if (missing.accepted) throw new Error("unreachable");
    expect(missing.reason).toBe("missing_reconstruction_line");

    const empty = recordTurnReconstruction({
      request_text: NON_SIMPLE_REQUEST,
      complexity_tag: "non_simple",
      situation_problem_line: "",
    });
    expect(empty.accepted).toBe(false);
    if (empty.accepted) throw new Error("unreachable");
    expect(empty.reason).toBe("missing_reconstruction_line");
  });
});
