/**
 * Acceptance test for ac-1 — round 0 derives and stores the goal_state schema
 * (including synthesis-ownership separation, FIX 1 carve-out applied).
 *
 * Frozen red: the modules under src/interview/ do not exist yet. Slice 3 must
 * implement them so this file turns green; these assertions are the completion
 * definition of ac-1.
 *
 * Oracle clauses covered (gate-a/rows/ac-1.json oracle_statement):
 *  (1) a fired question turn is rejected by recordTurn while no goal_state is
 *      stored (round-0 precedence gate, fail-closed), the input state is never
 *      mutated, and the rejection reason names the ABSENCE of goal_state — it
 *      must be distinguishable from the clause-2 ordering rejection;
 *  (2) goal_state.derived_at must strictly precede the first fired question's
 *      asked_at (equal or earlier asked_at is rejected), with a rejection
 *      reason that names derived_at/asked_at and is NOT the clause-1 reason;
 *  (3) a goal_state with an empty predicates[].verification_means is refused
 *      at parse time (zod .min(1)) at any position in the array, and a confirm
 *      attempt on a predicate without a verification means fails;
 *  (4) a restatement whose token overlap with the source request EXCEEDS
 *      ECHO_OVERLAP_THRESHOLD is rejected as an echo. The overlap metric this
 *      test pins down is
 *          overlap = |distinct whitespace tokens shared with the source|
 *                    / |distinct whitespace tokens of the source|
 *      and the threshold is 0.6, compared strictly (an overlap exactly equal
 *      to the threshold is accepted). Fixtures straddle the threshold at
 *      5/7 (reject) and 4/7 (accept) plus an exact 3/5 = 0.6 boundary case, so
 *      no implementation can pass without tokenizing and computing a ratio;
 *  (5) a round-0 derivation interaction must contain EXACTLY ONE fired turn
 *      (firedTurnCount === 1 — zero or two fired turns are rejected and the
 *      counted value is reported), re-running the initial derivation as a
 *      fresh interaction is rejected, and a revision interaction is carved out
 *      ONLY when it names a non-empty revises_goal_predicate (FIX 1 —
 *      initial-derivation rejection fixture plus revision-pass fixture; a
 *      revision missing that field is rejected);
 *  (6) the synthesis brief carries source_request verbatim plus confirmation
 *      records ONLY — the questions[] list and the full interview turn log are
 *      fed in as contamination sources and must be dropped: the brief's key
 *      set is exactly {source_request, confirmations, synthesis_provenance}
 *      and no question text survives anywhere in it — and its
 *      synthesis_provenance.author_context !== 'driver' (building with
 *      author_context 'driver' is refused).
 *
 * Residual clauses NOT tested here (per gate-a/rows/ac-1.json residual):
 *  - Paraphrase quality of the restatement ("different words + a concrete
 *    example") — the token-overlap threshold is only a structural
 *    approximation; whether a sub-threshold restatement is a genuine
 *    paraphrase is human judgment.
 *  - Whether the derived goal_state content actually matches the user's
 *    intent (goal-content alignment) — that needs the real user's
 *    confirmation; only the echo threshold and provenance structure are
 *    enforced here.
 *  - Whether synthesis was actually performed in a fresh, non-driver context
 *    — synthesis_provenance.author_context !== 'driver' is a field-value
 *    check and cannot close that question (same-prior residual, kin to ac-9).
 */
import { describe, expect, test } from "bun:test";
import { confirmPredicate, parseGoalState } from "../src/interview/goal-state";
import { recordTurn } from "../src/interview/record-turn";
import { ECHO_OVERLAP_THRESHOLD, checkRestatement } from "../src/interview/restatement-echo";
import { recordDerivationInteraction } from "../src/interview/round0-derivation";
import { buildSynthesisBrief } from "../src/interview/synthesis-brief";

const SOURCE_REQUEST = "받은 편지함에서 90일 지난 메일을 보관함으로 옮겨줘";

const VALID_PREDICATE = {
  id: "p-1",
  statement: "받은 편지함에 90일 지난 메일이 한 통도 남아 있지 않다",
  verification_means: "보관 이동 뒤 받은 편지함을 재조회해 90일 초과 메일이 0건임을 확인",
  confirmed: false,
};

const VALID_GOAL_STATE_RAW = {
  derived_at: "2026-07-25T09:00:00.000Z",
  predicates: [VALID_PREDICATE],
};

