/**
 * ac-19 acceptance — U9 assumption-ledger globalization (Brier).
 * Frozen red: src/interview/charter/directives.ts,
 * src/ledger/assumption-ledger.ts and src/ledger/retro-settlement.ts do not
 * exist yet; the piece-3 implementation must turn this file green without
 * editing it.
 *
 * Oracle (gate-a/rows/ac-19.json), covered clauses:
 *  (1) the revised charter/directive source text exported by
 *      src/interview/charter/directives.ts contains the U9 operative-cue —
 *      '모든 로그된 가정에 신뢰도 필드' and
 *      '회고 정산은 인터뷰에 한정되지 않는다(인터뷰-비한정)' — asserted as
 *      deterministic substring grep, isolated to the U9 directive block so
 *      that other cues mentioning 가정 (e.g. U2/U4) cannot mask a missing U9
 *      cue via a whole-file match, and the block itself must be part of the
 *      exported charter text (no detached side-channel constant)
 *  (2) confidence field presence (deterministic): the assumption-ledger
 *      schema requires a confidence field — a record missing it, or carrying
 *      an empty one, is rejected at parse time and at log time — and every
 *      assumption logged from the fixture turns carries a non-empty
 *      confidence field
 *  (3) globalization (deterministic): the ledger accepts a non-interview-
 *      origin assumption record under the exact same schema, and the retro
 *      settlement target set includes both the interview-origin and the
 *      non-interview-origin fixture — the absence of an interview-only
 *      filter is observed by the contrast of two fixtures differing in
 *      origin (semi-deterministic fixture-turn structural observation)
 *  (4) correlation blind-spot notation (deterministic existence check): the
 *      retro settlement output record carries the note that the confidence
 *      values share the same model prior, so cross-machine agreement is not
 *      credited as independent evidence
 *
 * Residual (NOT tested here, per row residual):
 *  - Settlement value judgment: whether the outcome settled for each
 *    assumption (hit/miss and its Brier reflection) matches retrospective
 *    fact requires real retrospective outcomes; no settled values are
 *    asserted anywhere in this file.
 *  - Resolution of the correlation blind spot: only the presence of the
 *    notation is checked; the limitation itself — shared-prior misreadings
 *    that settlement cannot catch — is not resolved by this criterion.
 *  - Compliance outside fixtures: whether retro settlement actually runs in
 *    real operation (when, how often) is orchestration's concern; the
 *    fixture observation only checks the structure of tagged cases.
 */
import { describe, expect, test } from "bun:test";
import { CHARTER_DIRECTIVES, getDirectiveBlock } from "../src/interview/charter/directives";
import { createAssumptionLedger, parseAssumptionRecord } from "../src/ledger/assumption-ledger";
import { runRetroSettlement } from "../src/ledger/retro-settlement";

// Interview-origin fixture assumption. The confidence value itself is
// fixture-fixed; whether it later settles as right or wrong is residual.
const INTERVIEW_ASSUMPTION = {
  assumption_id: "a-interview-1",
  origin: "interview",
  statement: "백업 폴더가 이미 존재한다고 가정했다",
  confidence: "likely",
  logged_at: "2026-07-25T09:00:00.000Z",
};

// Non-interview-origin fixture assumption (logged during execution, outside
// any interview). Same schema, only the origin differs — the contrast pair
// for the globalization clause.
const EXECUTION_ASSUMPTION = {
  assumption_id: "a-execution-1",
  origin: "execution",
  statement: "빌드 캐시가 최신 lockfile 기준으로 유효하다고 가정했다",
  confidence: "guess",
  logged_at: "2026-07-25T10:00:00.000Z",
};

