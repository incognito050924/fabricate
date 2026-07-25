/**
 * Acceptance test for ac-2 — only an explicit skip is recorded as delegation,
 * the delegating utterance is preserved verbatim, its interpretation is
 * reflected back to the user, and the goal stays autonomously governed even
 * under delegation.
 *
 * Frozen red: the modules under src/interview/ do not exist yet; the piece-3
 * implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-2.json (oracle_statement clauses 1-6):
 *  (1) an explicit-skip tagged utterance ("그냥 진행해") put into the turn
 *      record creates a delegation record with kind === 'explicit_skip';
 *  (2) a nudge fixture and a partial-answer fixture (2 fixtures) create no
 *      delegation record at all, while the utterance itself still lands in
 *      the turn record;
 *  (3) the recorded delegation.raw_utterance is byte-identical to the input
 *      utterance (compared after encoding);
 *  (4) delegation.interpretation is non-empty and the user-facing render
 *      output contains that interpretation (reflected back; an empty
 *      interpretation is rejected fail-closed);
 *  (5) a session that delegates in its very first interaction still holds a
 *      goal_state whose predicates are the round-0 derivation output, content
 *      and all — delegation does not let the derivation be skipped (a bypass
 *      attempt is rejected);
 *  (6) in a delegated session a fired question without goal_predicate_ref is
 *      still rejected by the ac-3 orphan gate — autonomous goal governance
 *      survives delegation.
 *
 * Clause 6 deliberately drives the *same* gate ac-3 pins, `recordFiredTurn`
 * from src/interview/turn.ts, with the delegated session itself as the turn
 * log. That is what "the ac-3 gate still governs" means operationally: the
 * delegated session must be an ac-3 turn log (turns + orphan_rejection_count)
 * and must go through the ac-3 rejection path — counter increment, no turn
 * appended — with the session's delegations and goal_state riding along. A
 * ref that names no predicate of *that* session's goal_state is rejected too,
 * so the gate cannot ignore the session it governs.
 *
 * Residual — deliberately NOT tested here, per gate-a/rows/ac-2.json residual:
 *  - Whether a real utterance is truly an explicit skip (as opposed to a
 *    nudge or a partial answer) is not mechanizable. Fixtures pin the tag
 *    (the LLM-emitted label) and this file asserts routing + recording only;
 *    classification accuracy on live user utterances is not closed here.
 *  - Whether delegation.interpretation is the *correct* reading of the
 *    utterance is a human-judgment predicate; the machine checks stop at
 *    non-empty + surfaced verbatim in the user-facing output.
 */

import { describe, expect, test } from "bun:test";
import { parseDelegationRecord, recordUserUtterance } from "../src/interview/delegation";
import { parseGoalState } from "../src/interview/goal-state";
import { renderDelegationReflection } from "../src/interview/render";
import { createSession, recordFiredTurn } from "../src/interview/turn";

const SOURCE_REQUEST = "받은 편지함에서 90일 지난 메일을 보관함으로 옮겨줘";

// The trailing space and the em dash are deliberate: clause 3 demands byte
// preservation, so any trimming or normalization must make this file fail.
const SKIP_UTTERANCE = "그냥 진행해 — 세부는 알아서 해줘 ";
const SKIP_INTERPRETATION =
  "남은 세부 결정을 저에게 위임하고 바로 진행해 달라는 뜻으로 이해했습니다.";
const NUDGE_UTTERANCE = "아직인가요? 빨리 좀 부탁해요.";
const PARTIAL_ANSWER_UTTERANCE = "일단 받은 편지함 것만요, 나머지는 나중에 정할게요.";

// Round-0 autonomous derivation output. In production this is LLM-emitted;
// the fixture pins it so only the deterministic machinery is under test.
const P1_STATEMENT = "받은 편지함에 90일 지난 메일이 한 통도 남아 있지 않다";
const P1_MEANS = "이동 뒤 받은 편지함을 재조회해 90일 초과 메일이 0건임을 확인";
const P2_STATEMENT = "옮겨진 메일이 모두 보관함에서 조회된다";
const P2_MEANS = "보관함을 검색해 이동 대상 메일이 전부 조회됨을 확인";

const AUTONOMOUS_GOAL_DRAFT = {
  predicates: [
    { id: "p-1", statement: P1_STATEMENT, verification_means: P1_MEANS, confirmed: false },
    { id: "p-2", statement: P2_STATEMENT, verification_means: P2_MEANS, confirmed: false },
  ],
};

