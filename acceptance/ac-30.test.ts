/**
 * ac-30 acceptance — B1 teach-back contract: per-answer different-words +
 * example restatement (echo-threshold rejection), confirmation_kind
 * {paraphrase, verbatim} with the human-fixed verbatim class set
 * (수량 · 식별자 · 삭제범위), a candidate→confirmed state machine driven only by a
 * recorded user confirmation utterance, uncorrected-mismatch lock blocking
 * (fail-closed), and the intent_summary leakage scan absorbing leakage
 * defects into this surface.
 *
 * Frozen red: the modules under src/interview/teachback/ do not exist yet;
 * the piece-3 implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-30.json), covered clauses:
 *  (1) per-answer teach-back — every user answer turn needs a teach-back
 *      record carrying different-words + example fields; an answer without a
 *      record is refused confirmed progression; a restatement exceeding the
 *      token-overlap threshold against the answer's original text is
 *      deterministically rejected as echo (echo fixture rejected, non-echo
 *      fixture accepted).
 *  (2) confirmation_kind parses only as the two-value enum
 *      {paraphrase, verbatim} via zod; verbatim is allowed only on targets
 *      tagged with the human-fixed literal class set 수량 · 식별자 · 삭제범위,
 *      out-of-set targets are rejected; the class set is a frozen literal
 *      constant in code (no runtime/agent extension, exactly 3 classes).
 *  (3) candidate→confirmed state machine — records are created in candidate
 *      state and transition to confirmed only through a recorded user
 *      confirmation utterance; direct-confirmed forgeries and transitions
 *      without a user confirmation record are rejected.
 *  (4) uncorrected mismatch blocks lock — while a user-flagged mismatch
 *      remains uncorrected, lock attempts (finalize / intent write) are
 *      refused fail-closed (an absent correction field counts as
 *      uncorrected); after a correction record the gate clears.
 *  (5) intent_summary leakage scan — a settled item existing without a
 *      confirmed teach-back record pointer is deterministically detected as a
 *      violation (missing pointer, candidate-only pointer, dangling pointer);
 *      a fixture where every item is backed by a confirmed record passes.
 *
 * Residual (NOT tested here, per row residual):
 *  - Teach-back quality — whether the restatement is a genuine paraphrase
 *    and the example is apt is human judgment; the token-overlap threshold is
 *    only a structural approximation (declared residual by the contract).
 *  - Analogy-transfer efficacy — the 20%/12% teach-back mandate evidence is
 *    clinical-domain; transfer to software interviews stays unverified until
 *    the C4 harness (ac-40), declared residual by the contract.
 *  - Verbatim class labeling — WHICH targets belong to 수량/식별자/삭제범위 is
 *    LLM/human judgment; fixtures fix the class tags and only the
 *    allow/reject routing over those tags is asserted (tag emission → pure
 *    gate routing pattern).
 *  - Real-user mismatch flagging — whether a real user notices and flags a
 *    mismatch happens outside fixtures; only the post-flag
 *    uncorrected→lock-block structure is closed here.
 */
import { describe, expect, test } from "bun:test";
import {
  VERBATIM_CLASSES,
  checkVerbatimAllowed,
  confirmationKindSchema,
} from "../src/interview/teachback/confirmation-kind";
import { scanIntentSummaryLeakage } from "../src/interview/teachback/leakage-scan";
import { checkMismatchLockGate } from "../src/interview/teachback/mismatch-lock-gate";
import { checkAnswerCoverage, createTeachbackRecord } from "../src/interview/teachback/record";
import { confirmTeachback, validateTeachbackState } from "../src/interview/teachback/state-machine";

// --- fixtures ---------------------------------------------------------------

type CreateInput = {
  answer_turn_id: string;
  answer_text: string;
  restatement: string;
  example: string;
  confirmation_kind: "paraphrase" | "verbatim";
};

const ANSWER_TURN_ID = "turn-3";
const ANSWER_TEXT = "매일 자정에 로그 파일을 압축해서 보관 폴더로 옮겨 주세요";

