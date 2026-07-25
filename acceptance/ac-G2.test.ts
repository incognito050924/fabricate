/**
 * ac-G2 acceptance — boundary scenario + immediate glossary recording (an
 * extension of ac-34): a B4 challenge output must carry an invented
 * boundary_scenario that is non-empty and references the challenge target
 * (the original answer turn, or the challenged term), and an agreed term must
 * be recorded into the glossary on the spot — with a delay flag produced when
 * the recording turn differs from the agreement turn. Red-frozen.
 *
 * Whether a B4 challenge fired at all, and whether a term was actually
 * agreed, are fixed BY FIXTURE here: challenge firing and citation structure
 * belong to the parent ac-34, and agreement-content judgment is not graded.
 *
 * Oracle (gate-a/rows/ac-G2.json), covered clauses:
 *  (1) boundary scenario produced: on a fixture-fixed B4 challenge, the
 *      challenge output carries a required, non-empty boundary_scenario
 *      (.min(1)) that references the challenge target; a B4 challenge output
 *      without a boundary_scenario is refused by both the zod schema and the
 *      approval gate (negative fixtures), as is one whose target reference
 *      does not point at the challenge's own target. Two independent challenge
 *      fixtures with disjoint targets are crossed against each other so the
 *      reference check cannot be a comparison with fixture constants.
 *  (2) immediate glossary recording: from a fixture turn where a term is
 *      agreed, a glossary recording record (consuming ac-21's five-field
 *      glossary entry structure) is produced on the spot — asserted as the
 *      immediacy predicate that the record's recorded_at turn reference
 *      equals the agreement turn reference, with the agreed entry preserved
 *      verbatim.
 *  (3) delay flag: in a fixture where the agreement turn and the recording
 *      turn differ, a delay flag record is produced that references both the
 *      agreement turn and the delayed recording turn; in the immediately
 *      recorded fixture no delay flag is produced.
 *  (4) determinism: the boundary-scenario gate and the immediacy/delay-flag
 *      judgment are pure functions — identical input always yields identical
 *      output.
 *
 * Residual (NOT tested here, per row residual):
 *  - Scenario adequacy — whether the invented boundary_scenario really is a
 *    concrete, valid scenario that pokes at the boundary is declared residual
 *    by the locked statement itself; the machine checks only presence,
 *    non-emptiness, and the challenge-target reference.
 *  - Whether a term was genuinely "agreed" — agreement is fixed as a fixture
 *    input and only the structure that follows it (immediate recording, delay
 *    flag) is closed here; agreement-detection recall/precision in a real
 *    conversation is not closed by this criterion.
 */
import { describe, expect, test } from "bun:test";
import {
  b4ChallengeOutputSchema,
  boundaryScenarioSchema,
  gateB4ChallengeOutput,
} from "../src/interview/challenge/boundary-scenario";
import {
  glossaryRecordSchema,
  judgeGlossaryRecordImmediacy,
  recordAgreedTermImmediately,
} from "../src/interview/glossary/immediate-record";

const withoutField = (record: Record<string, unknown>, field: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== field));

// --- Clause 1 fixtures ------------------------------------------------------
// A B4 challenge that is fixed as HAVING FIRED; firing and citation structure
// are the parent ac-34's business and are not re-graded here.
const challengedAnswerTurnId = "turn-7";
const challengedTerm = "취소 가능 기간";

// Boundary scenario targeting the original answer turn.
const answerTurnScenario = {
  target_kind: "answer_turn",
  target_ref: challengedAnswerTurnId,
  scenario: "구매 후 정확히 24시간이 지난 그 순간에 도착한 취소 요청은 승인되는가?",
};

// Boundary scenario targeting the challenged term instead.
const termScenario = {
  target_kind: "term",
  target_ref: challengedTerm,
  scenario: "결제가 두 번으로 분할된 주문에서 취소 가능 기간은 어느 결제부터 세는가?",
};

const b4Challenge = {
  challenge_id: "chal-1",
  answer_turn_id: challengedAnswerTurnId,
  challenged_term: challengedTerm,
  boundary_scenario: answerTurnScenario,
};

