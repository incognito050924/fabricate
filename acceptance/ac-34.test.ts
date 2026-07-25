/**
 * ac-34 acceptance — B4 challenge the answer with evidence: when an answer
 * turn is fixed (by fixture) as contradicting the glossary and the current
 * code, a challenge record is produced and fired as the immediately-next
 * round's question; the fired challenge question must carry a non-empty
 * grounding citation, citation-less "challenges" are rejected, and because
 * the glossary/code themselves can drift (§4-11) the current code is cited
 * as the authority. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-34.json), covered clauses:
 *  (1) challenge fires as the immediately-next round: from a fixture that
 *      fixes the contradiction verdict, triggerChallengeQuestion produces a
 *      challenge record plus a question whose round number equals the answer
 *      turn's round + 1 exactly (asserted as equality, so deferring to N+2
 *      or later fails — the strictly-greater relaxation is forbidden), the
 *      round tracks the answer turn (not a constant), and the challenge
 *      record references the original answer turn.
 *  (2) grounding citation is mandatory: the fired challenge question carries
 *      a non-empty grounding citation (source reference + excerpt .min(1),
 *      authority kind enum, parse-or-refuse); a challenge without a
 *      grounding citation is rejected by both the zod schema and the
 *      approval gate (negative fixtures).
 *  (3) current code is the authority: in a fixture where the glossary entry
 *      and the current code have drifted apart, a challenge is approved only
 *      when its citation's authority is the code source and its excerpt is a
 *      verbatim fragment of the current code content; a glossary-only
 *      citation and a stale excerpt that no longer matches the current code
 *      are each rejected (two negative fixtures).
 *  (4) determinism: the approval/rejection gate and the current-code
 *      authority check are pure functions — identical input always yields
 *      identical routing.
 *
 * Residual (NOT tested here, per row residual):
 *  - Contradiction content judgment — whether the answer actually
 *    contradicts the glossary/code is declared residual by the locked
 *    statement itself; the contradiction verdict enters these tests as a
 *    fixture input, and detection recall/precision is not closed here.
 *  - Citation argumentative adequacy — whether the cited current-code
 *    excerpt actually supports the challenge's point is a human judgment;
 *    the machine checks only citation presence, authority kind, and
 *    excerpt-to-current-code-content agreement.
 */
import { describe, expect, test } from "bun:test";
import {
  answerChallengeSchema,
  gateAnswerChallenge,
  triggerChallengeQuestion,
} from "../src/interview/challenge/answer-challenge";
import { citationHasCurrentCodeAuthority } from "../src/interview/challenge/current-code-authority";
import { groundingCitationSchema } from "../src/interview/challenge/grounding-citation";

// --- Fixtures ---------------------------------------------------------------
// The current code is the authority (§4-11: glossary and code can drift).
const currentCode = {
  path: "src/orders/cancel-window.ts",
  content:
    "export const CANCEL_WINDOW_HOURS = 24;\n// Refund requests close 24 hours after purchase.\n",
};

// Glossary entry that has drifted away from the current code (72h vs 24h).
const driftedGlossaryEntry = {
  term: "취소 가능 기간",
  definition: "구매 후 72시간 동안 주문을 취소할 수 있다.",
};

// Answer turn fixed BY FIXTURE as contradicting glossary and current code.
// Whether it actually contradicts is residual — the verdict is an input here.
const contradictingAnswerTurn = {
  id: "turn-7",
  round: 3,
  answer: "취소는 기간 제한 없이 언제든 가능합니다.",
};

// Citation whose excerpt is a verbatim fragment of the CURRENT code content.
const codeCitation = {
  authority: "code",
  source_ref: "src/orders/cancel-window.ts",
  excerpt: "export const CANCEL_WINDOW_HOURS = 24;",
};

// Negative fixture: cites only the (drifted) glossary, never the code.
const glossaryOnlyCitation = {
  authority: "glossary",
  source_ref: "glossary:취소 가능 기간",
  excerpt: driftedGlossaryEntry.definition,
};

// Negative fixture: claims code authority but the excerpt is stale — it no
// longer appears in the current code content.
const staleExcerptCitation = {
  authority: "code",
  source_ref: "src/orders/cancel-window.ts",
  excerpt: "export const CANCEL_WINDOW_HOURS = 72;",
};

const gateContext = { current_code: currentCode };

const approvableChallenge = {
  answer_turn_id: contradictingAnswerTurn.id,
  grounding: codeCitation,
};

const withoutField = (record: Record<string, unknown>, field: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== field));

const fireChallenge = () =>
  triggerChallengeQuestion({
    answer_turn: contradictingAnswerTurn,
    grounding: codeCitation,
  });

describe("ac-34 clause 1 — contradiction fires a challenge as the immediately-next round", () => {
  test("the fired question's round equals the answer turn's round + 1 exactly (N+2 or later fails)", () => {
    const outcome = fireChallenge();
    // Equality, not >=: the statement's "next round" is the immediately-next
    // round; any strictly-greater relaxation must fail this assertion.
    expect(outcome.question.round).toBe(contradictingAnswerTurn.round + 1);
    expect(outcome.question.round).toBe(4);
  });

  test("the fired round tracks the answer turn's round, not a constant", () => {
    const laterRoundTurn = { id: "turn-19", round: 9, answer: "네." };
    const outcome = triggerChallengeQuestion({
      answer_turn: laterRoundTurn,
      grounding: codeCitation,
    });
    expect(outcome.question.round).toBe(10);
  });

  test("the challenge record references the original answer turn", () => {
    const outcome = fireChallenge();
    expect(outcome.challenge.answer_turn_id).toBe("turn-7");
  });

  test("the produced challenge record parses against the challenge schema", () => {
    const outcome = fireChallenge();
    expect(answerChallengeSchema.safeParse(outcome.challenge).success).toBe(true);
  });
});