describe("ac-1 clause 1 — round-0 precedence gate in recordTurn", () => {
  const firedTurn = {
    kind: "fired_question" as const,
    question_text: "보관함 위치는 어디로 할까요?",
    asked_at: "2026-07-25T09:05:00.000Z",
  };

  test("rejects a fired question turn while no goal_state is stored (fail-closed)", () => {
    const state = { goal_state: null, turns: [] };
    const result = recordTurn(state, firedTurn);
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected the fired turn to be rejected");
    expect(result.reason).toContain("goal_state");
    expect(result.reason).toContain("부재");
    // The absence gate and the clause-2 ordering gate are different clauses:
    // a single constant reason string must not satisfy both.
    expect(result.reason).not.toContain("derived_at");
    // fail-closed also means the rejected turn is not appended anywhere.
    expect(state.turns).toHaveLength(0);
  });

  test("accepts a fired question turn once goal_state is stored, preserving the turn verbatim", () => {
    const goalState = parseGoalState(VALID_GOAL_STATE_RAW);
    const state = { goal_state: goalState, turns: [] };
    const result = recordTurn(state, firedTurn);
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected the fired turn to be accepted");
    expect(result.state.turns).toHaveLength(1);
    expect(result.state.turns[0]).toEqual(firedTurn);
    // recordTurn returns a new state instead of mutating the given one.
    expect(state.turns).toHaveLength(0);
  });

  test("a non-fired turn is recordable without goal_state — the gate targets fired turns only", () => {
    const reply = {
      kind: "user_reply" as const,
      content: "네, 그 요청 맞아요",
      at: "2026-07-25T08:58:00.000Z",
    };
    const result = recordTurn({ goal_state: null, turns: [] }, reply);
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected the non-fired turn to be accepted");
    expect(result.state.turns).toEqual([reply]);
  });
});

describe("ac-1 clause 2 — goal_state.derived_at strictly precedes the first fired asked_at", () => {
  const goalState = parseGoalState(VALID_GOAL_STATE_RAW);

  test("rejects a fired turn whose asked_at equals derived_at (strict ordering)", () => {
    const result = recordTurn(
      { goal_state: goalState, turns: [] },
      {
        kind: "fired_question" as const,
        question_text: "몇 통이나 옮길까요?",
        asked_at: "2026-07-25T09:00:00.000Z",
      },
    );
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected equal timestamps to be rejected");
    expect(result.reason).toContain("derived_at");
    expect(result.reason).toContain("asked_at");
    expect(result.reason).not.toContain("부재");
  });

  test("rejects a fired turn whose asked_at precedes derived_at", () => {
    const result = recordTurn(
      { goal_state: goalState, turns: [] },
      {
        kind: "fired_question" as const,
        question_text: "몇 통이나 옮길까요?",
        asked_at: "2026-07-25T08:59:00.000Z",
      },
    );
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected an earlier asked_at to be rejected");
    expect(result.reason).toContain("derived_at");
    expect(result.reason).toContain("asked_at");
    expect(result.reason).not.toContain("부재");
  });

  test("the ordering check applies to the fired turn even when non-fired turns precede it", () => {
    const result = recordTurn(
      {
        goal_state: goalState,
        turns: [
          {
            kind: "user_reply" as const,
            content: "네, 그 요청 맞아요",
            at: "2026-07-25T09:01:00.000Z",
          },
        ],
      },
      {
        kind: "fired_question" as const,
        question_text: "몇 통이나 옮길까요?",
        asked_at: "2026-07-25T08:59:00.000Z",
      },
    );
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected the out-of-order fired turn to be rejected");
    expect(result.reason).toContain("derived_at");
  });

  test("the absence reason and the ordering reason are two distinct strings", () => {
    const absence = recordTurn(
      { goal_state: null, turns: [] },
      {
        kind: "fired_question" as const,
        question_text: "몇 통이나 옮길까요?",
        asked_at: "2026-07-25T09:05:00.000Z",
      },
    );
    const ordering = recordTurn(
      { goal_state: goalState, turns: [] },
      {
        kind: "fired_question" as const,
        question_text: "몇 통이나 옮길까요?",
        asked_at: "2026-07-25T09:00:00.000Z",
      },
    );
    if (absence.accepted) throw new Error("expected the absence case to be rejected");
    if (ordering.accepted) throw new Error("expected the ordering case to be rejected");
    expect(absence.reason).not.toBe(ordering.reason);
  });
});