const b4ChallengeTargetingTerm = { ...b4Challenge, boundary_scenario: termScenario };

// A SECOND, independent B4 challenge with a different answer turn and a
// different challenged term. It exists so that "references the challenge
// target" cannot be satisfied by comparing against the first fixture's
// constants: the same scenario object is approvable under one challenge and
// must be rejected under the other.
const secondChallengedAnswerTurnId = "turn-8";
const secondChallengedTerm = "환불 처리 기간";

const secondAnswerTurnScenario = {
  target_kind: "answer_turn",
  target_ref: secondChallengedAnswerTurnId,
  scenario: "환불 처리 기간의 마지막 영업일이 공휴일과 겹치면 그 날 접수된 환불은 기간 안인가?",
};

const secondTermScenario = {
  target_kind: "term",
  target_ref: secondChallengedTerm,
  scenario: "부분 환불이 두 번 일어난 주문에서 환불 처리 기간은 각 건마다 새로 시작되는가?",
};

const secondB4Challenge = {
  challenge_id: "chal-2",
  answer_turn_id: secondChallengedAnswerTurnId,
  challenged_term: secondChallengedTerm,
  boundary_scenario: secondAnswerTurnScenario,
};

const secondB4ChallengeTargetingTerm = {
  ...secondB4Challenge,
  boundary_scenario: secondTermScenario,
};

// Negative fixture: the scenario points at a turn that is not the challenge's
// own target, so it references nothing the challenge is about.
const unrelatedTargetScenario = { ...answerTurnScenario, target_ref: "turn-99" };

