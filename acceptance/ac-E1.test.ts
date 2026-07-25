/**
 * Acceptance test for ac-E1 — Wald preregistration + two exits + budget-
 * exhaustion disclosure (contract-draft §4 group E, "termination machine"):
 * (1) lock_threshold is preregistered per risk tier before the interview's
 *     first turn (the registration event precedes the first turn event) and
 *     the per-tier values are queryable — the queried values come from the
 *     session's own preregistration, so two sessions preregistered with
 *     different tables answer differently;
 * (2) a mid-interview "feels done" attempt to lower the threshold below its
 *     preregistered value returns a refusal and the threshold stays exactly
 *     the preregistered value (immutable), while a non-lowering change is
 *     accepted and does move the stored value — the block is on lowering,
 *     not on change as such;
 * (3) both termination exits exit ∈ {build, aporia_or_rescope} are real —
 *     one fixture actually terminates through each — and a termination
 *     configuration exposing only a single exit is refused;
 * (4) terminating a budget-exhausted session must include a non-empty
 *     shortfall_disclosure in its output, and any attempt to terminate
 *     without that disclosure (missing, empty or blank) is refused; a
 *     session that has taken turns but has not exhausted its budget is not
 *     subject to that requirement (exhaustion is budget vs. consumed turns,
 *     not "has taken any turn").
 *
 * Frozen red: the modules src/interview/session.ts,
 * src/interview/preregistration.ts, src/interview/termination.ts and
 * src/interview/shortfall.ts do not exist yet; the piece-3 implementation
 * must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-E1.json (oracle_statement clauses 1-4).
 *
 * Residual — deliberately NOT tested here, per the row's residual
 * declaration: risk-tier judgment (which interview or predicate belongs to
 * which risk tier) is declared residual by the contract passage itself.
 * Every fixture below assigns the risk tier explicitly; only the
 * preregistration, lowering block, two-exit, and forced-disclosure machinery
 * are asserted on top of that fixture-assigned tier.
 */

import { describe, expect, test } from "bun:test";
import { getLockThreshold, requestThresholdChange } from "../src/interview/preregistration";
import { isBudgetExhausted, startInterview, takeTurn } from "../src/interview/session";
import { composeShortfallDisclosure } from "../src/interview/shortfall";
import { concludeInterview, createTerminationConfig } from "../src/interview/termination";

type InterviewEvent = { kind: string; seq: number; utterance?: string };

// Two different per-tier tables. Values differ within a table (so a single
// global number cannot answer a per-tier query) and differ between tables
// (so a hardcoded constant map cannot answer either session's query).
const PREREGISTERED_THRESHOLDS = { low: 2, medium: 4, high: 7 };
const ALTERNATE_THRESHOLDS = { low: 1, medium: 5, high: 9 };

const startFixtureSession = (
  overrides: {
    riskTier?: string;
    budgetTurns?: number;
    lockThresholds?: { low: number; medium: number; high: number };
  } = {},
) =>
  startInterview({
    // Fixture-assigned tier — tier judgment itself is residual.
    riskTier: overrides.riskTier ?? "high",
    lockThresholds: overrides.lockThresholds ?? PREREGISTERED_THRESHOLDS,
    budgetTurns: overrides.budgetTurns ?? 10,
  });

// Advance a fresh session by `turns` turns against the given budget.
const sessionWithTurns = (budgetTurns: number, turns: number) => {
  let session = startFixtureSession({ budgetTurns });
  for (let index = 0; index < turns; index += 1) {
    session = takeTurn(session, { utterance: `예산 확인용 ${index + 1}번째 턴 발화` });
  }
  return session;
};

