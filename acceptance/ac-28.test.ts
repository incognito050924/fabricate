/**
 * Acceptance test for ac-28 — A4 readiness-floor real-existence signals:
 * `conflicting` becomes a real input (replacing the ported prism gates.ts
 * hardcoded 0), and unsure-answer counts, demotion reviews and characterize
 * verdicts are wired as integer-aggregated judgment inputs of the floor gate.
 *
 * Frozen red: the modules under src/interview/readiness/ do not exist yet.
 * Slice 3 must implement them so this file turns green; these assertions are
 * the completion definition of ac-28.
 *
 * Oracle clauses covered (gate-a/rows/ac-28.json oracle_statement):
 *  (1) conflicting real input — the floor gate receives `conflicting` as an
 *      explicit input derived from the count of the contradiction pass's
 *      (B2, ac-31) conflict list: with N (>= 1) conflict pointer entries the
 *      gate's observed signal record has conflicting === N and the floor
 *      blocks; the same state with 0 conflicts passes. Observed output
 *      follows the input (N = 1, 2, 3), proving by behaviour it is not a
 *      constant 0. The B2 dependency clause is reflected by this
 *      source-seam wiring plus depends_on(ac-31) in the gate-a row.
 *  (2) unsure-answer wiring — answers carrying the unsure marker in the turn
 *      record aggregate to an integer on the signal record (k unsure answers
 *      -> aggregate === k), and changing that value under the same policy
 *      flips the floor verdict, proving a real judgment input, not
 *      display-only.
 *  (3) demotion-review wiring — demotion review records aggregate as an
 *      integer into the gate signals; fixtures with vs without demotion
 *      reviews yield deterministically different signal records and the gate
 *      reads that difference (observed count differs, verdict flips).
 *  (4) characterize-verdict wiring — characterize verdict records aggregate
 *      into the gate signals and act as a judgment input, observed via a
 *      presence/absence fixture pair (observed count differs, verdict flips).
 *  (5) determinism — for the same fixture the four aggregates and the gate
 *      output are identical across repeated calls (pure functions, inputs
 *      not mutated) and every aggregate is an integer >= 0.
 *
 * Residual clauses NOT tested here (per gate-a/rows/ac-28.json residual):
 *  - Semantic correctness of contradictions (whether an answer pair really
 *    conflicts) — ac-31 (B2) residual; this file only closes the wiring that
 *    consumes B2's conflict count. Honest recording when the pass has not
 *    run belongs to ac-31.
 *  - Semantic correctness of the unsure marker (whether an answer really is
 *    uncertain) — human/LLM judgment; only aggregation and wiring of marked
 *    answers is enforced.
 *  - Semantic reality of demotion reviews and characterize verdicts (whether
 *    a demotion was justified, whether a verdict content is right) — only
 *    record existence, aggregation and gate-input wiring is judged.
 *  - Appropriateness of the floor threshold values — fixtures pass explicit
 *    policy bounds; the tests only force each signal to be a real input that
 *    changes the verdict, never which threshold value is right.
 */
import { describe, expect, test } from "bun:test";
import { evaluateReadinessFloor } from "../src/interview/readiness/floor";
import {
  countCharacterizeVerdicts,
  countDemotionReviews,
} from "../src/interview/readiness/review-records";
import { collectReadinessSignals } from "../src/interview/readiness/signals";

/** Conflict-list entry produced by the B2 contradiction pass (ac-31 seam):
 * pointers to >= 2 answer records, never prose copies. */
type ConflictEntry = {
  id: string;
  answer_record_ids: string[];
};

/** Turn record shapes follow the ac-1 record seam; user replies carry an
 * explicit unsure marker. */
type Turn =
  | { kind: "fired_question"; question_text: string; asked_at: string }
  | { kind: "user_reply"; content: string; at: string; unsure: boolean };

type ReviewRecord =
  | { kind: "demotion_review"; id: string; subject: string; reason: string; at: string }
  | { kind: "characterize_verdict"; id: string; subject: string; verdict: string; at: string };

type InterviewFixture = {
  conflicts: ConflictEntry[];
  turns: Turn[];
  reviews: ReviewRecord[];
};

const conflictEntry = (id: string, answerRecordIds: string[]): ConflictEntry => ({
  id,
  answer_record_ids: answerRecordIds,
});

const conflictsOfCount = (n: number): ConflictEntry[] =>
  Array.from({ length: n }, (_, i) =>
    conflictEntry(`c-${i + 1}`, [`a-${2 * i + 1}`, `a-${2 * i + 2}`]),
  );

const firedQuestion = (questionText: string, askedAt: string): Turn => ({
  kind: "fired_question",
  question_text: questionText,
  asked_at: askedAt,
});

const unsureReply = (content: string, at: string): Turn => ({
  kind: "user_reply",
  content,
  at,
  unsure: true,
});