describe("ac-G2 clause 1 — a B4 challenge output must carry a non-empty boundary scenario referencing its target", () => {
  test("fixture integrity: the scenario is non-empty and its reference is the challenge's own target", () => {
    expect(answerTurnScenario.scenario.length).toBeGreaterThan(0);
    expect(answerTurnScenario.target_ref).toBe(b4Challenge.answer_turn_id);
    expect(termScenario.target_ref).toBe(b4Challenge.challenged_term);
  });

  test("fixture integrity: the two challenges share no target, so cross-references are genuinely wrong", () => {
    expect(secondB4Challenge.answer_turn_id).not.toBe(b4Challenge.answer_turn_id);
    expect(secondB4Challenge.challenged_term).not.toBe(b4Challenge.challenged_term);
    expect(secondAnswerTurnScenario.scenario.length).toBeGreaterThan(0);
    expect(secondAnswerTurnScenario.target_ref).toBe(secondB4Challenge.answer_turn_id);
    expect(secondTermScenario.target_ref).toBe(secondB4Challenge.challenged_term);
  });

  test("a boundary scenario with a non-empty body and a target reference parses", () => {
    expect(boundaryScenarioSchema.safeParse(answerTurnScenario).success).toBe(true);
    expect(boundaryScenarioSchema.safeParse(termScenario).success).toBe(true);
  });

  test("an empty scenario body is refused (.min(1))", () => {
    expect(boundaryScenarioSchema.safeParse({ ...answerTurnScenario, scenario: "" }).success).toBe(
      false,
    );
  });

  test("a missing scenario body is refused", () => {
    expect(
      boundaryScenarioSchema.safeParse(withoutField(answerTurnScenario, "scenario")).success,
    ).toBe(false);
  });

  test("an empty or missing target reference is refused", () => {
    expect(
      boundaryScenarioSchema.safeParse({ ...answerTurnScenario, target_ref: "" }).success,
    ).toBe(false);
    expect(
      boundaryScenarioSchema.safeParse(withoutField(answerTurnScenario, "target_ref")).success,
    ).toBe(false);
  });

  test("an unknown target kind is refused (enum: answer turn or challenged term)", () => {
    expect(
      boundaryScenarioSchema.safeParse({ ...answerTurnScenario, target_kind: "vibes" }).success,
    ).toBe(false);
  });

  test("a B4 challenge output carrying the boundary scenario parses and is approved by the gate", () => {
    expect(b4ChallengeOutputSchema.safeParse(b4Challenge).success).toBe(true);
    expect(gateB4ChallengeOutput(b4Challenge).approved).toBe(true);
    expect(b4ChallengeOutputSchema.safeParse(b4ChallengeTargetingTerm).success).toBe(true);
    expect(gateB4ChallengeOutput(b4ChallengeTargetingTerm).approved).toBe(true);
  });

  test("the approved output preserves the invented scenario body verbatim", () => {
    const parsed = b4ChallengeOutputSchema.parse(b4Challenge);
    expect(parsed.boundary_scenario.scenario).toBe(
      "구매 후 정확히 24시간이 지난 그 순간에 도착한 취소 요청은 승인되는가?",
    );
  });

  test("a B4 challenge output without a boundary scenario is refused by the schema (negative fixture)", () => {
    expect(
      b4ChallengeOutputSchema.safeParse(withoutField(b4Challenge, "boundary_scenario")).success,
    ).toBe(false);
  });

  test("a B4 challenge output without a boundary scenario is rejected by the approval gate (negative fixture)", () => {
    expect(gateB4ChallengeOutput(withoutField(b4Challenge, "boundary_scenario")).approved).toBe(
      false,
    );
  });

  test("a B4 challenge output whose scenario body is empty is rejected by the gate", () => {
    expect(
      gateB4ChallengeOutput({
        ...b4Challenge,
        boundary_scenario: { ...answerTurnScenario, scenario: "" },
      }).approved,
    ).toBe(false);
  });

  test("a scenario referencing something other than the challenge target is rejected by the gate", () => {
    // The scenario itself is well-formed; only the reference is wrong.
    expect(boundaryScenarioSchema.safeParse(unrelatedTargetScenario).success).toBe(true);
    expect(
      gateB4ChallengeOutput({ ...b4Challenge, boundary_scenario: unrelatedTargetScenario })
        .approved,
    ).toBe(false);
  });

  test("a second challenge with different targets is approved on its own answer turn and its own term", () => {
    expect(b4ChallengeOutputSchema.safeParse(secondB4Challenge).success).toBe(true);
    expect(gateB4ChallengeOutput(secondB4Challenge).approved).toBe(true);
    expect(b4ChallengeOutputSchema.safeParse(secondB4ChallengeTargetingTerm).success).toBe(true);
    expect(gateB4ChallengeOutput(secondB4ChallengeTargetingTerm).approved).toBe(true);
  });

  test("the first challenge's scenario is rejected under the second challenge (cross-target, turn)", () => {
    // Well-formed, and approvable under its OWN challenge — but it points at
    // turn-7, which is not this challenge's answer turn.
    expect(boundaryScenarioSchema.safeParse(answerTurnScenario).success).toBe(true);
    expect(gateB4ChallengeOutput(b4Challenge).approved).toBe(true);
    expect(
      gateB4ChallengeOutput({ ...secondB4Challenge, boundary_scenario: answerTurnScenario })
        .approved,
    ).toBe(false);
  });

  test("the first challenge's term scenario is rejected under the second challenge (cross-target, term)", () => {
    expect(
      gateB4ChallengeOutput({ ...secondB4Challenge, boundary_scenario: termScenario }).approved,
    ).toBe(false);
  });

  test("the second challenge's scenarios are rejected under the first challenge (cross-target, both kinds)", () => {
    expect(
      gateB4ChallengeOutput({ ...b4Challenge, boundary_scenario: secondAnswerTurnScenario })
        .approved,
    ).toBe(false);
    expect(
      gateB4ChallengeOutput({ ...b4Challenge, boundary_scenario: secondTermScenario }).approved,
    ).toBe(false);
  });

  test("a challenge output carrying no target of its own cannot approve any scenario (fail-closed)", () => {
    const targetless = withoutField(withoutField(b4Challenge, "answer_turn_id"), "challenged_term");
    expect(b4ChallengeOutputSchema.safeParse(targetless).success).toBe(false);
    expect(gateB4ChallengeOutput(targetless).approved).toBe(false);
  });
});

// --- Clause 2 & 3 fixtures --------------------------------------------------
// A term fixed BY FIXTURE as agreed at a specific turn. Whether it was really
// agreed is residual; only what must follow the agreement is graded.
const agreementTurnId = "turn-11";
const delayedRecordingTurnId = "turn-14";