// Different-words restatement plus a concrete example (the non-echo fixture).
// Whether this is a *good* paraphrase is residual; it only has to be lexically
// distinct from the answer so it stays under any sane echo threshold.
const PARAPHRASE_RESTATEMENT =
  "하루가 끝나는 시각이 되면 시스템이 그날 쌓인 기록 문서를 자동으로 묶어 장기 저장 위치로 이동시킨다는 뜻이군요";
const RESTATEMENT_EXAMPLE =
  "예: 7월 1일 밤 12시가 되면 그날의 access.log가 압축되어 archive 디렉터리로 이동합니다";

const BASE_CREATE_INPUT: CreateInput = {
  answer_turn_id: ANSWER_TURN_ID,
  answer_text: ANSWER_TEXT,
  restatement: PARAPHRASE_RESTATEMENT,
  example: RESTATEMENT_EXAMPLE,
  confirmation_kind: "paraphrase",
};

const USER_CONFIRMATION = {
  utterance_id: "utt-7",
  speaker: "user",
  text: "네, 그 이해가 맞아요",
} as const;

function mustCreate(input: CreateInput) {
  const result = createTeachbackRecord(input);
  if (!result.accepted) {
    throw new Error(`fixture setup failed: ${String(result.reason)}`);
  }
  return result.record;
}

function mustConfirm(record: ReturnType<typeof mustCreate>, utteranceId: string) {
  const result = confirmTeachback({
    record,
    confirmation: { ...USER_CONFIRMATION, utterance_id: utteranceId },
  });
  if (!result.accepted) {
    throw new Error(`fixture setup failed: ${String(result.reason)}`);
  }
  return result.record;
}

// --- clause 1 ----------------------------------------------------------------

describe("ac-30 clause 1 — per-answer teach-back: different-words + example fields, echo threshold", () => {
  test("non-echo fixture: a different-words restatement with an example is accepted and the record carries both fields verbatim", () => {
    const result = createTeachbackRecord(BASE_CREATE_INPUT);

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.answer_turn_id).toBe("turn-3");
    expect(result.record.restatement).toBe(PARAPHRASE_RESTATEMENT);
    expect(result.record.example).toBe(RESTATEMENT_EXAMPLE);
  });

  test("a teach-back missing the example or the restatement is rejected — the record must carry different-words AND example", () => {
    const noExample = createTeachbackRecord({ ...BASE_CREATE_INPUT, example: "" });
    expect(noExample.accepted).toBe(false);
    if (noExample.accepted) throw new Error("unreachable");
    expect(noExample.reason).toBe("missing_example");

    const noRestatement = createTeachbackRecord({ ...BASE_CREATE_INPUT, restatement: "" });
    expect(noRestatement.accepted).toBe(false);
    if (noRestatement.accepted) throw new Error("unreachable");
    expect(noRestatement.reason).toBe("missing_restatement");
  });

  test("echo fixture: a restatement identical to the answer original exceeds the token-overlap threshold and is deterministically rejected", () => {
    const echoInput = { ...BASE_CREATE_INPUT, restatement: ANSWER_TEXT };

    const first = createTeachbackRecord(echoInput);
    expect(first.accepted).toBe(false);
    if (first.accepted) throw new Error("unreachable");
    expect(first.reason).toBe("echo_threshold_exceeded");

    // deterministic: same input, same verdict
    expect(createTeachbackRecord(echoInput)).toEqual(first);
  });

  test("an answer turn without a teach-back record is refused confirmed progression; covered turns pass", () => {
    const record = mustCreate(BASE_CREATE_INPUT);

    const gapped = checkAnswerCoverage({
      answer_turn_ids: ["turn-3", "turn-4"],
      records: [record],
    });
    expect(gapped.passed).toBe(false);
    if (gapped.passed) throw new Error("unreachable");
    expect(gapped.missing_turn_ids).toEqual(["turn-4"]);

    const covered = checkAnswerCoverage({
      answer_turn_ids: ["turn-3"],
      records: [record],
    });
    expect(covered.passed).toBe(true);
  });
});

// --- clause 2 ----------------------------------------------------------------

