/**
 * ac-35 acceptance — B5 materiality ask-trigger: k interpretations projected
 * to artifact→behavior are diffed into a {material, divergence_point?}
 * record (zod-parsed, fail-closed), routing over {material, risk tag} is a
 * deterministic total function realizing the statement's four branches
 * (immaterial → assume + visible log with the k-diff record attached as
 * evidence, no question; material·high-risk → divergence-point question;
 * material·low-risk-reversible → assumption log, no question), and the
 * diversity floor forbids an "immaterial" verdict on single-reading
 * collapse. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-35.json), covered clauses:
 *  (1) k-diff record schema — kDiffRecordSchema
 *      (src/interview/materiality/k-diff.ts) parses
 *      {material: boolean, divergence_point?: string}; a record missing
 *      `material`, carrying a non-boolean material, a non-string
 *      divergence_point, unknown extra keys, or a non-object payload is
 *      rejected (divergence_point stays optional and is preserved verbatim
 *      when present).
 *  (2) routing determinism + four-branch totality — routeMateriality
 *      (src/interview/materiality/ask-router.ts) is a pure function of
 *      {k_diff, risk_tag} (same input repeated → deep-equal routing, no
 *      model call): material=false routes to '가정+가시로그' with zero
 *      questions (over-ask suppression) regardless of risk tag, and its
 *      visible-log record carries the input k-diff record verbatim as
 *      evidence — checkKDiffAttachment accepts the routed log and rejects an
 *      assumption log without the attachment; material=true + high-risk
 *      routes to '분기점 질문' and the emitted question references
 *      divergence_point; material=true + low-risk-reversible routes to
 *      '가정로그' with zero questions; every {material, risk_tag}
 *      combination lands on one of the three defined routes (total function,
 *      no undefined branch).
 *  (3) diversity floor — checkDiversityFloor
 *      (src/interview/materiality/diversity-floor.ts) rejects fail-closed a
 *      material=false ('비중대') verdict when distinct interpretations < 2
 *      (a single reading, or duplicates collapsing to one), and passes the
 *      same verdict when the fixture holds ≥2 genuinely distinct
 *      interpretations.
 *
 * Residual (NOT tested here, per row residual):
 *  - Substance of the materiality judgment (correlated blind spot, same
 *    prior): whether the k interpretations genuinely diverge and whether
 *    divergence_point is a real fork all come from the same model prior; the
 *    diversity floor is only a structural approximation against
 *    single-reading collapse and cannot filter interpretation sets trapped
 *    in the same prior.
 *  - Risk-grade labeling: the low-risk-reversible / high-risk classification
 *    itself is LLM/human judgment — this file routes only above
 *    fixture-fixed tags (tag emission → pure gate routing pattern).
 *  - Over-ask suppression efficacy: whether question volume actually drops
 *    in real use is not closed by this verdict (the statement pins
 *    ClarifyGPT 80.8% as that harness's number); measurement belongs to the
 *    C4 calibration loop / synthetic-user regression harness (ac-40).
 */
import { describe, expect, test } from "bun:test";
import { checkKDiffAttachment, routeMateriality } from "../src/interview/materiality/ask-router";
import { checkDiversityFloor } from "../src/interview/materiality/diversity-floor";
import { kDiffRecordSchema } from "../src/interview/materiality/k-diff";

// Korean route labels for the statement's branches, asserted verbatim:
// 불변=가정+가시로그 · 변함·고위험=분기점 질문 · 변함·저위험가역=가정로그.
const ASSUME_PLUS_VISIBLE_LOG = "가정+가시로그";
const DIVERGENCE_QUESTION = "분기점 질문";
const ASSUMPTION_LOG = "가정로그";
const ALL_ROUTES = [ASSUME_PLUS_VISIBLE_LOG, DIVERGENCE_QUESTION, ASSUMPTION_LOG];

// Risk tags are FIXED BY FIXTURE — the grading judgment itself is residual.
const RISK_TAGS = ["low-risk-reversible", "high-risk"] as const;

const DIVERGENCE_POINT = "부분 실패 시 전체 롤백인지 부분 커밋 후 재시도인지";
const IMMATERIAL_K_DIFF = { material: false };
const MATERIAL_K_DIFF = { material: true, divergence_point: DIVERGENCE_POINT };

describe("ac-35 clause 1 — k-diff record parses as {material, divergence_point?} and is fail-closed", () => {
  test("an immaterial record {material: false} parses — divergence_point is optional", () => {
    const parsed = kDiffRecordSchema.safeParse({ material: false });

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the immaterial record to parse");
    expect(parsed.data.material).toBe(false);
  });

  test("a material record with divergence_point parses and preserves the point verbatim", () => {
    const parsed = kDiffRecordSchema.safeParse(MATERIAL_K_DIFF);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the material record to parse");
    expect(parsed.data.material).toBe(true);
    expect(parsed.data.divergence_point).toBe(DIVERGENCE_POINT);
  });

  test("a record missing material is rejected — material is mandatory", () => {
    expect(kDiffRecordSchema.safeParse({}).success).toBe(false);
    expect(kDiffRecordSchema.safeParse({ divergence_point: DIVERGENCE_POINT }).success).toBe(false);
  });

  test("a non-boolean material is rejected (no truthy coercion)", () => {
    expect(kDiffRecordSchema.safeParse({ material: "false" }).success).toBe(false);
    expect(kDiffRecordSchema.safeParse({ material: 1 }).success).toBe(false);
  });

  test("a non-string divergence_point is rejected", () => {
    expect(kDiffRecordSchema.safeParse({ material: true, divergence_point: 42 }).success).toBe(
      false,
    );
  });

  test("an out-of-schema shape with unknown keys is rejected", () => {
    const parsed = kDiffRecordSchema.safeParse({ material: true, verdict: "ask" });

    expect(parsed.success).toBe(false);
  });

  test("a non-object payload is rejected", () => {
    expect(kDiffRecordSchema.safeParse(null).success).toBe(false);
    expect(kDiffRecordSchema.safeParse("material").success).toBe(false);
  });
});

