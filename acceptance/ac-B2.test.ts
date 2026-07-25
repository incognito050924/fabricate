/**
 * ac-B2 acceptance — Gadamer preunderstanding sheet: the interview start
 * path demands a prior externalized preunderstanding_sheet[] (recorded
 * strictly before the first question turn), each sheet item's state is
 * zod-locked to the enum {위험노출, 확정, 반박됨}, a question presupposing a
 * non-확정 sheet item is flagged leading_question and rewritten (the
 * original never leaves as-is), every answer bundle yields a whole-intent
 * reprojection diff (exactly one per bundle, fail-closed on skipping), and
 * prior items touched by a diff are all marked reconfirm_required while
 * untouched items stay unmarked. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-B2.json), covered clauses:
 *  (1) sheet precedence — gateInterviewStart
 *      (src/interview/preunderstanding/sheet.ts) rejects an interview start
 *      without a sheet (and with an empty sheet — externalizing nothing),
 *      passes with a sheet whose records strictly precede the first question
 *      turn, and rejects equal-or-later sheet records (strict precedence).
 *  (2) state enum — preunderstandingSheetSchema (same module) parses a
 *      sheet whose items carry state ∈ {위험노출, 확정, 반박됨} verbatim and
 *      rejects an item with a missing state, an out-of-enum state, or a
 *      non-array payload (negative fixtures).
 *  (3) leading_question detect/rewrite — gateLeadingQuestion
 *      (src/interview/preunderstanding/leading-question-gate.ts): a question
 *      presupposing a 위험노출 or 반박됨 item raises leading_question=true,
 *      blocks the original text from being emitted as-is, and produces a
 *      rewrite record referencing the original question verbatim and the
 *      presupposed sheet item; a question presupposing only 확정 items
 *      passes with no flag and no rewrite, emitted verbatim. Routing is
 *      driven by the SHEET's state, not by the item id: the same question
 *      against sheets that flip one item's state must flip the flag.
 *  (4) reprojection diff — reprojectAnswerBundles / gateBundleAdvance
 *      (src/interview/preunderstanding/reprojection-diff.ts): N answer
 *      bundles yield exactly N diff records, each bundle referenced exactly
 *      once, each diff's touched set routed from that bundle's
 *      revision-reference tags; advancing to the next bundle is rejected
 *      fail-closed unless EVERY processed bundle is covered by a diff naming
 *      it (a diff for some other bundle, partial coverage, or duplicate
 *      coverage does not buy the advance), and proceeds once coverage is
 *      complete. The diffs reprojectAnswerBundles emits are fed straight
 *      into markReconfirmRequired to check the seam between (4) and (5).
 *  (5) reconfirm_required marking — markReconfirmRequired
 *      (src/interview/preunderstanding/reconfirm-marking.ts): every prior
 *      item in the diff's touched reference set is marked
 *      reconfirm_required=true and untouched items are not marked
 *      (bidirectional contrast, including an empty-touch diff).
 *
 * Residual (NOT tested here, per row residual):
 *  - Leading-ness judgment: whether a question REALLY presupposes an
 *    unsettled preunderstanding is not mechanized — presupposition-reference
 *    tags are fixture-fixed and only flag/rewrite routing is asserted.
 *  - Rewrite quality: whether the rewrite actually removed the
 *    presupposition is human judgment; only the rewrite record's existence
 *    and the blocking of the original are checked.
 *  - Substantive accuracy of item states: which preunderstanding is truly
 *    확정/반박됨 needs real user answers; states are fixture-fixed and only
 *    enum enforcement and routing are asserted.
 *  - Semantic accuracy of the reprojection diff: whether the touched set
 *    truly captures the bundle's impact on the whole intent is not
 *    mechanized; each bundle's revision-reference tags are fixture-fixed and
 *    only per-bundle diff existence, the tag→touched-set→marking routing,
 *    and advance coverage are checked.
 */