describe("ac-E1 clause 1: lock_threshold is preregistered per risk tier before the first turn", () => {
  test("the interview starts with preregistration alone and each turn is recorded strictly after it", () => {
    const session = startFixtureSession();
    const initialEvents: InterviewEvent[] = session.events;
    expect(initialEvents.length).toBe(1);
    expect(initialEvents[0]?.kind).toBe("preregistration");

    const firstUtterance = "결제 실패 시 재시도는 어떻게 되나요?";
    const secondUtterance = "재시도 상한을 넘기면 어떤 알림이 나가나요?";
    const afterTwoTurns = takeTurn(takeTurn(session, { utterance: firstUtterance }), {
      utterance: secondUtterance,
    });

    const events: InterviewEvent[] = afterTwoTurns.events;
    // Events accumulate: the registration first, then the two turns in order.
    expect(events.map((event) => event.kind)).toEqual(["preregistration", "turn", "turn"]);
    // The turn events are the product of the actual turns, kept verbatim.
    expect(events.filter((event) => event.kind === "turn").map((event) => event.utterance)).toEqual(
      [firstUtterance, secondUtterance],
    );
    // Strictly increasing sequence numbers: registration precedes turn 1,
    // turn 1 precedes turn 2.
    const seqs = events.map((event) => event.seq);
    expect(seqs[0]).toBeLessThan(seqs[1] as number);
    expect(seqs[1]).toBeLessThan(seqs[2] as number);
  });

  test("the preregistered threshold is queried per tier out of the session that registered it", () => {
    const session = startFixtureSession();
    expect(getLockThreshold(session, "low")).toBe(2);
    expect(getLockThreshold(session, "medium")).toBe(4);
    expect(getLockThreshold(session, "high")).toBe(7);

    // A second interview preregistered with a different table answers with
    // its own values, not with the first table's.
    const alternate = startFixtureSession({ lockThresholds: ALTERNATE_THRESHOLDS });
    expect(getLockThreshold(alternate, "low")).toBe(1);
    expect(getLockThreshold(alternate, "medium")).toBe(5);
    expect(getLockThreshold(alternate, "high")).toBe(9);

    // …and the first session is untouched by the second registration.
    expect(getLockThreshold(session, "high")).toBe(7);
  });
});

describe("ac-E1 clause 2: mid-interview lowering below the preregistered value is refused", () => {
  test("a 'feels done' lowering attempt returns a refusal result", () => {
    const inProgress = takeTurn(startFixtureSession(), {
      utterance: "이 정도면 충분히 파악된 느낌이라 임계를 낮춰도 될 것 같아요",
    });
    const attempt = requestThresholdChange(inProgress, { tier: "high", value: 3 });
    expect(attempt.accepted).toBe(false);
    expect(attempt.outcome).toBe("refused");
    expect(attempt.reason).toBe("preregistered-threshold-lowering-forbidden");
  });

  test("after refused lowering attempts every threshold still reads its preregistered value", () => {
    const inProgress = takeTurn(startFixtureSession(), {
      utterance: "느낌상 됐으니 그만 물어봐도 될 듯해요",
    });
    requestThresholdChange(inProgress, { tier: "high", value: 3 });
    expect(getLockThreshold(inProgress, "high")).toBe(7);

    requestThresholdChange(inProgress, { tier: "medium", value: 1 });
    expect(getLockThreshold(inProgress, "medium")).toBe(4);
  });

  test("contrast: a non-lowering (raising) change is accepted and really moves the stored value", () => {
    const inProgress = takeTurn(startFixtureSession(), {
      utterance: "생각보다 위험해서 임계를 더 올려야 할 것 같아요",
    });
    const raised = requestThresholdChange(inProgress, { tier: "high", value: 11 });
    expect(raised.accepted).toBe(true);
    expect(raised.outcome).toBe("accepted");
    // The accepted change is observable through the ordinary query…
    expect(getLockThreshold(raised.session, "high")).toBe(11);
    // …and it touched only the requested tier.
    expect(getLockThreshold(raised.session, "low")).toBe(2);
    expect(getLockThreshold(raised.session, "medium")).toBe(4);
  });

  test("the lowering block still holds after an accepted raise", () => {
    const raised = requestThresholdChange(startFixtureSession(), { tier: "high", value: 11 });
    const lowered = requestThresholdChange(raised.session, { tier: "high", value: 3 });
    expect(lowered.accepted).toBe(false);
    expect(lowered.reason).toBe("preregistered-threshold-lowering-forbidden");
    expect(getLockThreshold(raised.session, "high")).toBe(11);
  });
});