// A second, materially different session. Its round-0 derivation shares no
// predicate id with the first, so a constant goal_state or a session-blind
// orphan gate cannot satisfy both sessions at once.
const ALT_SOURCE_REQUEST = "지난 분기 청구서 PDF를 월별 폴더로 정리해줘";
const ALT_SKIP_UTTERANCE = "알아서 진행해주세요.";
const ALT_INTERPRETATION = "정리 규칙 결정을 저에게 맡기고 바로 진행해 달라는 뜻으로 이해했습니다.";
const G1_STATEMENT = "지난 분기 청구서 PDF가 모두 해당 월 폴더 아래에 있다";
const G1_MEANS = "월별 폴더를 열어 분기 내 청구서 수가 원본 수와 같은지 확인";

const ALT_GOAL_DRAFT = {
  predicates: [
    { id: "g-1", statement: G1_STATEMENT, verification_means: G1_MEANS, confirmed: false },
  ],
};

const EXPLICIT_SKIP_TURN = {
  tag: "explicit_skip" as const,
  utterance: SKIP_UTTERANCE,
  interpretation: SKIP_INTERPRETATION,
  autonomous_goal_draft: AUTONOMOUS_GOAL_DRAFT,
};

const ALT_EXPLICIT_SKIP_TURN = {
  tag: "explicit_skip" as const,
  utterance: ALT_SKIP_UTTERANCE,
  interpretation: ALT_INTERPRETATION,
  autonomous_goal_draft: ALT_GOAL_DRAFT,
};

const ORPHAN_QUESTION = "메일은 어떤 순서로 옮길까요?";
const SECOND_ORPHAN_QUESTION = "옮긴 뒤 알림을 보낼까요?";
const LINKED_QUESTION = "받은 편지함 재조회는 어느 시점에 할까요?";

/** Reads the fired-question text of a turn without assuming the turn union. */
function questionTexts(turns: readonly unknown[]): string[] {
  return turns.map((turn) => (turn as { question_text?: string }).question_text ?? "");
}

/** Reads the user-utterance text of a turn without assuming the turn union. */
function utteranceTexts(turns: readonly unknown[]): string[] {
  return turns.map((turn) => (turn as { utterance?: string }).utterance ?? "");
}

function refOf(turn: unknown): string | undefined {
  return (turn as { goal_predicate_ref?: string }).goal_predicate_ref;
}

function delegateInFirstInteraction() {
  const session = createSession({ source_request: SOURCE_REQUEST });
  const outcome = recordUserUtterance(session, EXPLICIT_SKIP_TURN);
  if (!outcome.accepted) throw new Error("expected the explicit-skip turn to be accepted");
  return outcome.session;
}

function delegateAlternateSession() {
  const session = createSession({ source_request: ALT_SOURCE_REQUEST });
  const outcome = recordUserUtterance(session, ALT_EXPLICIT_SKIP_TURN);
  if (!outcome.accepted)
    throw new Error("expected the alternate explicit-skip turn to be accepted");
  return outcome.session;
}

describe("ac-2 clause 1 — explicit skip is recorded as a delegation", () => {
  test("an explicit-skip tagged utterance creates a delegation record with kind 'explicit_skip'", () => {
    const session = delegateInFirstInteraction();
    expect(session.delegations).toHaveLength(1);
    const record = parseDelegationRecord(session.delegations[0]);
    expect(record.kind).toBe("explicit_skip");
    expect(utteranceTexts(session.turns)).toContain(SKIP_UTTERANCE);
  });
});

describe("ac-2 clause 2 — nudge and partial answer leave no delegation record", () => {
  test("a nudge utterance is kept in the turn record but creates no delegation record", () => {
    const session = createSession({ source_request: SOURCE_REQUEST });
    const outcome = recordUserUtterance(session, {
      tag: "nudge" as const,
      utterance: NUDGE_UTTERANCE,
    });
    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) throw new Error("expected the nudge turn to be accepted");
    expect(outcome.session.delegations).toHaveLength(0);
    expect(utteranceTexts(outcome.session.turns)).toContain(NUDGE_UTTERANCE);
  });

  test("a partial answer is kept in the turn record but creates no delegation record", () => {
    const session = createSession({ source_request: SOURCE_REQUEST });
    const outcome = recordUserUtterance(session, {
      tag: "partial_answer" as const,
      utterance: PARTIAL_ANSWER_UTTERANCE,
    });
    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) throw new Error("expected the partial-answer turn to be accepted");
    expect(outcome.session.delegations).toHaveLength(0);
    expect(utteranceTexts(outcome.session.turns)).toContain(PARTIAL_ANSWER_UTTERANCE);
  });
});