import { describe, expect, test } from "bun:test";
import { gateLeadingQuestion } from "../src/interview/preunderstanding/leading-question-gate";
import { markReconfirmRequired } from "../src/interview/preunderstanding/reconfirm-marking";
import {
  gateBundleAdvance,
  reprojectAnswerBundles,
} from "../src/interview/preunderstanding/reprojection-diff";
import {
  gateInterviewStart,
  preunderstandingSheetSchema,
} from "../src/interview/preunderstanding/sheet";

const SHEET_RECORDED_AT = "2026-07-25T09:00:00.000Z";
const FIRST_QUESTION_ASKED_AT = "2026-07-25T09:05:00.000Z";
const AFTER_FIRST_QUESTION = "2026-07-25T09:06:00.000Z";

// States are FIXED BY FIXTURE — which preunderstanding is truly settled or
// refuted is residual; this file asserts only enum enforcement and routing.
const EXPOSED_ITEM = {
  id: "pre-exposed",
  content: "사용자가 말한 '세션'은 로그인 세션을 뜻한다",
  state: "위험노출",
  recorded_at: SHEET_RECORDED_AT,
};

const SETTLED_ITEM = {
  id: "pre-settled",
  content: "대상 저장소는 기존 운영 데이터베이스다",
  state: "확정",
  recorded_at: SHEET_RECORDED_AT,
};

const REFUTED_ITEM = {
  id: "pre-refuted",
  content: "성능 개선이 이 요청의 주된 동기다",
  state: "반박됨",
  recorded_at: SHEET_RECORDED_AT,
};

const VALID_SHEET = [EXPOSED_ITEM, SETTLED_ITEM, REFUTED_ITEM];

describe("ac-B2 clause 1 — the interview start path demands a prior preunderstanding sheet", () => {
  test("no sheet → interview start is rejected", () => {
    const gate = gateInterviewStart({ first_question_asked_at: FIRST_QUESTION_ASKED_AT });

    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("expected the sheet-less interview start to be rejected");
    expect(typeof gate.reason).toBe("string");
    expect(gate.reason.trim().length).toBeGreaterThan(0);
  });

  test("an empty sheet externalizes nothing — start is likewise rejected", () => {
    const gate = gateInterviewStart({
      sheet: [],
      first_question_asked_at: FIRST_QUESTION_ASKED_AT,
    });

    expect(gate.ok).toBe(false);
  });

  test("a sheet recorded strictly before the first question turn lets the start proceed", () => {
    const gate = gateInterviewStart({
      sheet: VALID_SHEET,
      first_question_asked_at: FIRST_QUESTION_ASKED_AT,
    });

    expect(gate.ok).toBe(true);
  });

  test("a sheet record timestamped EQUAL to the first question turn violates strict precedence", () => {
    const gate = gateInterviewStart({
      sheet: [{ ...EXPOSED_ITEM, recorded_at: FIRST_QUESTION_ASKED_AT }],
      first_question_asked_at: FIRST_QUESTION_ASKED_AT,
    });

    expect(gate.ok).toBe(false);
  });

  test("a sheet record timestamped AFTER the first question turn is rejected", () => {
    const gate = gateInterviewStart({
      sheet: [{ ...EXPOSED_ITEM, recorded_at: AFTER_FIRST_QUESTION }],
      first_question_asked_at: FIRST_QUESTION_ASKED_AT,
    });

    expect(gate.ok).toBe(false);
  });
});

describe("ac-B2 clause 2 — sheet item state is locked to {위험노출, 확정, 반박됨}", () => {
  test("a sheet carrying all three enum states parses and preserves each state verbatim", () => {
    const parsed = preunderstandingSheetSchema.safeParse(VALID_SHEET);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the valid sheet to parse");
    expect(parsed.data.length).toBe(3);
    expect(parsed.data.map((item) => item.state)).toEqual(["위험노출", "확정", "반박됨"]);
  });

  test("an item with an out-of-enum state is rejected", () => {
    const parsed = preunderstandingSheetSchema.safeParse([{ ...EXPOSED_ITEM, state: "미확정" }]);

    expect(parsed.success).toBe(false);
  });

  test("an English near-miss state is rejected — the enum is the exact Korean strings", () => {
    const parsed = preunderstandingSheetSchema.safeParse([{ ...EXPOSED_ITEM, state: "confirmed" }]);

    expect(parsed.success).toBe(false);
  });

  test("an item missing state is rejected", () => {
    const stateless = {
      id: EXPOSED_ITEM.id,
      content: EXPOSED_ITEM.content,
      recorded_at: EXPOSED_ITEM.recorded_at,
    };

    expect(preunderstandingSheetSchema.safeParse([stateless]).success).toBe(false);
  });

  test("a non-array payload is rejected", () => {
    expect(preunderstandingSheetSchema.safeParse({ items: VALID_SHEET }).success).toBe(false);
    expect(preunderstandingSheetSchema.safeParse(null).success).toBe(false);
  });
});

