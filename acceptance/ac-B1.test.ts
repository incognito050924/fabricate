/**
 * Acceptance test for ac-B1 — maieutic origin enum + aporia (extends ac-25 /
 * ac-3): every final intent item carries
 * origin ∈ {사용자진술, 에이전트후보-사용자채택, 에이전트가정} and nothing else
 * (zod parsing rejects a missing or out-of-enum origin); finalize fails closed
 * — lock refused, no intent recorded — while any decision item still carries
 * origin='에이전트가정', and proceeds when every decision item's origin is in
 * {사용자진술, 에이전트후보-사용자채택}; and aporia (no intent to produce →
 * build nothing) is a legitimate terminal: the exit path returns a
 * legitimate-termination variant with no artifact and no error, as a distinct
 * variant from the clause-2 lock refusal.
 *
 * Frozen red: the modules under src/interview/origin/ do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-B1.json (oracle_statement clauses 1-3).
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 * (a) origin label accuracy — whether an item's origin correctly reflects the
 *     real provenance of the utterance (the user stated it, the user adopted
 *     an agent candidate, or the agent assumed it) is not machined; the
 *     fixtures fix the labels, and only enum enforcement and gate routing are
 *     asserted on top of them;
 * (b) the substance of the aporia judgment — whether "there is no intent to
 *     produce" is actually true of a real session is fixed by the fixture;
 *     only the existence of the aporia terminal and its not-an-error behavior
 *     are machine-checked. No prose is graded. The clause-3 negative fixtures
 *     below stay inside this residual: they do not ask the exit path to judge
 *     a real session, they only require it to read the fixture-fixed session
 *     it is handed instead of returning a constant terminal.
 */

import { describe, expect, test } from "bun:test";
import { concludeAporia } from "../src/interview/origin/aporia-exit";
import { finalizeWithOriginGate } from "../src/interview/origin/finalize-origin-gate";
import { intentItemSchema } from "../src/interview/origin/intent-item-origin";

const USER_STATED_DECISION = {
  id: "item-1",
  statement: "the CLI prints an intent summary for the locked criteria",
  origin: "사용자진술",
  decision: true,
};

const ADOPTED_CANDIDATE_DECISION = {
  id: "item-2",
  statement: "the summary includes a remaining-gap section",
  origin: "에이전트후보-사용자채택",
  decision: true,
};

const AGENT_ASSUMED_DECISION = {
  id: "item-3",
  statement: "the summary is rendered as a markdown table",
  origin: "에이전트가정",
  decision: true,
};

const AGENT_ASSUMED_NOTE = {
  id: "item-4",
  statement: "the user probably runs the CLI inside CI",
  origin: "에이전트가정",
  decision: false,
};

describe("ac-B1 clause 1: intent item schema allows exactly the three origin values", () => {
  const baseItem = {
    id: "item-1",
    statement: "the CLI prints an intent summary for the locked criteria",
    decision: true,
  };

  test("accepts each of the three Korean origin values and preserves them verbatim", () => {
    const user = intentItemSchema.safeParse({ ...baseItem, origin: "사용자진술" });
    expect(user.success).toBe(true);
    expect(user.success ? user.data.origin : undefined).toBe("사용자진술");

    const adopted = intentItemSchema.safeParse({
      ...baseItem,
      id: "item-2",
      origin: "에이전트후보-사용자채택",
    });
    expect(adopted.success).toBe(true);
    expect(adopted.success ? adopted.data.origin : undefined).toBe("에이전트후보-사용자채택");

    const assumed = intentItemSchema.safeParse({
      ...baseItem,
      id: "item-3",
      origin: "에이전트가정",
    });
    expect(assumed.success).toBe(true);
    expect(assumed.success ? assumed.data.origin : undefined).toBe("에이전트가정");
  });

  test("rejects an item whose origin field is missing (negative fixture)", () => {
    const parsed = intentItemSchema.safeParse(baseItem);
    expect(parsed.success).toBe(false);
    const issuePaths = parsed.success
      ? []
      : parsed.error.issues.map((issue: { path: (string | number)[] }) => issue.path.join("."));
    expect(issuePaths).toContain("origin");
  });

  test("rejects out-of-enum origin values (negative fixtures)", () => {
    const english = intentItemSchema.safeParse({ ...baseItem, origin: "agent-assumption" });
    expect(english.success).toBe(false);

    const koreanNearMiss = intentItemSchema.safeParse({ ...baseItem, origin: "에이전트추정" });
    expect(koreanNearMiss.success).toBe(false);

    const emptyString = intentItemSchema.safeParse({ ...baseItem, origin: "" });
    expect(emptyString.success).toBe(false);
  });
});