describe("ac-34 clause 2 — grounding citation is mandatory and non-empty", () => {
  test("the fired challenge question carries the grounding citation verbatim and non-empty", () => {
    const outcome = fireChallenge();
    expect(outcome.question.grounding).toMatchObject(codeCitation);
    expect(outcome.question.grounding.excerpt.length).toBeGreaterThan(0);
    expect(groundingCitationSchema.safeParse(outcome.question.grounding).success).toBe(true);
  });

  test("a citation with source reference, non-empty excerpt, and known authority parses", () => {
    expect(groundingCitationSchema.safeParse(codeCitation).success).toBe(true);
    // Glossary authority is a valid citation KIND at schema level; it is the
    // approval gate (clause 3) that rejects glossary-only grounding.
    expect(groundingCitationSchema.safeParse(glossaryOnlyCitation).success).toBe(true);
  });

  test("an empty excerpt is refused (.min(1))", () => {
    expect(groundingCitationSchema.safeParse({ ...codeCitation, excerpt: "" }).success).toBe(false);
  });

  test("a missing excerpt is refused", () => {
    expect(groundingCitationSchema.safeParse(withoutField(codeCitation, "excerpt")).success).toBe(
      false,
    );
  });

  test("an empty or missing source reference is refused", () => {
    expect(groundingCitationSchema.safeParse({ ...codeCitation, source_ref: "" }).success).toBe(
      false,
    );
    expect(
      groundingCitationSchema.safeParse(withoutField(codeCitation, "source_ref")).success,
    ).toBe(false);
  });

  test("an unknown authority kind is refused (enum)", () => {
    expect(groundingCitationSchema.safeParse({ ...codeCitation, authority: "rumor" }).success).toBe(
      false,
    );
  });

  test("a challenge without a grounding citation is refused by the challenge schema", () => {
    expect(
      answerChallengeSchema.safeParse(withoutField(approvableChallenge, "grounding")).success,
    ).toBe(false);
  });

  test("a challenge without a grounding citation is rejected by the approval gate (negative fixture)", () => {
    const routing = gateAnswerChallenge(
      withoutField(approvableChallenge, "grounding"),
      gateContext,
    );
    expect(routing.approved).toBe(false);
  });

  test("a challenge missing the original answer turn reference is refused", () => {
    expect(
      answerChallengeSchema.safeParse(withoutField(approvableChallenge, "answer_turn_id")).success,
    ).toBe(false);
  });
});

describe("ac-34 clause 3 — the current code is the cited authority under glossary/code drift", () => {
  test("fixture integrity: the code excerpt is verbatim in current code; the stale one is not", () => {
    // Guards the positive/negative fixtures below from silently going vacuous.
    expect(currentCode.content).toContain(codeCitation.excerpt);
    expect(currentCode.content).not.toContain(staleExcerptCitation.excerpt);
  });

  test("a citation with code authority whose excerpt matches current code passes the authority check", () => {
    expect(citationHasCurrentCodeAuthority(codeCitation, currentCode)).toBe(true);
  });

  test("a challenge grounded in the current code is approved by the gate", () => {
    const routing = gateAnswerChallenge(approvableChallenge, gateContext);
    expect(routing.approved).toBe(true);
  });

  test("a glossary-only citation fails the authority check and the gate rejects it (negative fixture 1)", () => {
    expect(citationHasCurrentCodeAuthority(glossaryOnlyCitation, currentCode)).toBe(false);
    const routing = gateAnswerChallenge(
      { ...approvableChallenge, grounding: glossaryOnlyCitation },
      gateContext,
    );
    expect(routing.approved).toBe(false);
  });

  test("a stale excerpt that no longer matches current code is rejected (negative fixture 2)", () => {
    expect(citationHasCurrentCodeAuthority(staleExcerptCitation, currentCode)).toBe(false);
    const routing = gateAnswerChallenge(
      { ...approvableChallenge, grounding: staleExcerptCitation },
      gateContext,
    );
    expect(routing.approved).toBe(false);
  });
});

describe("ac-34 clause 4 — the approval gate is a pure function (same input, same routing)", () => {
  test("identical approvable input yields identical approval routing", () => {
    const first = gateAnswerChallenge(approvableChallenge, gateContext);
    const second = gateAnswerChallenge(approvableChallenge, gateContext);
    expect(first.approved).toBe(true);
    expect(second).toEqual(first);
  });

  test("identical rejectable input yields identical rejection routing", () => {
    const rejectable = { ...approvableChallenge, grounding: staleExcerptCitation };
    const first = gateAnswerChallenge(rejectable, gateContext);
    const second = gateAnswerChallenge(rejectable, gateContext);
    expect(first.approved).toBe(false);
    expect(second).toEqual(first);
  });

  test("the current-code authority check is deterministic on both sides", () => {
    expect(citationHasCurrentCodeAuthority(codeCitation, currentCode)).toBe(
      citationHasCurrentCodeAuthority(codeCitation, currentCode),
    );
    expect(citationHasCurrentCodeAuthority(glossaryOnlyCitation, currentCode)).toBe(
      citationHasCurrentCodeAuthority(glossaryOnlyCitation, currentCode),
    );
  });
});
