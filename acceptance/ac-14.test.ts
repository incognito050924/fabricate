/**
 * ac-14 acceptance — U4 ask-vs-assume triage (Howard VoI): the injected
 * interview directives carry all three triage branch cues (non-critical →
 * record / low-risk → assume + visible log / high-risk·irreversible → ask),
 * "assumptions must be visibly logged" is enforced fail-closed for EVERY
 * routed assumption, and fixture-tagged turns route through the three
 * branches structurally. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-14.json), covered clauses:
 *  (1) three-branch operative-cue existence (deterministic grep) — the
 *      directives string exported as `directivesText` by the shared
 *      src/interview/charter/directives.ts contains each branch cue verbatim,
 *      byte-exact Korean from the locked statement: '비중대 기록',
 *      '저위험 가정+가시로그', '고위험·비가역 질문', plus the statement's
 *      quoted mandate '가정은 반드시 보이게 로그'. The cues are anchored to
 *      the operative U4 directive block (`getDirectiveBlock("U4")`, the same
 *      block accessor the sibling U-series files use on this shared surface),
 *      which must be a NON-EMPTY STRICT SUBRANGE of the injected text — so a
 *      detached token dump, or a block accessor that just returns the whole
 *      surface, cannot stand in for an operative block. The completeness
 *      checker (`checkTriageCues`, src/interview/universal/voi-triage.ts)
 *      accepts the real directives and the real U4 block, and FAILS any
 *      directives fixture missing even one branch (one negative fixture per
 *      omitted branch, and empty text is missing all three — '전부 존재' is
 *      all-or-nothing).
 *  (2) visible-log enforcement (deterministic, universally quantified) —
 *      `checkAssumptionVisibility` (src/interview/universal/
 *      assumption-visible-log.ts) requires EVERY recorded assumption to be
 *      referenced by a visible-log record ('항목마다'). Multi-assumption
 *      fixtures pin the quantifier from both ends: a pair whose FIRST is
 *      covered and second is not is rejected, and a pair whose SECOND is
 *      covered and first is not is rejected — so a first-item-only check or
 *      an `assumptions.some(...)` check cannot pass. An assumption recorded
 *      without a log is rejected with a Korean reason naming the missing
 *      '가시 로그' and the uncovered assumption id (silent assumptions
 *      impossible); a visible-log record referencing a different assumption
 *      does not count (reference integrity); an empty-but-complete input (no
 *      assumptions at all) passes.
 *  (3) fixture-turn structural observation (semi-deterministic) — three turns
 *      whose triage tags are FIXED BY FIXTURE and whose content is IDENTICAL
 *      route structurally via `routeTriagedTurn`: a non-critical tag leaves a
 *      record only — no question, no assumption, and NO visible-log record
 *      (§3-1 ③: an output that changes no decision is a record); a low-risk
 *      tag leaves an assumption record carrying its originating turn_id plus
 *      a visible-log record referencing exactly that assumption, and two
 *      distinct low-risk turns yield distinct assumptions (no constant
 *      emission that ignores the input); a high-risk-irreversible tag emits a
 *      question and assumes nothing, with no dangling visible-log record.
 *      The clause-2 gate accepts the routed multi-turn assumption set and
 *      rejects it once one visible-log record is dropped. Identical content
 *      diverging only by tag pins that the machine checks tag→routing wiring,
 *      never the classification.
 *
 * Residual (NOT tested here, per row residual):
 *  - The triage judgment itself — which real item is non-critical / low-risk
 *    / high-risk-irreversible is not machined (the statement self-declares
 *    the triage judgment residual); the machine checks only the routing
 *    above LLM-emitted tags.
 *  - Firing on real (non-fixture) turns — the fixture-turn observation is
 *    semi-deterministic, so whether the triage actually fires in live turns
 *    and whether the cue strings actually change model behavior is not
 *    closed by this verdict.
 *  - Substance of visibility — only the existence and assumption-reference
 *    integrity of visible-log records is checked; whether the log is
 *    actually exposed to the user (render quality) is ac-6's concern, so no
 *    assertion here constrains the wording of a log entry.
 */