describe("ac-B2 clause 3 — a question presupposing an unsettled preunderstanding is flagged and rewritten", () => {
  // Presupposition-reference tags are FIXED BY FIXTURE — whether the question
  // truly presupposes the item is residual; only routing is asserted.
  const LEADING_ON_EXPOSED = {
    text: "로그인 세션을 데이터베이스로 옮길 때 만료 정책은 어떻게 할까요?",
    presupposed_item_ids: ["pre-exposed"],
  };

  test("presupposing a 위험노출 item raises leading_question and blocks the original text", () => {
    const result = gateLeadingQuestion({ question: LEADING_ON_EXPOSED, sheet: VALID_SHEET });

    expect(result.leading_question).toBe(true);
    // 원 질문이 그대로 방출되지 못한다.
    expect(result.emitted_question_text).not.toBe(LEADING_ON_EXPOSED.text);
  });

  test("the rewrite record references the original question verbatim and the presupposed sheet item", () => {
    const result = gateLeadingQuestion({ question: LEADING_ON_EXPOSED, sheet: VALID_SHEET });

    const rewrite = result.rewrite;
    if (!rewrite) throw new Error("expected a rewrite record for the leading question");
    expect(rewrite.original_question_text).toBe(LEADING_ON_EXPOSED.text);
    expect(rewrite.presupposed_item_ids).toContain("pre-exposed");
    expect(rewrite.rewritten_question_text).not.toBe(LEADING_ON_EXPOSED.text);
    expect(rewrite.rewritten_question_text.trim().length).toBeGreaterThan(0);
    // What actually goes out is the rewrite, not the original.
    expect(result.emitted_question_text).toBe(rewrite.rewritten_question_text);
  });

  test("presupposing a 반박됨 item is likewise unsettled — leading_question raised", () => {
    const question = {
      text: "성능 개선을 위해 어떤 지표를 먼저 잴까요?",
      presupposed_item_ids: ["pre-refuted"],
    };

    const result = gateLeadingQuestion({ question, sheet: VALID_SHEET });

    expect(result.leading_question).toBe(true);
    expect(result.emitted_question_text).not.toBe(question.text);
  });

  test("presupposing only 확정 items passes — no flag, no rewrite, emitted verbatim", () => {
    const question = {
      text: "기존 운영 데이터베이스에 새 테이블을 추가해도 될까요?",
      presupposed_item_ids: ["pre-settled"],
    };

    const result = gateLeadingQuestion({ question, sheet: VALID_SHEET });

    expect(result.leading_question).toBe(false);
    expect(result.rewrite).toBeUndefined();
    expect(result.emitted_question_text).toBe(question.text);
  });

  // Routing must read the sheet's state, not the item id. The two tests below
  // hold the question (and its presupposed id) fixed and flip only the state
  // the sheet records for that id; the flag must follow the state.
  test("the SAME question on pre-exposed stops being leading once the sheet settles that item", () => {
    const settledSheet = [{ ...EXPOSED_ITEM, state: "확정" }, SETTLED_ITEM, REFUTED_ITEM];

    const result = gateLeadingQuestion({ question: LEADING_ON_EXPOSED, sheet: settledSheet });

    expect(result.leading_question).toBe(false);
    expect(result.rewrite).toBeUndefined();
    expect(result.emitted_question_text).toBe(LEADING_ON_EXPOSED.text);
  });

  test("the SAME question on pre-settled becomes leading once the sheet marks that item 반박됨", () => {
    const question = {
      text: "기존 운영 데이터베이스에 새 테이블을 추가해도 될까요?",
      presupposed_item_ids: ["pre-settled"],
    };
    const refutedSheet = [EXPOSED_ITEM, { ...SETTLED_ITEM, state: "반박됨" }, REFUTED_ITEM];

    const result = gateLeadingQuestion({ question, sheet: refutedSheet });

    expect(result.leading_question).toBe(true);
    expect(result.emitted_question_text).not.toBe(question.text);
    const rewrite = result.rewrite;
    if (!rewrite) throw new Error("expected a rewrite record once the presupposed item is 반박됨");
    expect(rewrite.original_question_text).toBe(question.text);
    expect(rewrite.presupposed_item_ids).toContain("pre-settled");
  });
});