describe("ac-30 clause 2 — confirmation_kind enum {paraphrase, verbatim} and the frozen verbatim class set", () => {
  test("the zod schema parses exactly the two enum values and rejects everything else", () => {
    expect(confirmationKindSchema.safeParse("paraphrase").success).toBe(true);
    expect(confirmationKindSchema.safeParse("verbatim").success).toBe(true);

    const rejected = confirmationKindSchema.safeParse("summary");
    expect(rejected.success).toBe(false);
    if (rejected.success) throw new Error("unreachable");
    expect(rejected.error.issues.length).toBeGreaterThan(0);

    expect(confirmationKindSchema.safeParse("PARAPHRASE").success).toBe(false);
    expect(confirmationKindSchema.safeParse("").success).toBe(false);
    expect(confirmationKindSchema.safeParse(1).success).toBe(false);
  });

  test("VERBATIM_CLASSES is the human-fixed literal set — exactly 수량, 식별자, 삭제범위 — frozen against runtime/agent extension", () => {
    expect([...VERBATIM_CLASSES].sort()).toEqual(["삭제범위", "수량", "식별자"]);
    expect(VERBATIM_CLASSES).toHaveLength(3);
    expect(Object.isFrozen(VERBATIM_CLASSES)).toBe(true);
    expect(() => {
      (VERBATIM_CLASSES as unknown as string[]).push("메모");
    }).toThrow();
    expect(VERBATIM_CLASSES).toHaveLength(3);
  });

  test("verbatim routes through the class set: in-set target classes allowed, out-of-set target rejected, paraphrase unaffected", () => {
    expect(
      checkVerbatimAllowed({ confirmation_kind: "verbatim", target_class: "수량" }).allowed,
    ).toBe(true);
    expect(
      checkVerbatimAllowed({ confirmation_kind: "verbatim", target_class: "식별자" }).allowed,
    ).toBe(true);
    expect(
      checkVerbatimAllowed({ confirmation_kind: "verbatim", target_class: "삭제범위" }).allowed,
    ).toBe(true);

    const rejected = checkVerbatimAllowed({
      confirmation_kind: "verbatim",
      target_class: "선호이유",
    });
    expect(rejected.allowed).toBe(false);
    if (rejected.allowed) throw new Error("unreachable");
    expect(rejected.reason).toBe("verbatim_target_outside_class_set");

    expect(
      checkVerbatimAllowed({ confirmation_kind: "paraphrase", target_class: "선호이유" }).allowed,
    ).toBe(true);
  });
});

// --- clause 3 ----------------------------------------------------------------