describe("ac-2 clause 3 — raw_utterance is preserved verbatim (byte-identical)", () => {
  test("the recorded delegation.raw_utterance byte-equals the input utterance after encoding", () => {
    const session = delegateInFirstInteraction();
    const record = parseDelegationRecord(session.delegations[0]);
    const encoder = new TextEncoder();
    const inputBytes = encoder.encode(SKIP_UTTERANCE);
    const recordedBytes = encoder.encode(record.raw_utterance);
    expect(recordedBytes.byteLength).toBe(inputBytes.byteLength);
    expect(recordedBytes).toEqual(inputBytes);
  });

  test("a different delegating utterance is preserved byte-identically too (no constant echo)", () => {
    const session = delegateAlternateSession();
    const record = parseDelegationRecord(session.delegations[0]);
    const encoder = new TextEncoder();
    expect(encoder.encode(record.raw_utterance)).toEqual(encoder.encode(ALT_SKIP_UTTERANCE));
    expect(record.raw_utterance).not.toBe(SKIP_UTTERANCE);
  });
});

describe("ac-2 clause 4 — interpretation is non-empty and reflected to the user", () => {
  test("delegation.interpretation is non-empty and preserved exactly as emitted", () => {
    const session = delegateInFirstInteraction();
    const record = parseDelegationRecord(session.delegations[0]);
    expect(record.interpretation.length).toBeGreaterThan(0);
    expect(record.interpretation).toBe(SKIP_INTERPRETATION);
  });

  test("the user-facing render output contains the interpretation verbatim", () => {
    const session = delegateInFirstInteraction();
    const record = parseDelegationRecord(session.delegations[0]);
    const rendered = renderDelegationReflection(record);
    expect(rendered).toContain(SKIP_INTERPRETATION);
  });

  test("the render output tracks the record it is given (a different delegation renders its own interpretation)", () => {
    const altRecord = parseDelegationRecord(delegateAlternateSession().delegations[0]);
    const altRendered = renderDelegationReflection(altRecord);
    expect(altRendered).toContain(ALT_INTERPRETATION);
    expect(altRendered).not.toContain(SKIP_INTERPRETATION);
  });

  test("an explicit skip with an empty interpretation is rejected fail-closed, recording nothing", () => {
    // Start from a session that already holds one accepted delegation, so the
    // "recorded nothing" assertion is not vacuously true on an empty list.
    const session = delegateInFirstInteraction();
    expect(session.delegations).toHaveLength(1);

    const outcome = recordUserUtterance(session, {
      ...EXPLICIT_SKIP_TURN,
      interpretation: "",
    });
    expect(outcome.accepted).toBe(false);
    if (outcome.accepted) throw new Error("expected the empty-interpretation skip to be rejected");
    expect(outcome.reason).toContain("interpretation");
    expect(session.delegations).toHaveLength(1);
    expect(parseDelegationRecord(session.delegations[0]).interpretation).toBe(SKIP_INTERPRETATION);
  });
});

describe("ac-2 clause 5 — delegation does not skip round-0 goal derivation", () => {
  test("a session delegating in its first interaction carries the round-0 predicates in full", () => {
    const session = delegateInFirstInteraction();
    const goalState = parseGoalState(session.goal_state);
    expect(goalState.predicates).toHaveLength(2);
    expect(goalState.predicates.map((p) => p.id)).toEqual(["p-1", "p-2"]);
    expect(goalState.predicates.map((p) => p.statement)).toEqual([P1_STATEMENT, P2_STATEMENT]);
    expect(goalState.predicates.map((p) => p.verification_means)).toEqual([P1_MEANS, P2_MEANS]);
    expect(goalState.predicates.map((p) => p.confirmed)).toEqual([false, false]);
  });

  test("a second delegating session carries its own derivation, not the first one's (no constant goal_state)", () => {
    const altGoalState = parseGoalState(delegateAlternateSession().goal_state);
    expect(altGoalState.predicates).toHaveLength(1);
    expect(altGoalState.predicates.map((p) => p.id)).toEqual(["g-1"]);
    expect(altGoalState.predicates[0]?.statement).toBe(G1_STATEMENT);
    expect(altGoalState.predicates[0]?.verification_means).toBe(G1_MEANS);
    expect(altGoalState.predicates.map((p) => p.id)).not.toContain("p-1");
  });

  test("a first-interaction delegation without an autonomous goal draft is rejected (no bypass)", () => {
    const session = createSession({ source_request: SOURCE_REQUEST });
    const outcome = recordUserUtterance(session, {
      tag: "explicit_skip" as const,
      utterance: SKIP_UTTERANCE,
      interpretation: SKIP_INTERPRETATION,
    });
    expect(outcome.accepted).toBe(false);
    if (outcome.accepted) throw new Error("expected the draft-less delegation to be rejected");
    expect(outcome.reason).toContain("goal_state");
    expect(session.delegations).toHaveLength(0);
    expect(session.goal_state).toBeUndefined();
  });
});

