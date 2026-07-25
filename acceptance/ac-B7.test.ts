/**
 * ac-B7 acceptance — GATE question-mode policy (forced-artifact).
 * Frozen red: src/interview/question-mode/mode-record.ts,
 * src/interview/question-mode/mode-audit.ts, and
 * src/interview/question-mode/novel-consideration.ts do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-B7.json), covered clauses:
 *  (1) mode record — questionRoundRecordSchema
 *      (src/interview/question-mode/mode-record.ts) admits exactly
 *      question_mode ∈ {개방형, 경계라벨, 예아니오} on per-round question
 *      records (values preserved verbatim) and rejects a round record whose
 *      question_mode is missing or out of the enum at zod parse time
 *      (negative fixtures — the field is required, which is how "recorded
 *      per round" is enforced).
 *  (2) mode distribution audit — auditModeDistribution
 *      (src/interview/question-mode/mode-audit.ts): over a fixture column of
 *      mode-recorded rounds the audit output carries per-mode counts whose
 *      sum equals the number of recorded question rounds, plus a
 *      round-ordered mode sequence from which early-개방형 / mid-경계라벨 /
 *      late-예아니오 policy compliance is observable; the same input always
 *      yields the same audit (deterministic), and a policy-VIOLATING fixture
 *      still yields a normal audit with the violating sequence verbatim —
 *      the audit observes policy compliance, it does not block violations.
 *  (3) novel_consideration_count — assessNovelConsideration /
 *      gateSessionAdvance (src/interview/question-mode/novel-consideration.ts):
 *      the assessment carries an integer (>= 0) novel_consideration_count
 *      (count of items absent from the first request, novelty fixed by
 *      fixture tags); a session fixed at zero novel items raises the
 *      weak-elicitation weak-signal flag, a contrast fixture with >= 1
 *      novel items does not (bidirectional contrast); and the weak signal
 *      is a signal record, not a blocking gate — on the count=0 fixture the
 *      session advance gate still passes with the flag alone, and the flag
 *      survives the gate unconsumed.
 *
 * Residual (NOT tested here, per row residual):
 *  - Mode appropriateness — whether an actual question really is
 *    개방형/경계라벨/예아니오, and whether the early-open / mid-boundary /
 *    late-yes-no policy was substantively followed, is a human-judged
 *    predicate the contract itself declares residual; mode labels are
 *    fixture-fixed and only enum enforcement, audit math, and signal wiring
 *    are asserted.
 *  - Semantic novelty of novel_consideration — which items were truly absent
 *    from the first request is not mechanized; the fixtures fix the novel
 *    set and only the count field and the 0 → weak-signal wiring are
 *    checked, so whether a real session counts novelty correctly stays open.
 *  - Weak-elicitation signal efficacy — whether the weak signal actually
 *    steers a parrot (extraction-failure) interview toward improvement needs
 *    real-use observation; the machine closes only up to signal emission.
 */
import { describe, expect, test } from "bun:test";
import { auditModeDistribution } from "../src/interview/question-mode/mode-audit";
import { questionRoundRecordSchema } from "../src/interview/question-mode/mode-record";
import {
  assessNovelConsideration,
  gateSessionAdvance,
} from "../src/interview/question-mode/novel-consideration";

// ---------------------------------------------------------------------------
// Fixtures. Mode labels and item novelty are FIXED BY FIXTURE — whether each
// label is right for the actual discourse is residual; this file asserts only
// enum enforcement, audit math, and signal wiring.
// ---------------------------------------------------------------------------

const QUESTION_MODES = ["개방형", "경계라벨", "예아니오"] as const;

const makeRound = (round_index: number, question_mode: string, question_text: string) => ({
  round_index,
  question_text,
  question_mode,
});

// Policy-compliant column: early rounds 개방형, middle rounds 경계라벨, late
// rounds 예아니오. Compliance itself is residual — the fixture just makes it
// observable through the audit output.
const compliantRounds = () => [
  makeRound(1, "개방형", "이번 작업으로 무엇이 달라지길 바라세요?"),
  makeRound(2, "개방형", "지금 방식에서 가장 불편한 지점은 어디인가요?"),
  makeRound(3, "경계라벨", "이 항목은 '필수'와 '선호' 중 어느 쪽에 두시겠어요?"),
  makeRound(4, "경계라벨", "실패 시 동작은 '중단'과 '계속' 중 어느 경계에 가깝나요?"),
  makeRound(5, "예아니오", "원본 파일은 이동 후 삭제해도 되나요?"),
  makeRound(6, "예아니오", "매일 자정 실행으로 확정할까요?"),
];

// Policy-violating column: yes/no first, open-ended last. The audit must
// still be produced — it observes the violation, it does not block it.
const violatingRounds = () => [
  makeRound(1, "예아니오", "매일 자정 실행으로 확정할까요?"),
  makeRound(2, "경계라벨", "이 항목은 '필수'와 '선호' 중 어느 쪽인가요?"),
  makeRound(3, "개방형", "이번 작업으로 무엇이 달라지길 바라세요?"),
];

const withoutField = (record: Record<string, unknown>, field: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== field));

// ---------------------------------------------------------------------------
// Clause 1 — per-round question records lock question_mode to the enum
// {개방형, 경계라벨, 예아니오}; missing or out-of-enum is a parse rejection
// ---------------------------------------------------------------------------