describe("ac-30 clause 3 — candidate→confirmed state machine gated on a recorded user confirmation utterance", () => {
  test("a newly created teach-back record starts in candidate state", () => {
    expect(mustCreate(BASE_CREATE_INPUT).status).toBe("candidate");
  });

  test("a candidate becomes confirmed only through a user confirmation utterance, and the confirmed record points to it", () => {
    const record = mustCreate(BASE_CREATE_INPUT);

    const result = confirmTeachback({ record, confirmation: USER_CONFIRMATION });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.status).toBe("confirmed");
    expect(result.record.confirmed_by_utterance_id).toBe("utt-7");
    expect(validateTeachbackState(result.record).valid).toBe(true);
  });

  test("transition without a user confirmation record is rejected", () => {
    const record = mustCreate(BASE_CREATE_INPUT);

    const result = confirmTeachback({ record });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("unreachable");
    expect(result.reason).toBe("missing_user_confirmation");
  });

  test("a confirmation utterance not spoken by the user cannot drive the transition", () => {
    const record = mustCreate(BASE_CREATE_INPUT);

    const result = confirmTeachback({
      record,
      confirmation: { utterance_id: "utt-8", speaker: "agent", text: "확인했습니다" },
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("unreachable");
    expect(result.reason).toBe("confirmation_not_from_user");
  });

  test("a record forged directly into confirmed state without a confirmation pointer is rejected by the state validator", () => {
    const forged = { ...mustCreate(BASE_CREATE_INPUT), status: "confirmed" };

    const verdict = validateTeachbackState(forged);
    expect(verdict.valid).toBe(false);
    if (verdict.valid) throw new Error("unreachable");
    expect(verdict.reason).toBe("confirmed_without_user_confirmation");
  });
});

// --- clause 4 ----------------------------------------------------------------

describe("ac-30 clause 4 — uncorrected user-flagged mismatch blocks lock fail-closed; a correction record clears the gate", () => {
  // fail-closed default: a flag with NO correction field at all is uncorrected
  const uncorrected = {
    record_id: "tb-1",
    mismatch_flags: [{ flagged_by_utterance_id: "utt-11" }],
  };
  const corrected = {
    record_id: "tb-1",
    mismatch_flags: [{ flagged_by_utterance_id: "utt-11", correction_utterance_id: "utt-12" }],
  };

  test("finalize and intent-write lock attempts are refused while an uncorrected mismatch remains", () => {
    const finalize = checkMismatchLockGate({ action: "finalize", records: [uncorrected] });
    expect(finalize.allowed).toBe(false);
    if (finalize.allowed) throw new Error("unreachable");
    expect(finalize.blocking_record_ids).toEqual(["tb-1"]);

    const intentWrite = checkMismatchLockGate({ action: "intent_write", records: [uncorrected] });
    expect(intentWrite.allowed).toBe(false);
    if (intentWrite.allowed) throw new Error("unreachable");
    expect(intentWrite.blocking_record_ids).toEqual(["tb-1"]);
  });

  test("after a correction record the gate clears for both lock actions", () => {
    expect(checkMismatchLockGate({ action: "finalize", records: [corrected] }).allowed).toBe(true);
    expect(checkMismatchLockGate({ action: "intent_write", records: [corrected] }).allowed).toBe(
      true,
    );
  });

  test("records without mismatch flags never block the lock", () => {
    const clean = { record_id: "tb-2", mismatch_flags: [] };

    expect(checkMismatchLockGate({ action: "finalize", records: [clean] }).allowed).toBe(true);
  });
});

// --- clause 5 ----------------------------------------------------------------

describe("ac-30 clause 5 — intent_summary leakage scan: every settled item needs a confirmed teach-back pointer", () => {
  test("leak fixture: a settled item without any teach-back pointer is deterministically detected", () => {
    const backed = mustConfirm(mustCreate(BASE_CREATE_INPUT), "utt-20");
    const leaky = {
      items: [
        {
          item_id: "item-goal",
          text: "로그는 매일 자정에 압축 보관한다",
          teachback_record_id: backed.record_id,
        },
        { item_id: "item-scope", text: "보관 대상은 access.log로 한정한다" },
      ],
    };

    const result = scanIntentSummaryLeakage({ intent_summary: leaky, records: [backed] });
    expect(result.passed).toBe(false);
    if (result.passed) throw new Error("unreachable");
    expect(result.violations.map((violation) => violation.item_id)).toEqual(["item-scope"]);

    // deterministic: same input, same scan verdict
    expect(scanIntentSummaryLeakage({ intent_summary: leaky, records: [backed] })).toEqual(result);
  });

  test("leak fixture: a pointer to a merely-candidate record or to a nonexistent record is not confirmed backing", () => {
    const candidate = mustCreate({ ...BASE_CREATE_INPUT, answer_turn_id: "turn-9" });
    const leaky = {
      items: [
        {
          item_id: "item-retention",
          text: "보관 주기는 90일이다",
          teachback_record_id: candidate.record_id,
        },
        { item_id: "item-owner", text: "보관 담당은 운영팀이다", teachback_record_id: "tb-ghost" },
      ],
    };

    const result = scanIntentSummaryLeakage({ intent_summary: leaky, records: [candidate] });
    expect(result.passed).toBe(false);
    if (result.passed) throw new Error("unreachable");
    expect(result.violations.map((violation) => violation.item_id).sort()).toEqual([
      "item-owner",
      "item-retention",
    ]);
  });

  test("clean fixture: when every settled item is backed by a confirmed record the scan passes", () => {
    const backed = mustConfirm(mustCreate(BASE_CREATE_INPUT), "utt-21");
    const clean = {
      items: [
        {
          item_id: "item-goal",
          text: "로그는 매일 자정에 압축 보관한다",
          teachback_record_id: backed.record_id,
        },
      ],
    };

    expect(scanIntentSummaryLeakage({ intent_summary: clean, records: [backed] }).passed).toBe(
      true,
    );
  });
});