describe("ac-2 clause 6 — the ac-3 orphan gate still governs under delegation", () => {
  test("an orphan fired question in a delegated session takes the ac-3 rejection path (counter up, no turn)", () => {
    const delegated = delegateInFirstInteraction();
    expect(delegated.orphan_rejection_count).toBe(0);
    const turnsBefore = delegated.turns.length;

    const first = recordFiredTurn(delegated, {
      question_text: ORPHAN_QUESTION,
      asked_at: "2026-07-25T10:00:00.000Z",
    });
    expect(first.recorded).toBe(false);
    expect(first.log.orphan_rejection_count).toBe(1);
    expect(first.log.turns).toHaveLength(turnsBefore);
    expect(questionTexts(first.log.turns)).not.toContain(ORPHAN_QUESTION);

    // The delegated session state rides through the gate: it is the same
    // session being governed, not a bare log the gate invented.
    expect(first.log.delegations).toHaveLength(1);
    expect(parseDelegationRecord(first.log.delegations[0]).kind).toBe("explicit_skip");
    expect(parseGoalState(first.log.goal_state).predicates.map((p) => p.id)).toEqual([
      "p-1",
      "p-2",
    ]);

    const second = recordFiredTurn(first.log, {
      question_text: SECOND_ORPHAN_QUESTION,
      asked_at: "2026-07-25T10:01:00.000Z",
    });
    expect(second.recorded).toBe(false);
    expect(second.log.orphan_rejection_count).toBe(2);
    expect(second.log.turns).toHaveLength(turnsBefore);
  });

  test("a fired question referencing a predicate of that session's goal_state passes the same gate", () => {
    const delegated = delegateInFirstInteraction();
    const turnsBefore = delegated.turns.length;
    const ref = parseGoalState(delegated.goal_state).predicates[0]?.id;
    expect(ref).toBe("p-1");

    const accepted = recordFiredTurn(delegated, {
      question_text: LINKED_QUESTION,
      asked_at: "2026-07-25T10:02:00.000Z",
      goal_predicate_ref: ref,
    });
    expect(accepted.recorded).toBe(true);
    expect(accepted.log.turns).toHaveLength(turnsBefore + 1);
    expect(questionTexts(accepted.log.turns)).toContain(LINKED_QUESTION);
    expect(refOf(accepted.log.turns[turnsBefore])).toBe("p-1");
    expect(accepted.log.orphan_rejection_count).toBe(0);
  });

  test("a ref naming no predicate of the delegated session's goal_state is rejected as an orphan", () => {
    const delegated = delegateInFirstInteraction();
    const turnsBefore = delegated.turns.length;

    const dangling = recordFiredTurn(delegated, {
      question_text: LINKED_QUESTION,
      asked_at: "2026-07-25T10:03:00.000Z",
      goal_predicate_ref: "p-99",
    });
    expect(dangling.recorded).toBe(false);
    expect(dangling.log.orphan_rejection_count).toBe(1);
    expect(dangling.log.turns).toHaveLength(turnsBefore);
    expect(questionTexts(dangling.log.turns)).not.toContain(LINKED_QUESTION);
  });

  test("the gate reads the goal_state of the session it is given (same ref, opposite verdicts across sessions)", () => {
    const alternate = delegateAlternateSession();
    expect(alternate.orphan_rejection_count).toBe(0);

    const foreignRef = recordFiredTurn(alternate, {
      question_text: "청구서는 어느 폴더 규칙으로 나눌까요?",
      asked_at: "2026-07-25T11:00:00.000Z",
      goal_predicate_ref: "p-1",
    });
    expect(foreignRef.recorded).toBe(false);
    expect(foreignRef.log.orphan_rejection_count).toBe(1);

    const ownRef = recordFiredTurn(alternate, {
      question_text: "청구서는 어느 폴더 규칙으로 나눌까요?",
      asked_at: "2026-07-25T11:01:00.000Z",
      goal_predicate_ref: "g-1",
    });
    expect(ownRef.recorded).toBe(true);
    expect(ownRef.log.orphan_rejection_count).toBe(0);
    expect(refOf(ownRef.log.turns[ownRef.log.turns.length - 1])).toBe("g-1");
  });
});