describe("ac-B7 clause 1 — question_mode admits exactly {개방형, 경계라벨, 예아니오}", () => {
  for (const mode of QUESTION_MODES) {
    test(`a round record with question_mode '${mode}' parses and preserves the mode verbatim`, () => {
      const parsed = questionRoundRecordSchema.safeParse(makeRound(1, mode, "질문 본문"));

      expect(parsed.success).toBe(true);
      if (!parsed.success) throw new Error(`expected the '${mode}' round record to parse`);
      expect(parsed.data.question_mode).toBe(mode);
    });
  }

  test("the parsed record preserves the question text verbatim alongside the mode", () => {
    const round = makeRound(5, "예아니오", "원본 파일은 이동 후 삭제해도 되나요?");
    const parsed = questionRoundRecordSchema.safeParse(round);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the round record to parse");
    expect(parsed.data.question_text).toBe("원본 파일은 이동 후 삭제해도 되나요?");
  });

  test("a round record missing question_mode is rejected at parse time (field required per round)", () => {
    const modeless = withoutField(makeRound(1, "개방형", "질문 본문"), "question_mode");

    expect(questionRoundRecordSchema.safeParse(modeless).success).toBe(false);
  });

  for (const bogus of ["혼합형", "open", ""]) {
    test(`a round record with out-of-enum question_mode '${bogus}' is rejected at parse time`, () => {
      const parsed = questionRoundRecordSchema.safeParse(makeRound(1, bogus, "질문 본문"));

      expect(parsed.success).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Clause 2 — the mode distribution audit: per-mode counts summing to the
// round count, a round-ordered mode sequence (policy compliance observable),
// determinism, and no blocking of policy violations
// ---------------------------------------------------------------------------

describe("ac-B7 clause 2 — mode distribution audit over a mode-recorded round column", () => {
  test("per-mode counts match the fixture and their sum equals the recorded round count", () => {
    const rounds = compliantRounds();
    const audit = auditModeDistribution(rounds);

    expect(audit.mode_counts).toEqual({ 개방형: 2, 경계라벨: 2, 예아니오: 2 });
    const total = QUESTION_MODES.reduce((sum, mode) => sum + audit.mode_counts[mode], 0);
    expect(total).toBe(rounds.length);
  });

  test("the audit carries the round-ordered mode sequence — policy compliance is observable", () => {
    const audit = auditModeDistribution(compliantRounds());

    expect(audit.mode_sequence).toEqual([
      "개방형",
      "개방형",
      "경계라벨",
      "경계라벨",
      "예아니오",
      "예아니오",
    ]);
  });

  test("the same input always yields the same audit (deterministic)", () => {
    const first = auditModeDistribution(compliantRounds());
    const second = auditModeDistribution(compliantRounds());

    expect(second).toEqual(first);
  });

  test("a policy-violating column still yields a normal audit — the audit observes, it does not block", () => {
    const rounds = violatingRounds();

    expect(() => auditModeDistribution(rounds)).not.toThrow();
    const audit = auditModeDistribution(rounds);
    // The violation is visible verbatim in the output, not rejected.
    expect(audit.mode_sequence).toEqual(["예아니오", "경계라벨", "개방형"]);
    const total = QUESTION_MODES.reduce((sum, mode) => sum + audit.mode_counts[mode], 0);
    expect(total).toBe(rounds.length);
  });
});

// ---------------------------------------------------------------------------
// Clause 3 — novel_consideration_count: integer >= 0; 0 novel items raise the
// weak-elicitation flag, >= 1 do not; the flag alone never blocks advance
// ---------------------------------------------------------------------------

// Novelty tags are FIXED BY FIXTURE — whether an item was truly absent from
// the first request is residual; only counting and signal wiring is asserted.
const FIRST_REQUEST = "임시 파일을 옮기고 매일 자정에 반복 실행해 주세요.";

const zeroNovelSession = () => ({
  initial_request: FIRST_REQUEST,
  elicited_items: [
    { id: "item-move", content: "임시 파일을 옮긴다", novel: false },
    { id: "item-schedule", content: "매일 자정에 반복 실행한다", novel: false },
  ],
});

const novelSession = () => ({
  initial_request: FIRST_REQUEST,
  elicited_items: [
    { id: "item-move", content: "임시 파일을 옮긴다", novel: false },
    { id: "item-schedule", content: "매일 자정에 반복 실행한다", novel: false },
    { id: "item-collision", content: "같은 이름 파일 충돌 시 보존 정책", novel: true },
    { id: "item-rollback", content: "이동 실패 시 원상 복구 절차", novel: true },
  ],
});

describe("ac-B7 clause 3 — novel_consideration_count and the weak-elicitation weak signal", () => {
  test("the assessment carries an integer novel_consideration_count >= 0", () => {
    const assessment = assessNovelConsideration(zeroNovelSession());

    expect(Number.isInteger(assessment.novel_consideration_count)).toBe(true);
    expect(assessment.novel_consideration_count).toBeGreaterThanOrEqual(0);
  });

  test("a session fixed at zero novel items counts 0 and raises the weak-elicitation flag", () => {
    const assessment = assessNovelConsideration(zeroNovelSession());

    expect(assessment.novel_consideration_count).toBe(0);
    expect(assessment.weak_elicitation).toBe(true);
  });

  test("contrast fixture: a session with novel items counts them and raises no flag", () => {
    const assessment = assessNovelConsideration(novelSession());

    expect(assessment.novel_consideration_count).toBe(2);
    expect(assessment.weak_elicitation).toBe(false);
  });

  test("the weak signal is a signal record, not a blocking gate — advance passes on the flag alone", () => {
    const assessment = assessNovelConsideration(zeroNovelSession());
    expect(assessment.weak_elicitation).toBe(true);

    const gate = gateSessionAdvance({ assessment });

    expect(gate.ok).toBe(true);
    // The gate lets the session proceed without consuming the signal — the
    // weak-elicitation record survives as-is.
    expect(assessment.weak_elicitation).toBe(true);
  });
});