// The whole prior intent the answer bundles are reprojected against.
const PRIOR_ITEMS = [
  { id: "intent-1", statement: "세션 저장소를 운영 데이터베이스로 옮긴다" },
  { id: "intent-2", statement: "기존 파일 세션은 만료 후 폐기한다" },
  { id: "intent-3", statement: "마이그레이션 중 로그인 유지가 보장된다" },
];

describe("ac-B2 clause 4 — every answer bundle yields a whole-intent reprojection diff", () => {
  // revised_item_ids are FIXED BY FIXTURE — whether a bundle truly revises
  // those prior items is residual; only tag→touched-set routing is asserted.
  const BUNDLES = [
    {
      id: "bundle-1",
      answers: ["'세션'은 로그인 세션이 맞아요"],
      revised_item_ids: ["intent-1"],
    },
    {
      id: "bundle-2",
      answers: ["기존 파일 세션은 만료 후 폐기해 주세요"],
      revised_item_ids: ["intent-2", "intent-3"],
    },
    {
      id: "bundle-3",
      answers: ["성능보다 운영 단순화가 목적이에요"],
      revised_item_ids: [],
    },
  ];

  const reproject = () =>
    reprojectAnswerBundles({ bundles: BUNDLES, prior_items: PRIOR_ITEMS, sheet: VALID_SHEET });

  test("N answer bundles yield exactly N diff records, each bundle referenced exactly once", () => {
    const { diffs } = reproject();

    expect(diffs.length).toBe(BUNDLES.length);
    expect(diffs.map((diff) => diff.bundle_id).sort()).toEqual([
      "bundle-1",
      "bundle-2",
      "bundle-3",
    ]);
  });

  test("each diff's touched set is routed from that bundle's revision references", () => {
    const byBundle = new Map(reproject().diffs.map((diff) => [diff.bundle_id, diff]));

    expect([...(byBundle.get("bundle-1")?.touched_item_ids ?? [])].sort()).toEqual(["intent-1"]);
    expect([...(byBundle.get("bundle-2")?.touched_item_ids ?? [])].sort()).toEqual([
      "intent-2",
      "intent-3",
    ]);
    // A bundle that revises nothing still gets its diff — with an empty touch.
    expect(byBundle.get("bundle-3")?.touched_item_ids).toEqual([]);
  });

  test("the seam holds: a diff reproject emitted drives reconfirm marking directly", () => {
    const diffForBundle2 = reproject().diffs.find((diff) => diff.bundle_id === "bundle-2");
    if (!diffForBundle2) throw new Error("expected a diff record for bundle-2");

    const marked = markReconfirmRequired({ items: PRIOR_ITEMS, diff: diffForBundle2 });
    const byId = new Map(marked.map((item) => [item.id, item]));

    expect(byId.get("intent-2")?.reconfirm_required).toBe(true);
    expect(byId.get("intent-3")?.reconfirm_required).toBe(true);
    expect(byId.get("intent-1")?.reconfirm_required).not.toBe(true);
  });

  test("the seam stays honest for an empty diff — bundle-3 marks nothing", () => {
    const diffForBundle3 = reproject().diffs.find((diff) => diff.bundle_id === "bundle-3");
    if (!diffForBundle3) throw new Error("expected a diff record for bundle-3");

    const marked = markReconfirmRequired({ items: PRIOR_ITEMS, diff: diffForBundle3 });

    expect(marked.length).toBe(PRIOR_ITEMS.length);
    for (const item of marked) {
      expect(item.reconfirm_required).not.toBe(true);
    }
  });

  test("advancing to the next bundle without a diff for a processed bundle is rejected fail-closed", () => {
    const gate = gateBundleAdvance({
      processed_bundle_ids: ["bundle-1"],
      diffs: [],
      next_bundle_id: "bundle-2",
    });

    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("expected the diff-less advance to be rejected");
    expect(gate.reason.trim().length).toBeGreaterThan(0);
  });

  test("a diff naming a DIFFERENT bundle buys no advance — coverage is per processed bundle", () => {
    const gate = gateBundleAdvance({
      processed_bundle_ids: ["bundle-1", "bundle-2"],
      diffs: [{ bundle_id: "bundle-9", touched_item_ids: ["intent-1"] }],
      next_bundle_id: "bundle-3",
    });

    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("expected a foreign-bundle diff to be rejected");
    expect(gate.reason.trim().length).toBeGreaterThan(0);
  });

  test("partial coverage is rejected — bundle-2 processed with only bundle-1's diff", () => {
    const gate = gateBundleAdvance({
      processed_bundle_ids: ["bundle-1", "bundle-2"],
      diffs: [{ bundle_id: "bundle-1", touched_item_ids: ["intent-1"] }],
      next_bundle_id: "bundle-3",
    });

    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("expected partially covered processing to be rejected");
    expect(gate.reason.trim().length).toBeGreaterThan(0);
  });

  test("duplicate diffs for one bundle do not cover another — counting diffs is not coverage", () => {
    const gate = gateBundleAdvance({
      processed_bundle_ids: ["bundle-1", "bundle-2"],
      diffs: [
        { bundle_id: "bundle-1", touched_item_ids: ["intent-1"] },
        { bundle_id: "bundle-1", touched_item_ids: ["intent-3"] },
      ],
      next_bundle_id: "bundle-3",
    });

    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("expected duplicate coverage of one bundle to be rejected");
    expect(gate.reason.trim().length).toBeGreaterThan(0);
  });

  test("advance proceeds once every processed bundle has its diff", () => {
    const gate = gateBundleAdvance({
      processed_bundle_ids: ["bundle-1"],
      diffs: [{ bundle_id: "bundle-1", touched_item_ids: ["intent-2"] }],
      next_bundle_id: "bundle-2",
    });

    expect(gate.ok).toBe(true);
  });

  test("advance proceeds when every one of several processed bundles is covered", () => {
    const gate = gateBundleAdvance({
      processed_bundle_ids: ["bundle-1", "bundle-2"],
      diffs: [
        { bundle_id: "bundle-2", touched_item_ids: ["intent-2", "intent-3"] },
        { bundle_id: "bundle-1", touched_item_ids: ["intent-1"] },
      ],
      next_bundle_id: "bundle-3",
    });

    expect(gate.ok).toBe(true);
  });
});

describe("ac-B2 clause 5 — items touched by the diff are marked reconfirm_required, untouched are not", () => {
  test("every touched item is marked and the untouched item stays unmarked (bidirectional contrast)", () => {
    const marked = markReconfirmRequired({
      items: PRIOR_ITEMS,
      diff: { bundle_id: "bundle-2", touched_item_ids: ["intent-1", "intent-3"] },
    });

    expect(marked.length).toBe(PRIOR_ITEMS.length);
    const byId = new Map(marked.map((item) => [item.id, item]));
    expect(byId.get("intent-1")?.reconfirm_required).toBe(true);
    expect(byId.get("intent-3")?.reconfirm_required).toBe(true);
    // diff가 닿지 않은 항목은 마킹되지 않는다.
    expect(byId.get("intent-2")?.reconfirm_required).not.toBe(true);
  });

  test("a diff touching nothing marks nothing", () => {
    const marked = markReconfirmRequired({
      items: PRIOR_ITEMS,
      diff: { bundle_id: "bundle-1", touched_item_ids: [] },
    });

    expect(marked.length).toBe(PRIOR_ITEMS.length);
    for (const item of marked) {
      expect(item.reconfirm_required).not.toBe(true);
    }
  });
});