// ac-21's five-field glossary entry structure, consumed as-is.
const agreedEntry = {
  concept: "cancellation window",
  korean: "취소 가능 기간",
  positive_examples: ["취소 가능 기간은 구매 시각부터 24시간이다."],
  negative_examples: ["캔슬 윈도우는 구매 시각부터 24시간이다."],
  avoid: ["캔슬 윈도우", "취소 윈도우"],
};

describe("ac-G2 clause 2 — an agreed term is recorded into the glossary on the spot", () => {
  test("the record's recorded_at turn equals the agreement turn (immediacy predicate)", () => {
    const record = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: agreedEntry,
    });
    expect(record.recorded_at_turn_id).toBe(agreementTurnId);
    expect(record.agreement_turn_id).toBe(agreementTurnId);
  });

  test("the recording turn tracks the agreement turn, not a constant", () => {
    const record = recordAgreedTermImmediately({
      agreement_turn_id: "turn-23",
      entry: agreedEntry,
    });
    expect(record.recorded_at_turn_id).toBe("turn-23");
    expect(record.agreement_turn_id).toBe("turn-23");
  });

  test("the agreed five-field entry is carried into the record verbatim", () => {
    const record = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: agreedEntry,
    });
    expect(record.entry).toEqual(agreedEntry);
    expect(record.entry.korean).toBe("취소 가능 기간");
    expect(record.entry.avoid).toEqual(["캔슬 윈도우", "취소 윈도우"]);
  });

  test("the produced record parses against the glossary record schema", () => {
    const record = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: agreedEntry,
    });
    expect(glossaryRecordSchema.safeParse(record).success).toBe(true);
  });

  test("the record schema consumes ac-21's entry structure — an entry missing a field is refused", () => {
    const record = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: agreedEntry,
    });
    for (const field of ["concept", "korean", "positive_examples", "negative_examples", "avoid"]) {
      expect(
        glossaryRecordSchema.safeParse({ ...record, entry: withoutField(agreedEntry, field) })
          .success,
      ).toBe(false);
    }
  });

  test("a record missing its turn references is refused", () => {
    const record = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: agreedEntry,
    });
    expect(
      glossaryRecordSchema.safeParse(withoutField(record, "recorded_at_turn_id")).success,
    ).toBe(false);
    expect(glossaryRecordSchema.safeParse(withoutField(record, "agreement_turn_id")).success).toBe(
      false,
    );
  });

  test("the immediately recorded record is judged immediate", () => {
    const record = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: agreedEntry,
    });
    expect(judgeGlossaryRecordImmediacy(record).immediate).toBe(true);
  });
});

describe("ac-G2 clause 3 — a delayed recording produces a delay flag, an immediate one does not", () => {
  const immediateRecord = {
    agreement_turn_id: agreementTurnId,
    recorded_at_turn_id: agreementTurnId,
    entry: agreedEntry,
  };
  const delayedRecord = {
    agreement_turn_id: agreementTurnId,
    recorded_at_turn_id: delayedRecordingTurnId,
    entry: agreedEntry,
  };

  test("fixture integrity: the delayed fixture's recording turn really differs from the agreement turn", () => {
    expect(delayedRecord.recorded_at_turn_id).not.toBe(delayedRecord.agreement_turn_id);
    expect(immediateRecord.recorded_at_turn_id).toBe(immediateRecord.agreement_turn_id);
  });

  test("a delayed recording is judged not immediate and yields a delay flag", () => {
    const verdict = judgeGlossaryRecordImmediacy(delayedRecord);
    expect(verdict.immediate).toBe(false);
    expect(verdict.delay_flag).not.toBeNull();
  });

  test("the delay flag references both the agreement turn and the delayed recording turn", () => {
    const verdict = judgeGlossaryRecordImmediacy(delayedRecord);
    expect(verdict.delay_flag).toMatchObject({
      agreement_turn_id: "turn-11",
      recorded_at_turn_id: "turn-14",
    });
  });

  test("the delay flag tracks the turns it was given, not constants", () => {
    const verdict = judgeGlossaryRecordImmediacy({
      agreement_turn_id: "turn-3",
      recorded_at_turn_id: "turn-31",
      entry: agreedEntry,
    });
    expect(verdict.immediate).toBe(false);
    expect(verdict.delay_flag).toMatchObject({
      agreement_turn_id: "turn-3",
      recorded_at_turn_id: "turn-31",
    });
  });

  test("no delay flag is produced for the immediately recorded fixture", () => {
    const verdict = judgeGlossaryRecordImmediacy(immediateRecord);
    expect(verdict.immediate).toBe(true);
    expect(verdict.delay_flag).toBeNull();
  });
});