import { describe, expect, test } from "bun:test";
import { directivesText, getDirectiveBlock } from "../src/interview/charter/directives";
import { checkAssumptionVisibility } from "../src/interview/universal/assumption-visible-log";
import { checkTriageCues, routeTriagedTurn } from "../src/interview/universal/voi-triage";

// Byte-exact Korean cue strings required by the locked criterion statement:
// '3분기 operative-cue(비중대 기록 / 저위험 가정+가시로그 / 고위험·비가역 질문)'.
const RECORD_CUE = "비중대 기록";
const ASSUME_CUE = "저위험 가정+가시로그";
const ASK_CUE = "고위험·비가역 질문";
// The mandate the statement quotes verbatim: '가정은 반드시 보이게 로그'.
const VISIBLE_LOG_MANDATE = "가정은 반드시 보이게 로그";

const ALL_BRANCH_CUES = [RECORD_CUE, ASSUME_CUE, ASK_CUE];

// Negative-fixture builder: a directives text carrying every branch cue
// EXCEPT the omitted one — '전부 존재' must fail on any single omission.
const directivesFixtureWithout = (omitted: string) =>
  ALL_BRANCH_CUES.filter((cue) => cue !== omitted).join(" / ");

describe("ac-14 clause 1 — all three VoI branch cues exist in the injected directives", () => {
  test("the U4 directive block is a non-empty strict subrange of the injected directives text", () => {
    const block = getDirectiveBlock("U4");

    expect(typeof block).toBe("string");
    expect(block.length).toBeGreaterThan(0);
    // The block must be an actual slice of what is injected — not a detached
    // constant that never reaches the interview surface.
    expect(directivesText).toContain(block);
    // STRICT subrange: the shared surface carries the whole U-series, so a
    // block accessor returning the entire text is not an operative block and
    // would let a foreign cue mask a missing U4 cue.
    expect(block.length).toBeLessThan(directivesText.length);
  });

  test("the U4 block carries the non-critical → record cue '비중대 기록'", () => {
    expect(getDirectiveBlock("U4")).toContain(RECORD_CUE);
    expect(directivesText).toContain(RECORD_CUE);
  });

  test("the U4 block carries the low-risk → assume+visible-log cue '저위험 가정+가시로그'", () => {
    expect(getDirectiveBlock("U4")).toContain(ASSUME_CUE);
    expect(directivesText).toContain(ASSUME_CUE);
  });

  test("the U4 block carries the high-risk·irreversible → ask cue '고위험·비가역 질문'", () => {
    expect(getDirectiveBlock("U4")).toContain(ASK_CUE);
    expect(directivesText).toContain(ASK_CUE);
  });

  test("the U4 block carries the quoted mandate '가정은 반드시 보이게 로그' verbatim", () => {
    expect(getDirectiveBlock("U4")).toContain(VISIBLE_LOG_MANDATE);
    expect(directivesText).toContain(VISIBLE_LOG_MANDATE);
  });

  test("every branch cue occurrence used here sits inside the U4 block's range in the injected text", () => {
    const block = getDirectiveBlock("U4");
    const blockStart = directivesText.indexOf(block);
    expect(blockStart).toBeGreaterThanOrEqual(0);
    const blockEnd = blockStart + block.length;

    // Cross-cue masking defense: each cue is located within the operative
    // block's span, not merely somewhere on the shared surface.
    for (const cue of [...ALL_BRANCH_CUES, VISIBLE_LOG_MANDATE]) {
      const cueStart = directivesText.indexOf(cue, blockStart);
      expect(cueStart).toBeGreaterThanOrEqual(blockStart);
      expect(cueStart + cue.length).toBeLessThanOrEqual(blockEnd);
    }
  });

  test("positive control: the completeness checker accepts the real directives and the real U4 block", () => {
    const onFullText = checkTriageCues(directivesText);
    expect(onFullText.ok).toBe(true);
    expect(onFullText.missing).toEqual([]);

    const onBlock = checkTriageCues(getDirectiveBlock("U4"));
    expect(onBlock.ok).toBe(true);
    expect(onBlock.missing).toEqual([]);
  });

  test("a directives fixture missing the record branch fails — '전부 존재' is all-or-nothing", () => {
    const result = checkTriageCues(directivesFixtureWithout(RECORD_CUE));

    expect(result.ok).toBe(false);
    expect(result.missing).toContain(RECORD_CUE);
  });

  test("a directives fixture missing the assume+visible-log branch fails", () => {
    const result = checkTriageCues(directivesFixtureWithout(ASSUME_CUE));

    expect(result.ok).toBe(false);
    expect(result.missing).toContain(ASSUME_CUE);
  });

  test("a directives fixture missing the ask branch fails", () => {
    const result = checkTriageCues(directivesFixtureWithout(ASK_CUE));

    expect(result.ok).toBe(false);
    expect(result.missing).toContain(ASK_CUE);
  });

  test("fail-closed: empty directives text is missing every branch cue", () => {
    const result = checkTriageCues("");

    expect(result.ok).toBe(false);
    expect(result.missing).toContain(RECORD_CUE);
    expect(result.missing).toContain(ASSUME_CUE);
    expect(result.missing).toContain(ASK_CUE);
  });
});