describe("ac-19 clause 1 — U9 operative-cue exists in the revised directives (deterministic grep)", () => {
  test("the U9 directive block carries both operative-cue strings", () => {
    const block = getDirectiveBlock("U9");

    // Block isolation: U2/U4 also talk about 가정 logging, so a whole-file
    // substring hit must not be able to mask a missing U9 cue.
    expect(block).toContain("모든 로그된 가정에 신뢰도 필드");
    expect(block).toContain("회고 정산은 인터뷰에 한정되지 않는다");
    expect(block).toContain("인터뷰-비한정");
  });

  test("the U9 block is part of the exported charter source text itself", () => {
    const block = getDirectiveBlock("U9");

    // The cue must live in the injected directive text, not in a detached
    // constant that never reaches the interview surface.
    expect(CHARTER_DIRECTIVES).toContain(block);
    expect(CHARTER_DIRECTIVES).toContain("모든 로그된 가정에 신뢰도 필드");
    expect(CHARTER_DIRECTIVES).toContain("회고 정산은 인터뷰에 한정되지 않는다");
  });
});

describe("ac-19 clause 2 — confidence field is required on every logged assumption (deterministic)", () => {
  test("a record without a confidence field is rejected at parse time", () => {
    const { confidence: _dropped, ...noConfidence } = INTERVIEW_ASSUMPTION;

    expect(() => parseAssumptionRecord(noConfidence)).toThrow();
  });

  test("a record with an empty confidence field is rejected at parse time", () => {
    expect(() => parseAssumptionRecord({ ...INTERVIEW_ASSUMPTION, confidence: "" })).toThrow();
  });

  test("the ledger refuses to log a confidence-less assumption", () => {
    const ledger = createAssumptionLedger();
    const { confidence: _dropped, ...noConfidence } = EXECUTION_ASSUMPTION;

    expect(() => ledger.log(noConfidence)).toThrow();
    // The rejected record must not have leaked into the ledger.
    expect(ledger.list()).toHaveLength(0);
  });

  test("every assumption logged from the fixture turns carries a non-empty confidence field", () => {
    const ledger = createAssumptionLedger();
    ledger.log(INTERVIEW_ASSUMPTION);
    ledger.log(EXECUTION_ASSUMPTION);

    const records = ledger.list();
    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(typeof record.confidence).toBe("string");
      expect(record.confidence.length).toBeGreaterThan(0);
    }
  });
});

describe("ac-19 clause 3 — globalization: the ledger and the settlement target set are not interview-scoped", () => {
  test("a non-interview-origin record is accepted under the same schema", () => {
    const parsed = parseAssumptionRecord(EXECUTION_ASSUMPTION);

    expect(parsed.origin).toBe("execution");
    expect(parsed.assumption_id).toBe("a-execution-1");
    expect(parsed.confidence).toBe("guess");
  });

  test("the retro settlement target set includes interview- and non-interview-origin assumptions", () => {
    const ledger = createAssumptionLedger();
    ledger.log(INTERVIEW_ASSUMPTION);
    ledger.log(EXECUTION_ASSUMPTION);

    const settlement = runRetroSettlement(ledger.list());

    // Contrast pair: both fixtures reach the target set — an interview-only
    // filter would drop a-execution-1 and fail here.
    const targetIds = settlement.targets.map(
      (target: { assumption_id: string }) => target.assumption_id,
    );
    expect(targetIds).toContain("a-interview-1");
    expect(targetIds).toContain("a-execution-1");
    expect(settlement.targets).toHaveLength(2);

    const origins = settlement.targets.map((target: { origin: string }) => target.origin).sort();
    expect(origins).toEqual(["execution", "interview"]);
  });
});

describe("ac-19 clause 4 — correlation blind-spot notation exists on the settlement output (deterministic existence)", () => {
  test("the settlement output record states the shared-prior blind spot verbatim", () => {
    const ledger = createAssumptionLedger();
    ledger.log(INTERVIEW_ASSUMPTION);
    ledger.log(EXECUTION_ASSUMPTION);

    const settlement = runRetroSettlement(ledger.list());

    expect(typeof settlement.correlation_blind_spot).toBe("string");
    expect(settlement.correlation_blind_spot).toContain("같은 모델 prior");
    expect(settlement.correlation_blind_spot).toContain(
      "기계 간 일치를 독립 증거로 가산하지 않는다",
    );
  });
});