describe("ac-B1 clause 2: a remaining agent-assumption decision item blocks finalize fail-closed (2-state contrast)", () => {
  test("refuses the lock and records no intent while a decision item keeps origin='에이전트가정'", () => {
    const result = finalizeWithOriginGate({
      items: [USER_STATED_DECISION, AGENT_ASSUMED_DECISION],
    });
    expect(result.finalized).toBe(false);
    expect(result.outcome).toBe("refused");
    expect(result.reason).toBe("agent-assumption-remains");
    expect(result.intent).toBeUndefined();
  });

  test("a single agent assumption among otherwise safe decision items still blocks (fail-closed)", () => {
    const result = finalizeWithOriginGate({
      items: [USER_STATED_DECISION, ADOPTED_CANDIDATE_DECISION, AGENT_ASSUMED_DECISION],
    });
    expect(result.finalized).toBe(false);
    expect(result.intent).toBeUndefined();
  });

  test("contrast: decision items only from {사용자진술, 에이전트후보-사용자채택} lock and record intent verbatim", () => {
    const result = finalizeWithOriginGate({
      items: [USER_STATED_DECISION, ADOPTED_CANDIDATE_DECISION],
    });
    expect(result.finalized).toBe(true);
    expect(result.outcome).toBe("locked");
    expect(result.intent?.items.map((item: { id: string }) => item.id)).toEqual([
      "item-1",
      "item-2",
    ]);

    const recorded = result.intent?.items.find((item: { id: string }) => item.id === "item-1");
    expect(recorded?.statement).toBe(USER_STATED_DECISION.statement);
    expect(recorded?.origin).toBe("사용자진술");
  });

  test("contrast: an agent assumption on a non-decision item does not trigger this refusal", () => {
    const result = finalizeWithOriginGate({
      items: [USER_STATED_DECISION, ADOPTED_CANDIDATE_DECISION, AGENT_ASSUMED_NOTE],
    });
    expect(result.finalized).toBe(true);
    expect(result.outcome).toBe("locked");
  });
});

describe("ac-B1 clause 3: aporia — no intent to produce — is a legitimate, artifactless, non-error exit", () => {
  // The aporia recognition itself is fixed by these fixtures (residual b): the
  // aporia session ends with zero final intent items, the contrast sessions
  // carry at least one decision item, i.e. there IS something to produce.
  const APORIA_SESSION = { items: [] };
  const SESSION_WITH_ONE_DECISION = { items: [USER_STATED_DECISION] };
  const SESSION_WITH_TWO_DECISIONS = {
    items: [ADOPTED_CANDIDATE_DECISION, AGENT_ASSUMED_NOTE],
  };

  test("returns the legitimate-exit variant with no intent artifact and throws nothing", () => {
    const run = () => concludeAporia(APORIA_SESSION);
    expect(run).not.toThrow();

    const result = run();
    expect(result.outcome).toBe("aporia");
    expect(result.legitimate).toBe(true);
    expect(result.intent).toBeUndefined();
  });

  test("contrast: a session that still has intent to produce does not get the aporia terminal", () => {
    const oneDecision = concludeAporia(SESSION_WITH_ONE_DECISION);
    expect(oneDecision.outcome).not.toBe("aporia");
    expect(oneDecision.legitimate).toBe(false);
    expect(oneDecision.intent).toBeUndefined();

    // A second, differently shaped non-empty session: the exit path must read
    // the session, not match one fixture. Here the only decision item carries
    // origin='에이전트후보-사용자채택' and a non-decision note trails it.
    const twoItems = concludeAporia(SESSION_WITH_TWO_DECISIONS);
    expect(twoItems.outcome).not.toBe("aporia");
    expect(twoItems.legitimate).toBe(false);
    expect(twoItems.intent).toBeUndefined();
  });

  test("the exit path swallows nothing: the same tag never covers both a with-intent and a no-intent session", () => {
    const aporia = concludeAporia(APORIA_SESSION);
    const withIntent = concludeAporia(SESSION_WITH_ONE_DECISION);

    expect(aporia.legitimate).toBe(true);
    expect(withIntent.legitimate).toBe(false);
    expect(aporia.outcome).not.toBe(withIntent.outcome);
  });

  test("the aporia terminal is a distinct variant from the clause-2 lock refusal (contrast)", () => {
    const refused = finalizeWithOriginGate({ items: [AGENT_ASSUMED_DECISION] });
    const locked = finalizeWithOriginGate({
      items: [USER_STATED_DECISION, ADOPTED_CANDIDATE_DECISION],
    });
    const aporia = concludeAporia(APORIA_SESSION);

    expect(refused.outcome).toBe("refused");
    expect(locked.outcome).toBe("locked");
    expect(aporia.outcome).toBe("aporia");

    // One terminal space, three disjoint tags: the finalize gate never reaches
    // the aporia terminal, and the aporia exit never emits a finalize tag.
    expect(new Set([refused.outcome, locked.outcome, aporia.outcome]).size).toBe(3);
    expect([refused.outcome, locked.outcome]).not.toContain("aporia");
    expect(["locked", "refused"]).not.toContain(aporia.outcome);
    expect(concludeAporia(SESSION_WITH_ONE_DECISION).outcome).not.toBe("locked");
  });
});