describe("ac-14 clause 2 — every logged assumption needs a visible-log record (fail-closed gate)", () => {
  const assumptionOne = {
    id: "asm-1",
    statement: "마이그레이션 도중 기존 세션은 유지된다고 가정한다",
  };
  const assumptionTwo = {
    id: "asm-2",
    statement: "기존 파일 저장소는 이관 후 읽기 전용으로 남는다고 가정한다",
  };
  const assumptionThree = {
    id: "asm-3",
    statement: "이관 작업은 트래픽이 가장 적은 시간대에 수행된다고 가정한다",
  };

  const logFor = (assumption: { id: string; statement: string }) => ({
    assumption_id: assumption.id,
    entry: `가정: ${assumption.statement}`,
  });

  test("an assumption with a visible-log record referencing it passes", () => {
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne],
      visible_log: [logFor(assumptionOne)],
    });

    expect(result.ok).toBe(true);
  });

  test("empty-but-complete input passes: with no assumptions there is nothing to log", () => {
    const result = checkAssumptionVisibility({ assumptions: [], visible_log: [] });

    expect(result.ok).toBe(true);
  });

  test("a recorded assumption with NO visible-log record is deterministically rejected — silent assumption impossible", () => {
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne],
      visible_log: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the silent assumption to be rejected");
    expect(result.reason).toContain("가시 로그");
    expect(result.reason).toContain("asm-1");
  });

  test("a visible-log record referencing a DIFFERENT assumption does not count (reference integrity)", () => {
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne],
      visible_log: [{ assumption_id: "asm-999", entry: "다른 가정에 대한 로그" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the dangling visible-log reference to be rejected");
    expect(result.reason).toContain("asm-1");
  });

  test("positive control for the quantifier: THREE assumptions each with their own record pass", () => {
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne, assumptionTwo, assumptionThree],
      visible_log: [logFor(assumptionOne), logFor(assumptionTwo), logFor(assumptionThree)],
    });

    expect(result.ok).toBe(true);
  });

  test("'항목마다': the FIRST of two assumptions covered and the second not is still rejected", () => {
    // Kills a first-item-only check and an `assumptions.some(...)` check: both
    // would report ok here while asm-2 stays a silent assumption.
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne, assumptionTwo],
      visible_log: [logFor(assumptionOne)],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the uncovered second assumption to be rejected");
    expect(result.reason).toContain("가시 로그");
    expect(result.reason).toContain("asm-2");
  });

  test("'항목마다': the SECOND of two assumptions covered and the first not is still rejected", () => {
    // Kills a last-item-only check and the same `some(...)` shortcut from the
    // other end.
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne, assumptionTwo],
      visible_log: [logFor(assumptionTwo)],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the uncovered first assumption to be rejected");
    expect(result.reason).toContain("가시 로그");
    expect(result.reason).toContain("asm-1");
  });

  test("'항목마다': a MIDDLE uncovered assumption between two covered ones is rejected and named", () => {
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne, assumptionTwo, assumptionThree],
      visible_log: [logFor(assumptionOne), logFor(assumptionThree)],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the uncovered middle assumption to be rejected");
    expect(result.reason).toContain("가시 로그");
    expect(result.reason).toContain("asm-2");
  });

  test("'항목마다': one shared log record cannot cover several assumptions by count alone", () => {
    // Two assumptions, two log records — but both point at the same
    // assumption, so coverage counting (log.length >= assumptions.length)
    // must not be mistaken for per-item coverage.
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne, assumptionTwo],
      visible_log: [logFor(assumptionOne), { assumption_id: "asm-1", entry: "같은 가정 재기록" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected duplicate coverage of asm-1 not to cover asm-2");
    expect(result.reason).toContain("asm-2");
  });

  test("fail-closed on many: three assumptions with an empty log are rejected naming an uncovered id", () => {
    const result = checkAssumptionVisibility({
      assumptions: [assumptionOne, assumptionTwo, assumptionThree],
      visible_log: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected all-uncovered assumptions to be rejected");
    expect(result.reason).toContain("가시 로그");
    expect(result.reason).toContain("asm-3");
  });
});

describe("ac-14 clause 3 — fixture-tagged turns route through the three branches structurally", () => {
  // The classification judgment is residual: the tag is fixed by fixture and
  // the content is held IDENTICAL across all three turns, so any routing
  // difference below is attributable to the tag wiring alone.
  const SHARED_TURN_CONTENT = "세션 저장소를 파일에서 데이터베이스로 옮긴다";
  const OTHER_TURN_CONTENT = "정적 자산 캐시 만료 시간을 하루로 늘린다";

  // Reference integrity in the routed direction: no visible-log record may
  // point at an assumption the same routing did not emit.
  const danglingLogIds = (routed: {
    assumptions: Array<{ id: string }>;
    visible_log: Array<{ assumption_id: string }>;
  }) => {
    const emittedIds = new Set(routed.assumptions.map((a) => a.id));
    return routed.visible_log
      .map((entry) => entry.assumption_id)
      .filter((id) => !emittedIds.has(id));
  };

  test("a non-critical tagged turn is recorded only and never promoted to a question (§3-1 ③)", () => {
    const routed = routeTriagedTurn({
      turn_id: "turn-nc-1",
      content: SHARED_TURN_CONTENT,
      voi_tag: "non-critical",
    });

    expect(routed.records.length).toBe(1);
    expect(routed.records[0].turn_id).toBe("turn-nc-1");
    // The record preserves what was recorded, verbatim.
    expect(routed.records[0].content).toBe(SHARED_TURN_CONTENT);
    // '결정을 바꾸지 않는 산출물은 비중대 기록이고, 질문으로 승격되지 않는다'
    expect(routed.questions.length).toBe(0);
    expect(routed.assumptions.length).toBe(0);
    // '기록만 남고': nothing is assumed, so nothing may be logged as an
    // assumption either — a spurious visible-log record on this branch would
    // otherwise slip past the clause-2 gate, which only walks assumptions.
    expect(routed.visible_log.length).toBe(0);
  });

  test("a low-risk tagged turn leaves an assumption record, tied to its turn, plus a visible-log record referencing it", () => {
    const routed = routeTriagedTurn({
      turn_id: "turn-low-1",
      content: SHARED_TURN_CONTENT,
      voi_tag: "low-risk",
    });

    expect(routed.assumptions.length).toBe(1);
    const emitted = routed.assumptions[0];
    expect(typeof emitted.id).toBe("string");
    expect(emitted.id.length).toBeGreaterThan(0);
    expect(typeof emitted.statement).toBe("string");
    expect(emitted.statement.trim().length).toBeGreaterThan(0);
    // The assumption belongs to the turn that produced it — a constant
    // emission that ignores the input cannot satisfy this.
    expect(emitted.turn_id).toBe("turn-low-1");
    // The mandate '가정은 반드시 보이게 로그' materializes here: the visible
    // log must reference exactly this assumption (integrity, not mere existence).
    expect(routed.visible_log.length).toBe(1);
    expect(routed.visible_log[0].assumption_id).toBe(emitted.id);
    expect(routed.visible_log[0].entry.trim().length).toBeGreaterThan(0);
    expect(danglingLogIds(routed)).toEqual([]);
    // Assume-branch means assume-not-ask: no question is emitted.
    expect(routed.questions.length).toBe(0);
    // Cross-module wiring: the routed pair satisfies the clause-2 gate.
    const gate = checkAssumptionVisibility({
      assumptions: routed.assumptions,
      visible_log: routed.visible_log,
    });
    expect(gate.ok).toBe(true);
  });

  test("two distinct low-risk turns emit two distinct assumptions, each tied to its own turn", () => {
    const first = routeTriagedTurn({
      turn_id: "turn-low-a",
      content: SHARED_TURN_CONTENT,
      voi_tag: "low-risk",
    });
    const second = routeTriagedTurn({
      turn_id: "turn-low-b",
      content: OTHER_TURN_CONTENT,
      voi_tag: "low-risk",
    });

    expect(first.assumptions[0].turn_id).toBe("turn-low-a");
    expect(second.assumptions[0].turn_id).toBe("turn-low-b");
    // Distinct ids: a constant return reusing one id would collapse two
    // assumptions into one log reference and hide a silent assumption.
    expect(first.assumptions[0].id).not.toBe(second.assumptions[0].id);
  });

  test("the clause-2 gate accepts the merged routed pair and rejects it once one visible-log record is dropped", () => {
    const first = routeTriagedTurn({
      turn_id: "turn-low-a",
      content: SHARED_TURN_CONTENT,
      voi_tag: "low-risk",
    });
    const second = routeTriagedTurn({
      turn_id: "turn-low-b",
      content: OTHER_TURN_CONTENT,
      voi_tag: "low-risk",
    });

    const assumptions = [...first.assumptions, ...second.assumptions];
    const visible_log = [...first.visible_log, ...second.visible_log];
    expect(assumptions.length).toBe(2);
    expect(visible_log.length).toBe(2);

    const accepted = checkAssumptionVisibility({ assumptions, visible_log });
    expect(accepted.ok).toBe(true);

    // Drop the log of the SECOND assumption: the gate must still reject and
    // name that assumption — per-item coverage over real routed output.
    const droppedSecond = checkAssumptionVisibility({
      assumptions,
      visible_log: first.visible_log,
    });
    expect(droppedSecond.ok).toBe(false);
    if (droppedSecond.ok) throw new Error("expected the unlogged second assumption to be rejected");
    expect(droppedSecond.reason).toContain(second.assumptions[0].id);

    // Drop the log of the FIRST assumption instead: same verdict, other id.
    const droppedFirst = checkAssumptionVisibility({
      assumptions,
      visible_log: second.visible_log,
    });
    expect(droppedFirst.ok).toBe(false);
    if (droppedFirst.ok) throw new Error("expected the unlogged first assumption to be rejected");
    expect(droppedFirst.reason).toContain(first.assumptions[0].id);
  });

  test("a high-risk-irreversible tagged turn emits a question (ask, not assume)", () => {
    const routed = routeTriagedTurn({
      turn_id: "turn-high-1",
      content: SHARED_TURN_CONTENT,
      voi_tag: "high-risk-irreversible",
    });

    expect(routed.questions.length).toBe(1);
    expect(routed.questions[0].turn_id).toBe("turn-high-1");
    expect(typeof routed.questions[0].question).toBe("string");
    expect(routed.questions[0].question.trim().length).toBeGreaterThan(0);
    // Ask-branch means ask-not-assume: nothing is silently assumed, and with
    // no assumption emitted no visible-log record may dangle.
    expect(routed.assumptions.length).toBe(0);
    expect(danglingLogIds(routed)).toEqual([]);
  });

  test("routing is wired to the fixture tag alone — identical content diverges only by tag", () => {
    const routeWith = (voi_tag: string) =>
      routeTriagedTurn({
        turn_id: `turn-${voi_tag}`,
        content: SHARED_TURN_CONTENT,
        voi_tag,
      });

    // Same content, three tags: question emission and assumption emission
    // differ strictly by tag, so this file checks wiring, never the
    // classification judgment.
    expect(routeWith("non-critical").questions.length).toBe(0);
    expect(routeWith("low-risk").questions.length).toBe(0);
    expect(routeWith("high-risk-irreversible").questions.length).toBe(1);

    expect(routeWith("non-critical").assumptions.length).toBe(0);
    expect(routeWith("low-risk").assumptions.length).toBe(1);
    expect(routeWith("high-risk-irreversible").assumptions.length).toBe(0);
  });
});