describe("ac-35 clause 2 — routing is a deterministic total function of {material, risk tag}", () => {
  test("material=false routes to '가정+가시로그' and asks nothing (over-ask suppression)", () => {
    const routed = routeMateriality({
      k_diff: IMMATERIAL_K_DIFF,
      risk_tag: "low-risk-reversible",
    });

    expect(routed.route).toBe(ASSUME_PLUS_VISIBLE_LOG);
    expect(routed.questions.length).toBe(0);
    expect(routed.visible_log.length).toBe(1);
    expect(typeof routed.visible_log[0].entry).toBe("string");
    expect(routed.visible_log[0].entry.trim().length).toBeGreaterThan(0);
  });

  test("material=false with a high-risk tag STILL routes to '가정+가시로그' — an immaterial diff never asks", () => {
    const routed = routeMateriality({ k_diff: IMMATERIAL_K_DIFF, risk_tag: "high-risk" });

    expect(routed.route).toBe(ASSUME_PLUS_VISIBLE_LOG);
    expect(routed.questions.length).toBe(0);
  });

  test("the visible-log record carries the k-diff record verbatim as evidence (증거로 k-diff)", () => {
    const routed = routeMateriality({
      k_diff: IMMATERIAL_K_DIFF,
      risk_tag: "low-risk-reversible",
    });

    expect(routed.visible_log[0].evidence).toEqual(IMMATERIAL_K_DIFF);

    const gate = checkKDiffAttachment({ visible_log: routed.visible_log });
    expect(gate.ok).toBe(true);
  });

  test("an assumption log WITHOUT a k-diff attachment is rejected — no evidence, no log", () => {
    const gate = checkKDiffAttachment({
      visible_log: [{ entry: "가정: 부분 실패 시 전체 롤백으로 간주한다" }],
    });

    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("expected the attachment-free assumption log to be rejected");
    expect(gate.reason).toContain("k-diff");
  });

  test("material=true + high-risk routes to '분기점 질문' and the question references divergence_point", () => {
    const routed = routeMateriality({ k_diff: MATERIAL_K_DIFF, risk_tag: "high-risk" });

    expect(routed.route).toBe(DIVERGENCE_QUESTION);
    expect(routed.questions.length).toBe(1);
    // The emitted question carries the divergence point verbatim and asks about it.
    expect(routed.questions[0].divergence_point).toBe(DIVERGENCE_POINT);
    expect(routed.questions[0].question).toContain(DIVERGENCE_POINT);
    // Ask-branch means ask-not-assume: nothing is silently assumed.
    expect(routed.assumption_log.length).toBe(0);
  });

  test("material=true + low-risk-reversible routes to '가정로그' without asking", () => {
    const routed = routeMateriality({ k_diff: MATERIAL_K_DIFF, risk_tag: "low-risk-reversible" });

    expect(routed.route).toBe(ASSUMPTION_LOG);
    expect(routed.questions.length).toBe(0);
    expect(routed.assumption_log.length).toBe(1);
    expect(typeof routed.assumption_log[0].entry).toBe("string");
    expect(routed.assumption_log[0].entry.trim().length).toBeGreaterThan(0);
  });

  test("routing is deterministic — the same input repeated yields deep-equal routing (no model call)", () => {
    for (const k_diff of [IMMATERIAL_K_DIFF, MATERIAL_K_DIFF]) {
      for (const risk_tag of RISK_TAGS) {
        const first = routeMateriality({ k_diff, risk_tag });
        const second = routeMateriality({ k_diff, risk_tag });

        expect(second).toEqual(first);
      }
    }
  });

  test("total function — every {material, risk_tag} combination lands on a defined route", () => {
    for (const k_diff of [IMMATERIAL_K_DIFF, MATERIAL_K_DIFF]) {
      for (const risk_tag of RISK_TAGS) {
        const routed = routeMateriality({ k_diff, risk_tag });

        expect(ALL_ROUTES).toContain(routed.route);
        expect(Array.isArray(routed.questions)).toBe(true);
      }
    }
  });
});

describe("ac-35 clause 3 — diversity floor: single-reading collapse cannot claim '비중대'", () => {
  const COLLAPSED_READING = "세션 저장소를 데이터베이스로 옮긴다";

  test("two identical readings collapse to one distinct interpretation — material=false is rejected fail-closed", () => {
    const verdict = checkDiversityFloor({
      interpretations: [COLLAPSED_READING, COLLAPSED_READING],
      k_diff: IMMATERIAL_K_DIFF,
    });

    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected the collapsed set to be rejected");
    expect(verdict.reason).toContain("비중대");
  });

  test("a single-interpretation fixture is likewise below the floor — material=false rejected", () => {
    const verdict = checkDiversityFloor({
      interpretations: [COLLAPSED_READING],
      k_diff: IMMATERIAL_K_DIFF,
    });

    expect(verdict.ok).toBe(false);
  });

  test("two genuinely distinct interpretations satisfy the floor — the same verdict passes", () => {
    const verdict = checkDiversityFloor({
      interpretations: [
        "세션 저장소를 데이터베이스로 옮기되 기존 파일 세션은 마이그레이션한다",
        "세션 저장소를 데이터베이스로 옮기고 기존 파일 세션은 만료 후 폐기한다",
      ],
      k_diff: IMMATERIAL_K_DIFF,
    });

    expect(verdict.ok).toBe(true);
  });
});