describe("ac-E1 clause 3: both exits are real and a single-exit configuration is refused", () => {
  test("a session actually terminates through exit='build'", () => {
    const result = concludeInterview(startFixtureSession(), { exit: "build" });
    expect(result.concluded).toBe(true);
    expect(result.exit).toBe("build");
  });

  test("a session actually terminates through exit='aporia_or_rescope'", () => {
    const result = concludeInterview(startFixtureSession(), { exit: "aporia_or_rescope" });
    expect(result.concluded).toBe(true);
    expect(result.exit).toBe("aporia_or_rescope");
  });

  test("a termination configuration exposing only one exit is refused (both single-exit variants)", () => {
    const buildOnly = createTerminationConfig({ exits: ["build"] });
    expect(buildOnly.valid).toBe(false);
    expect(buildOnly.outcome).toBe("refused");
    expect(buildOnly.reason).toBe("single-exit-forbidden");

    const aporiaOnly = createTerminationConfig({ exits: ["aporia_or_rescope"] });
    expect(aporiaOnly.valid).toBe(false);
    expect(aporiaOnly.outcome).toBe("refused");
    expect(aporiaOnly.reason).toBe("single-exit-forbidden");
  });

  test("contrast: the two-exit configuration is accepted with both exits preserved", () => {
    const both = createTerminationConfig({ exits: ["build", "aporia_or_rescope"] });
    expect(both.valid).toBe(true);
    expect(both.exits).toEqual(["build", "aporia_or_rescope"]);
  });
});

describe("ac-E1 clause 4: budget-exhausted termination forces a non-empty shortfall_disclosure", () => {
  // One-turn budget spent by one turn (fixture-controlled state).
  const exhaustedSession = () => sessionWithTurns(1, 1);

  test("exhaustion is budget versus consumed turns, not 'has taken any turn'", () => {
    expect(isBudgetExhausted(sessionWithTurns(2, 0))).toBe(false);
    // A turn was taken, yet the budget is not spent.
    expect(isBudgetExhausted(sessionWithTurns(2, 1))).toBe(false);
    expect(isBudgetExhausted(sessionWithTurns(2, 2))).toBe(true);
    // The same turn count reads differently under a different budget.
    expect(isBudgetExhausted(sessionWithTurns(1, 1))).toBe(true);
    expect(isBudgetExhausted(sessionWithTurns(10, 1))).toBe(false);
  });

  test("terminating while exhausted without any disclosure is refused through either exit", () => {
    const viaAporia = concludeInterview(exhaustedSession(), { exit: "aporia_or_rescope" });
    expect(viaAporia.concluded).toBe(false);
    expect(viaAporia.outcome).toBe("refused");
    expect(viaAporia.reason).toBe("shortfall-disclosure-required");

    const viaBuild = concludeInterview(exhaustedSession(), { exit: "build" });
    expect(viaBuild.concluded).toBe(false);
    expect(viaBuild.reason).toBe("shortfall-disclosure-required");
  });

  test("an empty or blank disclosure does not satisfy the non-empty requirement", () => {
    const empty = concludeInterview(exhaustedSession(), {
      exit: "aporia_or_rescope",
      shortfallDisclosure: "",
    });
    expect(empty.concluded).toBe(false);
    expect(empty.outcome).toBe("refused");
    expect(empty.reason).toBe("shortfall-disclosure-required");

    const blank = concludeInterview(exhaustedSession(), {
      exit: "aporia_or_rescope",
      shortfallDisclosure: "   ",
    });
    expect(blank.concluded).toBe(false);
    expect(blank.reason).toBe("shortfall-disclosure-required");
  });

  test("contrast: a session that took a turn but is not exhausted concludes without any disclosure", () => {
    const notExhausted = sessionWithTurns(2, 1);
    expect(isBudgetExhausted(notExhausted)).toBe(false);

    const result = concludeInterview(notExhausted, { exit: "build" });
    expect(result.concluded).toBe(true);
    expect(result.exit).toBe("build");
  });

  test("a budget-exhausted conclusion carries the non-empty disclosure naming every unresolved item", () => {
    const session = exhaustedSession();
    const firstUnresolved = "결제 실패 시 재시도 정책이 미확정";
    const secondUnresolved = "환불 승인 주체가 미확정";
    const disclosure: string = composeShortfallDisclosure(session, {
      unresolved: [firstUnresolved, secondUnresolved],
    });
    expect(disclosure.trim().length).toBeGreaterThan(0);
    expect(disclosure).toContain(firstUnresolved);
    expect(disclosure).toContain(secondUnresolved);

    const result = concludeInterview(session, {
      exit: "aporia_or_rescope",
      shortfallDisclosure: disclosure,
    });
    expect(result.concluded).toBe(true);
    expect(result.exit).toBe("aporia_or_rescope");
    // Carried into the output verbatim.
    expect(result.shortfall_disclosure).toBe(disclosure);
  });
});