const confidentReply = (content: string, at: string): Turn => ({
  kind: "user_reply",
  content,
  at,
  unsure: false,
});

const demotionReview = (id: string): ReviewRecord => ({
  kind: "demotion_review",
  id,
  subject: "goal-predicate p-1",
  reason: "검증수단이 실측 불가로 판정되어 강등",
  at: "2026-07-25T10:00:00.000Z",
});

const characterizeVerdict = (id: string): ReviewRecord => ({
  kind: "characterize_verdict",
  id,
  subject: "legacy-behavior b-1",
  verdict: "현재 동작을 특성화 테스트로 고정",
  at: "2026-07-25T10:05:00.000Z",
});

const buildState = (overrides: Partial<InterviewFixture> = {}): InterviewFixture => ({
  conflicts: [],
  turns: [],
  reviews: [],
  ...overrides,
});

const turnsWithUnsureCount = (k: number): Turn[] => [
  firedQuestion("보관 기준일은 무엇으로 할까요?", "2026-07-25T09:05:00.000Z"),
  confidentReply("90일 기준이 맞아요", "2026-07-25T09:06:00.000Z"),
  ...Array.from({ length: k }, (_, i) =>
    unsureReply(`잘 모르겠어요 (${i + 1})`, `2026-07-25T09:0${Math.min(i + 7, 9)}:00.000Z`),
  ),
];

/** Permissive policy so a single signal under test drives the verdict. */
const OPEN_POLICY = {
  max_unsure_answers: 100,
  max_demotion_reviews: 100,
  max_characterize_verdicts: 100,
};

describe("ac-28 clause 1 — conflicting is a real input derived from the B2 conflict-list count", () => {
  test("N conflict pointers -> observed conflicting === N and the floor blocks", () => {
    const state = buildState({ conflicts: conflictsOfCount(2) });
    const signals = collectReadinessSignals(state);
    expect(signals.conflicting).toBe(2);
    const verdict = evaluateReadinessFloor(signals, OPEN_POLICY);
    expect(verdict.blocked).toBe(true);
    expect(verdict.observed.conflicting).toBe(2);
    expect(verdict.reasons.some((reason: string) => reason.includes("conflicting"))).toBe(true);
  });

  test("the same state with zero conflicts passes the floor", () => {
    const signals = collectReadinessSignals(buildState({ conflicts: [] }));
    expect(signals.conflicting).toBe(0);
    const verdict = evaluateReadinessFloor(signals, OPEN_POLICY);
    expect(verdict.blocked).toBe(false);
    expect(verdict.observed.conflicting).toBe(0);
    expect(verdict.reasons).toEqual([]);
  });

  test("gate output follows the input (N = 1, 2, 3) — conflicting is not a constant 0", () => {
    const observedByCount = [1, 2, 3].map(
      (n) =>
        evaluateReadinessFloor(
          collectReadinessSignals(buildState({ conflicts: conflictsOfCount(n) })),
          OPEN_POLICY,
        ).observed.conflicting,
    );
    expect(observedByCount).toEqual([1, 2, 3]);
  });
});

describe("ac-28 clause 2 — unsure answers aggregate to an integer that drives the floor verdict", () => {
  test("k unsure-marked answers aggregate to exactly k on the signal record", () => {
    const signals = collectReadinessSignals(buildState({ turns: turnsWithUnsureCount(3) }));
    expect(signals.unsure_answers).toBe(3);
  });

  test("unmarked answers and fired questions are not counted", () => {
    const signals = collectReadinessSignals(
      buildState({
        turns: [
          firedQuestion("어느 보관함으로 옮길까요?", "2026-07-25T09:05:00.000Z"),
          confidentReply("기본 보관함이요", "2026-07-25T09:06:00.000Z"),
          confidentReply("네, 확실해요", "2026-07-25T09:07:00.000Z"),
        ],
      }),
    );
    expect(signals.unsure_answers).toBe(0);
  });

  test("changing the unsure count flips the verdict under the same policy (real input, not display-only)", () => {
    const policy = { ...OPEN_POLICY, max_unsure_answers: 2 };
    const atBound = evaluateReadinessFloor(
      collectReadinessSignals(buildState({ turns: turnsWithUnsureCount(2) })),
      policy,
    );
    const overBound = evaluateReadinessFloor(
      collectReadinessSignals(buildState({ turns: turnsWithUnsureCount(3) })),
      policy,
    );
    expect(atBound.blocked).toBe(false);
    expect(atBound.observed.unsure_answers).toBe(2);
    expect(overBound.blocked).toBe(true);
    expect(overBound.observed.unsure_answers).toBe(3);
    expect(overBound.reasons.some((reason: string) => reason.includes("unsure"))).toBe(true);
  });
});