describe("ac-G2 clause 4 — the boundary-scenario gate and the immediacy judgment are pure functions", () => {
  // Each call gets a FRESHLY built, structurally equal input so that reference
  // memoization cannot masquerade as determinism.
  const freshApprovableChallenge = () => ({
    challenge_id: "chal-1",
    answer_turn_id: "turn-7",
    challenged_term: "취소 가능 기간",
    boundary_scenario: {
      target_kind: "answer_turn",
      target_ref: "turn-7",
      scenario: "구매 후 정확히 24시간이 지난 그 순간에 도착한 취소 요청은 승인되는가?",
    },
  });

  const freshCrossTargetChallenge = () => ({
    ...freshApprovableChallenge(),
    answer_turn_id: "turn-8",
    challenged_term: "환불 처리 기간",
  });

  const freshRecordInput = (recordedAt: string) => ({
    agreement_turn_id: "turn-11",
    recorded_at_turn_id: recordedAt,
    entry: {
      concept: "cancellation window",
      korean: "취소 가능 기간",
      positive_examples: ["취소 가능 기간은 구매 시각부터 24시간이다."],
      negative_examples: ["캔슬 윈도우는 구매 시각부터 24시간이다."],
      avoid: ["캔슬 윈도우", "취소 윈도우"],
    },
  });

  test("distinct but structurally identical approvable challenge inputs yield identical gate output", () => {
    const first = gateB4ChallengeOutput(freshApprovableChallenge());
    const second = gateB4ChallengeOutput(freshApprovableChallenge());
    expect(first.approved).toBe(true);
    expect(second).toEqual(first);
  });

  test("distinct but structurally identical rejectable challenge inputs yield identical gate output", () => {
    const first = gateB4ChallengeOutput(
      withoutField(freshApprovableChallenge(), "boundary_scenario"),
    );
    const second = gateB4ChallengeOutput(
      withoutField(freshApprovableChallenge(), "boundary_scenario"),
    );
    expect(first.approved).toBe(false);
    expect(second).toEqual(first);
  });

  test("the cross-target rejection is stable across distinct but identical inputs", () => {
    const first = gateB4ChallengeOutput(freshCrossTargetChallenge());
    const second = gateB4ChallengeOutput(freshCrossTargetChallenge());
    expect(first.approved).toBe(false);
    expect(second).toEqual(first);
  });

  test("distinct but structurally identical immediate-record inputs yield identical records", () => {
    const first = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: { ...agreedEntry },
    });
    const second = recordAgreedTermImmediately({
      agreement_turn_id: agreementTurnId,
      entry: { ...agreedEntry },
    });
    expect(first.recorded_at_turn_id).toBe(agreementTurnId);
    expect(second).toEqual(first);
  });

  test("the immediacy judgment is deterministic on both the immediate and the delayed side", () => {
    const delayedFirst = judgeGlossaryRecordImmediacy(freshRecordInput(delayedRecordingTurnId));
    const delayedSecond = judgeGlossaryRecordImmediacy(freshRecordInput(delayedRecordingTurnId));
    expect(delayedFirst.immediate).toBe(false);
    expect(delayedSecond).toEqual(delayedFirst);

    const immediateFirst = judgeGlossaryRecordImmediacy(freshRecordInput(agreementTurnId));
    const immediateSecond = judgeGlossaryRecordImmediacy(freshRecordInput(agreementTurnId));
    expect(immediateFirst.immediate).toBe(true);
    expect(immediateSecond).toEqual(immediateFirst);
  });
});