describe("ac-1 clause 3 — verification_means zod .min(1) and confirm fail-closed", () => {
  test("parses a goal_state whose every predicate carries a verification means", () => {
    const parsed = parseGoalState(VALID_GOAL_STATE_RAW);
    expect(parsed.derived_at).toBe("2026-07-25T09:00:00.000Z");
    expect(parsed.predicates).toHaveLength(1);
    expect(parsed.predicates[0]?.verification_means).toBe(VALID_PREDICATE.verification_means);
  });

  test("refuses to parse a goal_state containing a predicate with empty verification_means", () => {
    const raw = {
      ...VALID_GOAL_STATE_RAW,
      predicates: [{ ...VALID_PREDICATE, verification_means: "" }],
    };
    expect(() => parseGoalState(raw)).toThrow();
  });

  test("the empty verification_means refusal applies to every element, not just the first", () => {
    const raw = {
      ...VALID_GOAL_STATE_RAW,
      predicates: [VALID_PREDICATE, { ...VALID_PREDICATE, id: "p-2", verification_means: "" }],
    };
    expect(() => parseGoalState(raw)).toThrow();
  });

  test("a confirm attempt on a predicate without a verification means fails", () => {
    const result = confirmPredicate({ ...VALID_PREDICATE, verification_means: "" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the confirm attempt to fail");
    expect(result.reason).toContain("검증수단");
  });

  test("a confirm attempt on a predicate with a verification means succeeds", () => {
    const result = confirmPredicate(VALID_PREDICATE);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected the confirm attempt to succeed");
    expect(result.predicate.confirmed).toBe(true);
    expect(result.predicate.id).toBe("p-1");
    expect(result.predicate.verification_means).toBe(VALID_PREDICATE.verification_means);
  });
});

describe("ac-1 clause 4 — restatement token-overlap echo rejection", () => {
  // SOURCE_REQUEST has 7 distinct whitespace tokens:
  // 받은 / 편지함에서 / 90일 / 지난 / 메일을 / 보관함으로 / 옮겨줘
  test("the echo threshold is an exposed ratio strictly between 0 and 1", () => {
    expect(ECHO_OVERLAP_THRESHOLD).toBe(0.6);
  });

  test("rejects a restatement identical to the source request as an echo (overlap 1)", () => {
    const result = checkRestatement(SOURCE_REQUEST, SOURCE_REQUEST);
    expect(result.overlap).toBe(1);
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected the identical restatement to be rejected");
    expect(result.reason).toContain("에코");
    expect(result.reason).toContain("임계");
  });

  test("rejects a near-verbatim restatement just above the threshold (5 of 7 tokens reused)", () => {
    // 받은 / 편지함에서 / 90일 / 지난 / 메일을 are reused verbatim; only the
    // tail is reworded. overlap = 5/7 ≈ 0.714 > 0.6.
    const nearEcho = "받은 편지함에서 90일 지난 메일을 아카이브로 이동";
    const result = checkRestatement(SOURCE_REQUEST, nearEcho);
    expect(result.overlap).toBeCloseTo(5 / 7, 10);
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected the near-verbatim restatement to be rejected");
    expect(result.reason).toContain("에코");
  });

  test("accepts a restatement just below the threshold (4 of 7 tokens reused)", () => {
    // 받은 / 편지함에서 / 90일 / 지난 are reused. overlap = 4/7 ≈ 0.571 < 0.6.
    const belowThreshold = "받은 편지함에서 90일 지난 메시지를 아카이브 폴더로 치우자";
    const result = checkRestatement(SOURCE_REQUEST, belowThreshold);
    expect(result.overlap).toBeCloseTo(4 / 7, 10);
    expect(result.accepted).toBe(true);
  });

  test("an overlap exactly equal to the threshold is accepted — only exceeding it is an echo", () => {
    // 5 distinct source tokens, 3 reused: overlap = 3/5 = 0.6 === threshold.
    const boundarySource = "오래된 메일을 보관함으로 옮겨 줘";
    const boundaryRestatement = "오래된 메일을 보관함으로 치우는 일";
    const result = checkRestatement(boundarySource, boundaryRestatement);
    expect(result.overlap).toBeCloseTo(0.6, 10);
    expect(result.accepted).toBe(true);
  });

  test("one more reused token past that boundary flips the same source to rejected", () => {
    // 4 of the same 5 source tokens reused: overlap = 4/5 = 0.8 > 0.6.
    const boundarySource = "오래된 메일을 보관함으로 옮겨 줘";
    const echoed = "오래된 메일을 보관함으로 옮겨 두는 일";
    const result = checkRestatement(boundarySource, echoed);
    expect(result.overlap).toBeCloseTo(0.8, 10);
    expect(result.accepted).toBe(false);
    if (result.accepted)
      throw new Error("expected the boundary-crossing restatement to be rejected");
    expect(result.reason).toContain("에코");
  });

  test("accepts a fully reworded restatement whose token overlap is zero", () => {
    const paraphrase = "수신함에 쌓인 석 달 넘은 메시지를 별도 보관 공간으로 이동해 달라는 요청";
    const result = checkRestatement(SOURCE_REQUEST, paraphrase);
    expect(result.overlap).toBe(0);
    expect(result.accepted).toBe(true);
  });
});

describe("ac-1 clause 5 — initial derivation is one interaction; revision path is carved out", () => {
  const firedTurn = {
    kind: "fired_question" as const,
    question_text: "성공 판정은 무엇으로 하면 될까요?",
    asked_at: "2026-07-25T09:05:00.000Z",
  };
  const secondFiredTurn = {
    kind: "fired_question" as const,
    question_text: "보관함 위치는 어디로 할까요?",
    asked_at: "2026-07-25T09:07:00.000Z",
  };
  const replyTurn = {
    kind: "user_reply" as const,
    content: "받은 편지함에 90일 초과 메일이 0건이면 돼요",
    at: "2026-07-25T09:06:00.000Z",
  };
  const singleInteractionTurns = [firedTurn, replyTurn];

  test("the initial derivation with exactly one fired turn is accepted (firedTurnCount === 1)", () => {
    const result = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected the initial derivation to be accepted");
    expect(result.record.kind).toBe("initial");
    expect(result.record.firedTurnCount).toBe(1);
  });

  test("a derivation interaction carrying two fired turns is rejected and reports the count 2", () => {
    const result = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: [firedTurn, replyTurn, secondFiredTurn],
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected a two-fired-turn derivation to be rejected");
    expect(result.firedTurnCount).toBe(2);
    expect(result.reason).toContain("단일 상호작용");
    expect(result.reason).not.toContain("반복");
  });

  test("a derivation interaction carrying no fired turn is rejected and reports the count 0", () => {
    const result = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: [replyTurn],
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected a zero-fired-turn derivation to be rejected");
    expect(result.firedTurnCount).toBe(0);
    expect(result.reason).toContain("단일 상호작용");
  });

  test("re-running the initial derivation as a repeated fresh interaction is rejected", () => {
    const first = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    if (!first.accepted) throw new Error("expected the first initial derivation to be accepted");
    const second = recordDerivationInteraction(first.record, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    expect(second.accepted).toBe(false);
    if (second.accepted) throw new Error("expected the repeated initial derivation to be rejected");
    expect(second.reason).toContain("초기 도출");
    expect(second.reason).toContain("반복");
    expect(second.reason).not.toContain("revises_goal_predicate");
  });

  test("a revision interaction naming revises_goal_predicate passes the carve-out (ac-3 path)", () => {
    const first = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    if (!first.accepted) throw new Error("expected the first initial derivation to be accepted");
    const revision = recordDerivationInteraction(first.record, {
      kind: "revision" as const,
      revises_goal_predicate: "p-1",
      turns: singleInteractionTurns,
    });
    expect(revision.accepted).toBe(true);
    if (!revision.accepted) throw new Error("expected the revision interaction to be accepted");
    expect(revision.record.kind).toBe("revision");
    expect(revision.record.firedTurnCount).toBe(1);
    // the carve-out reads the field, so the accepted record carries its value.
    expect(revision.record.revises_goal_predicate).toBe("p-1");
  });

  test("a revision interaction without revises_goal_predicate is rejected (the field is the carve-out)", () => {
    const first = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    if (!first.accepted) throw new Error("expected the first initial derivation to be accepted");
    const revision = recordDerivationInteraction(first.record, {
      kind: "revision" as const,
      turns: singleInteractionTurns,
    });
    expect(revision.accepted).toBe(false);
    if (revision.accepted) throw new Error("expected the untargeted revision to be rejected");
    expect(revision.reason).toContain("revises_goal_predicate");
    expect(revision.reason).not.toContain("초기 도출");
  });

  test("a revision interaction whose revises_goal_predicate is an empty string is rejected", () => {
    const first = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    if (!first.accepted) throw new Error("expected the first initial derivation to be accepted");
    const revision = recordDerivationInteraction(first.record, {
      kind: "revision" as const,
      revises_goal_predicate: "",
      turns: singleInteractionTurns,
    });
    expect(revision.accepted).toBe(false);
    if (revision.accepted) throw new Error("expected the empty-target revision to be rejected");
    expect(revision.reason).toContain("revises_goal_predicate");
  });

  test("the three derivation rejection reasons are three distinct strings", () => {
    const first = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    if (!first.accepted) throw new Error("expected the first initial derivation to be accepted");
    const notSingle = recordDerivationInteraction(null, {
      kind: "initial" as const,
      turns: [firedTurn, secondFiredTurn],
    });
    const repeated = recordDerivationInteraction(first.record, {
      kind: "initial" as const,
      turns: singleInteractionTurns,
    });
    const untargeted = recordDerivationInteraction(first.record, {
      kind: "revision" as const,
      turns: singleInteractionTurns,
    });
    if (notSingle.accepted) throw new Error("expected the two-fired-turn case to be rejected");
    if (repeated.accepted) throw new Error("expected the repeated initial case to be rejected");
    if (untargeted.accepted) throw new Error("expected the untargeted revision to be rejected");
    const reasons = new Set([notSingle.reason, repeated.reason, untargeted.reason]);
    expect(reasons.size).toBe(3);
  });
});

describe("ac-1 clause 6 — synthesis brief carries verbatim source + confirmations only, non-driver", () => {
  const confirmations = [
    {
      predicate_id: "p-1",
      utterance: "네, 그 기준 맞아요",
      at: "2026-07-25T09:03:00.000Z",
    },
  ];
  // Contamination sources: the question list and the whole interview turn log
  // are handed to the builder so that dropping them is observable.
  const questions = ["보관함 위치는 어디로 할까요?", "성공 판정은 무엇으로 하면 될까요?"];
  const turns = [
    {
      kind: "fired_question" as const,
      question_text: "보관함 위치는 어디로 할까요?",
      asked_at: "2026-07-25T09:01:00.000Z",
    },
    {
      kind: "user_reply" as const,
      content: "기본 보관함이면 돼요",
      at: "2026-07-25T09:02:00.000Z",
    },
  ];
  const input = {
    source_request: SOURCE_REQUEST,
    questions,
    turns,
    confirmations,
    author_context: "fresh_synthesizer",
  };

  test("the brief carries source_request verbatim and the confirmation records", () => {
    const result = buildSynthesisBrief(input);
    expect(result.built).toBe(true);
    if (!result.built) throw new Error("expected the brief to be built");
    expect(result.brief.source_request).toBe(SOURCE_REQUEST);
    expect(result.brief.confirmations).toEqual(confirmations);
  });

  test("the brief's key set is exactly source_request + confirmations + synthesis_provenance", () => {
    const result = buildSynthesisBrief(input);
    if (!result.built) throw new Error("expected the brief to be built");
    expect(Object.keys(result.brief).sort()).toEqual([
      "confirmations",
      "source_request",
      "synthesis_provenance",
    ]);
    expect("questions" in result.brief).toBe(false);
    expect("turns" in result.brief).toBe(false);
  });

  test("no question text from the questions list or the turn log survives in the brief", () => {
    const result = buildSynthesisBrief(input);
    if (!result.built) throw new Error("expected the brief to be built");
    const serialized = JSON.stringify(result.brief);
    expect(serialized).not.toContain("보관함 위치는 어디로 할까요?");
    expect(serialized).not.toContain("성공 판정은 무엇으로 하면 될까요?");
    expect(serialized).not.toContain("기본 보관함이면 돼요");
    // the verbatim source request and the confirmation utterance do survive.
    expect(serialized).toContain(SOURCE_REQUEST);
    expect(serialized).toContain("네, 그 기준 맞아요");
  });

  test("the brief's synthesis_provenance.author_context is not 'driver'", () => {
    const result = buildSynthesisBrief(input);
    if (!result.built) throw new Error("expected the brief to be built");
    expect(result.brief.synthesis_provenance.author_context).toBe("fresh_synthesizer");
    expect(result.brief.synthesis_provenance.author_context).not.toBe("driver");
  });

  test("building a brief with author_context 'driver' is refused (fail-closed)", () => {
    const result = buildSynthesisBrief({ ...input, author_context: "driver" });
    expect(result.built).toBe(false);
    if (result.built) throw new Error("expected the driver-authored brief to be refused");
    expect(result.reason).toContain("driver");
  });
});