describe("ac-28 clause 3 — demotion reviews aggregate as integers into the gate signals", () => {
  const demotions: ReviewRecord[] = [demotionReview("r-1"), demotionReview("r-2")];

  test("countDemotionReviews counts demotion review records only", () => {
    expect(countDemotionReviews([...demotions, characterizeVerdict("r-3")])).toBe(2);
    expect(countDemotionReviews([])).toBe(0);
  });

  test("with/without fixtures yield deterministically different signal records", () => {
    const withReviews = collectReadinessSignals(buildState({ reviews: demotions }));
    const withoutReviews = collectReadinessSignals(buildState({ reviews: [] }));
    expect(withReviews.demotion_reviews).toBe(2);
    expect(withoutReviews.demotion_reviews).toBe(0);
    expect(withReviews).not.toEqual(withoutReviews);
  });

  test("the gate reads the difference — verdict flips under the same policy", () => {
    const policy = { ...OPEN_POLICY, max_demotion_reviews: 0 };
    const blockedVerdict = evaluateReadinessFloor(
      collectReadinessSignals(buildState({ reviews: demotions })),
      policy,
    );
    const passingVerdict = evaluateReadinessFloor(collectReadinessSignals(buildState()), policy);
    expect(blockedVerdict.blocked).toBe(true);
    expect(blockedVerdict.observed.demotion_reviews).toBe(2);
    expect(blockedVerdict.reasons.some((reason: string) => reason.includes("demotion"))).toBe(true);
    expect(passingVerdict.blocked).toBe(false);
    expect(passingVerdict.observed.demotion_reviews).toBe(0);
  });
});

describe("ac-28 clause 4 — characterize verdicts aggregate into the gate signals as a judgment input", () => {
  const characterizations: ReviewRecord[] = [characterizeVerdict("r-10")];

  test("countCharacterizeVerdicts counts characterize verdict records only", () => {
    expect(countCharacterizeVerdicts([...characterizations, demotionReview("r-11")])).toBe(1);
    expect(countCharacterizeVerdicts([])).toBe(0);
  });

  test("presence/absence fixture pair — the signal record observes the wiring", () => {
    const withVerdicts = collectReadinessSignals(buildState({ reviews: characterizations }));
    const withoutVerdicts = collectReadinessSignals(buildState({ reviews: [] }));
    expect(withVerdicts.characterize_verdicts).toBe(1);
    expect(withoutVerdicts.characterize_verdicts).toBe(0);
    expect(withVerdicts).not.toEqual(withoutVerdicts);
  });

  test("the gate consumes the aggregate — verdict flips under the same policy", () => {
    const policy = { ...OPEN_POLICY, max_characterize_verdicts: 0 };
    const blockedVerdict = evaluateReadinessFloor(
      collectReadinessSignals(buildState({ reviews: characterizations })),
      policy,
    );
    const passingVerdict = evaluateReadinessFloor(collectReadinessSignals(buildState()), policy);
    expect(blockedVerdict.blocked).toBe(true);
    expect(blockedVerdict.observed.characterize_verdicts).toBe(1);
    expect(blockedVerdict.reasons.some((reason: string) => reason.includes("characterize"))).toBe(
      true,
    );
    expect(passingVerdict.blocked).toBe(false);
    expect(passingVerdict.observed.characterize_verdicts).toBe(0);
  });
});

describe("ac-28 clause 5 — integer aggregation and gate wiring are deterministic and pure", () => {
  const mixedState = buildState({
    conflicts: conflictsOfCount(1),
    turns: turnsWithUnsureCount(1),
    reviews: [demotionReview("r-20"), characterizeVerdict("r-21")],
  });

  test("repeated signal collection over the same fixture is always identical", () => {
    const first = collectReadinessSignals(mixedState);
    const second = collectReadinessSignals(mixedState);
    expect(second).toEqual(first);
  });

  test("repeated floor evaluation over the same signals is always identical", () => {
    const signals = collectReadinessSignals(mixedState);
    const first = evaluateReadinessFloor(signals, OPEN_POLICY);
    const second = evaluateReadinessFloor(signals, OPEN_POLICY);
    expect(second).toEqual(first);
  });

  test("collection and evaluation do not mutate their input fixture (pure functions)", () => {
    const snapshot = structuredClone(mixedState);
    evaluateReadinessFloor(collectReadinessSignals(mixedState), OPEN_POLICY);
    expect(mixedState).toEqual(snapshot);
  });

  test("all four aggregates are integers >= 0 on both mixed and empty fixtures", () => {
    for (const state of [mixedState, buildState()]) {
      const signals = collectReadinessSignals(state);
      const aggregates = [
        signals.conflicting,
        signals.unsure_answers,
        signals.demotion_reviews,
        signals.characterize_verdicts,
      ];
      for (const value of aggregates) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
