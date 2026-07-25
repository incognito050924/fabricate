/**
 * Acceptance test for ac-32 — B3, dissent sees the conclusion:
 * buildIntentDissentBrief gains resolved_reading so the brief carries the
 * ORIGINAL intent (the source-request reading) and the RESOLVED reading as one
 * comparison pair, a mis-resolved intent reaches the finalize dissent block,
 * and both the host-absent degrade and INTENT_DISSENT_CONSTRAINT are
 * preserved (the dissent channel is not a scope-expansion channel).
 *
 * Frozen red: src/interview/dissent.ts and the dissent extensions of
 * src/interview/finalize.ts do not exist yet. Slice 3 must implement them so
 * this file turns green; these assertions are the completion definition of
 * ac-32.
 *
 * Oracle clauses covered (gate-a/rows/ac-32.json oracle_statement):
 *  (1) comparison pair exists: the brief produced by buildIntentDissentBrief
 *      carries BOTH the original intent and resolved_reading verbatim on one
 *      object — either one missing fails;
 *  (2) comparison pair arrives: the whole trip is driven end to end on a
 *      mis-resolution fixture (resolved reading diverging from the original
 *      intent). The opponent delegate must receive the pair verbatim; the
 *      ENGAGED OUTCOME RETURNED BY engageIntentDissent must itself carry the
 *      pair; and that returned outcome — not a test-authored brief — is what
 *      is handed to finalize, whose dissent block must surface both readings
 *      verbatim. An engagement that answers `{status:"engaged"}` and drops the
 *      brief leaves a real caller with no pair to record, i.e. the mis-resolved
 *      intent vanishes en route, and must fail here;
 *  (3) host-absent degrade preserved (regression guard): with no host, brief
 *      construction does not throw, engagement degrades to a self-describing
 *      host_absent record instead of crashing or fabricating opponent words,
 *      and finalize runs to completion on THAT degrade record (accepted,
 *      intent recorded) — adding resolved_reading must not break this path;
 *  (4) INTENT_DISSENT_CONSTRAINT preserved: the constraint travels on the brief
 *      that actually reaches the opponent host (the delivery site, not only the
 *      standalone builder output), the builder's own output parses clean under
 *      the brief schema, and the schema rejects a constraint-less brief, a
 *      constraint rewritten into a scope-growing instruction, and a
 *      scope-expansion payload smuggled beside the pair — the dissent channel
 *      cannot be used to widen scope.
 *
 * Residual clause NOT tested here (per gate-a/rows/ac-32.json residual):
 *  - Whether the resolved reading is ACTUALLY a mis-resolution of the
 *    original intent — that judgment shares the model prior that produced the
 *    pair (correlated blind spot); if everyone shares the same misreading,
 *    the pair arriving does not catch it. The contract declares this residual
 *    itself; this file only asserts structure: pair existence, verbatim
 *    arrival, degrade preservation, and constraint preservation.
 *
 * Fixture note: synthesis_provenance and preservation_judgment are built with
 * the factories pinned by ac-9 (depends_on: ac-1, ac-9) so the finalize gates
 * they guard pass and the ONLY discriminating input here is the dissent
 * record.
 */
import { describe, expect, test } from "bun:test";
import {
  INTENT_DISSENT_CONSTRAINT,
  buildIntentDissentBrief,
  engageIntentDissent,
  intentDissentBriefSchema,
} from "../src/interview/dissent";
import { createIntentStore, finalize, listRecordedIntents } from "../src/interview/finalize";
import { buildPreservationBrief } from "../src/interview/preservation-judgment";
import { createSynthesisProvenance } from "../src/interview/synthesis-provenance";

// The original intent is the source-request reading, verbatim.
const ORIGINAL_INTENT = "결제가 실패하면 사용자에게 실패 사유 문구를 그대로 보여 주세요.";
// Mis-resolution mock: the interview resolved the intent into a DIFFERENT
// reading (failure reason demoted to internal logs — the user never sees it).
const RESOLVED_READING =
  "결제가 실패하면 일반 오류 안내만 표시하고 실패 사유는 내부 로그에만 남긴다.";
// The opponent's words. Pinned so `text` on an outcome means exactly one thing:
// what the opponent host actually said. A degrade may not invent it.
const OPPONENT_DISSENT_TEXT =
  "해소된 독해가 원 의도의 '사유 문구를 그대로'를 내부 로그 전용으로 좁혔다.";

const misResolvedBrief = buildIntentDissentBrief({
  original_intent: ORIGINAL_INTENT,
  resolved_reading: RESOLVED_READING,
});

// ac-9-pinned gate inputs so finalize is not rejected for an unrelated reason.
const provenance = createSynthesisProvenance({ author_context: "fresh_synthesizer" });
const passJudgment = {
  verdict: "pass",
  brief: buildPreservationBrief({
    source_request: ORIGINAL_INTENT,
    candidate_statement: RESOLVED_READING,
    judge_context: "blind_judge",
  }),
} as const;

const finalizeBase = {
  source_request: ORIGINAL_INTENT,
  candidate_statement: RESOLVED_READING,
  synthesis_provenance: provenance,
  preservation_judgment: passJudgment,
} as const;

// What the opponent host is handed. Typed with `constraint` so the delivery
// site — not only the builder output — is under assertion.
type DeliveredBrief = {
  original_intent: string;
  resolved_reading: string;
  constraint: string;
};

/**
 * Runs the real engagement path against a recording opponent host and returns
 * both what the host received and what the engagement returned. Every clause-2
 * fixture is derived from this, so nothing downstream is test-authored.
 */
async function engageAgainstRecordingHost(): Promise<{
  // biome-ignore lint/suspicious/noExplicitAny: the outcome shape is the module's to define; this file asserts its values.
  outcome: any;
  delivered: DeliveredBrief[];
}> {
  const delivered: DeliveredBrief[] = [];

  const outcome = await engageIntentDissent({
    original_intent: ORIGINAL_INTENT,
    resolved_reading: RESOLVED_READING,
    host: {
      delegate: (brief: DeliveredBrief) => {
        delivered.push(brief);
        return Promise.resolve(OPPONENT_DISSENT_TEXT);
      },
    },
  });

  return { outcome, delivered };
}

describe("ac-32 clause 1 — the brief holds the comparison pair", () => {
  test("brief carries the original intent AND resolved_reading verbatim on one object", () => {
    expect(misResolvedBrief.original_intent).toBe(ORIGINAL_INTENT);
    expect(misResolvedBrief.resolved_reading).toBe(RESOLVED_READING);
  });

  test("the mis-resolution fixture is a genuine divergence: the two readings differ", () => {
    expect(misResolvedBrief.resolved_reading).not.toBe(misResolvedBrief.original_intent);
  });
});

describe("ac-32 clause 2 — the pair reaches the finalize dissent block", () => {
  test("engagement delivers the whole brief to the opponent host verbatim", async () => {
    const { delivered } = await engageAgainstRecordingHost();

    expect(delivered.length).toBe(1);
    expect(delivered[0]?.original_intent).toBe(ORIGINAL_INTENT);
    expect(delivered[0]?.resolved_reading).toBe(RESOLVED_READING);
  });

  test("the engaged outcome carries the comparison pair back to its caller", async () => {
    const { outcome } = await engageAgainstRecordingHost();

    expect(outcome.status).toBe("engaged");
    // Without this the caller has nothing to record and the mis-resolved
    // intent vanishes between engagement and finalize.
    expect(outcome.brief.original_intent).toBe(ORIGINAL_INTENT);
    expect(outcome.brief.resolved_reading).toBe(RESOLVED_READING);
    // The opponent's actual words come back — no engagement is reported empty.
    expect(outcome.text).toBe(OPPONENT_DISSENT_TEXT);
  });

  test("finalize on the engagement's own outcome is blocked by dissent and the block surfaces the pair verbatim", async () => {
    const { outcome } = await engageAgainstRecordingHost();

    // The dissent record is the engagement's return value; the test adds only
    // the human triage fields (impact/acknowledged). The brief is NOT
    // re-supplied here, so the pair must have survived the trip on its own.
    const store = createIntentStore();
    const result = finalize(
      {
        ...finalizeBase,
        intent_dissent: { ...outcome, impact: "high", acknowledged: false },
      },
      store,
    );

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("blocked_by_dissent");
    if (result.rejection.kind !== "blocked_by_dissent") throw new Error("unreachable");
    // The mis-resolved intent saw the conclusion: the block's input carries
    // the untouched comparison pair, not a summary and not one side only.
    expect(result.rejection.dissent_brief.original_intent).toBe(ORIGINAL_INTENT);
    expect(result.rejection.dissent_brief.resolved_reading).toBe(RESOLVED_READING);
    expect(listRecordedIntents(store)).toEqual([]);
  });
});

describe("ac-32 clause 3 — host-absent degrade preserved (regression guard)", () => {
  test("brief construction needs no host and does not throw", () => {
    expect(() =>
      buildIntentDissentBrief({
        original_intent: ORIGINAL_INTENT,
        resolved_reading: RESOLVED_READING,
      }),
    ).not.toThrow();
  });

  test("engagement with no host degrades to host_absent — no crash, no fabricated opponent words", async () => {
    const outcome = await engageIntentDissent({
      original_intent: ORIGINAL_INTENT,
      resolved_reading: RESOLVED_READING,
      host: null,
    });

    expect(outcome.status).toBe("host_absent");
    // No opponent ran, so there is no opponent text to report.
    expect((outcome as { text?: unknown }).text).toBeUndefined();
  });

  test("finalize runs to completion on the degrade record the engagement itself produced", async () => {
    const degraded = await engageIntentDissent({
      original_intent: ORIGINAL_INTENT,
      resolved_reading: RESOLVED_READING,
      host: null,
    });

    const store = createIntentStore();
    const result = finalize(
      { ...finalizeBase, intent_dissent: { ...degraded, acknowledged: false } },
      store,
    );

    expect(result.status).toBe("accepted");
    expect("rejection" in result).toBe(false);

    const recorded = listRecordedIntents(store);
    expect(recorded.length).toBe(1);
    expect(recorded[0]?.statement).toBe(RESOLVED_READING);
  });
});

describe("ac-32 clause 4 — INTENT_DISSENT_CONSTRAINT preserved (not a scope-expansion channel)", () => {
  test("the brief carries INTENT_DISSENT_CONSTRAINT verbatim", () => {
    expect(misResolvedBrief.constraint).toBe(INTENT_DISSENT_CONSTRAINT);
  });

  test("the constraint keeps its anti-scope-growth wording", () => {
    expect(INTENT_DISSENT_CONSTRAINT).toContain("Do NOT grow the scope");
    expect(INTENT_DISSENT_CONSTRAINT).toContain("SAME intent");
  });

  test("the constraint reaches the opponent host on the delivered brief, which parses clean under the schema", async () => {
    const { delivered } = await engageAgainstRecordingHost();

    // The anti-inflation guard only binds if the opponent is actually prompted
    // with it — a delegate handed only the pair can widen scope freely.
    expect(delivered[0]?.constraint).toBe(INTENT_DISSENT_CONSTRAINT);
    expect(intentDissentBriefSchema.safeParse(delivered[0]).success).toBe(true);
  });

  test("the builder's own output parses clean under the brief schema", () => {
    expect(intentDissentBriefSchema.safeParse(misResolvedBrief).success).toBe(true);
  });

  test("schema accepts the canonical pair brief (so the rejections below are not vacuous)", () => {
    const parsed = intentDissentBriefSchema.safeParse({
      original_intent: ORIGINAL_INTENT,
      resolved_reading: RESOLVED_READING,
      constraint: INTENT_DISSENT_CONSTRAINT,
    });

    expect(parsed.success).toBe(true);
  });

  test("schema rejects a brief with the constraint absent", () => {
    const parsed = intentDissentBriefSchema.safeParse({
      original_intent: ORIGINAL_INTENT,
      resolved_reading: RESOLVED_READING,
    });

    expect(parsed.success).toBe(false);
  });

  test("schema rejects a brief with the resolved reading absent", () => {
    const parsed = intentDissentBriefSchema.safeParse({
      original_intent: ORIGINAL_INTENT,
      constraint: INTENT_DISSENT_CONSTRAINT,
    });

    expect(parsed.success).toBe(false);
  });

  test("schema rejects a constraint rewritten into a scope-growing instruction", () => {
    const parsed = intentDissentBriefSchema.safeParse({
      original_intent: ORIGINAL_INTENT,
      resolved_reading: RESOLVED_READING,
      constraint: "Grow the scope freely: fold in every adjacent improvement you can imagine.",
    });

    expect(parsed.success).toBe(false);
  });

  test("schema rejects a scope-expansion payload smuggled beside the pair", () => {
    const parsed = intentDissentBriefSchema.safeParse({
      original_intent: ORIGINAL_INTENT,
      resolved_reading: RESOLVED_READING,
      constraint: INTENT_DISSENT_CONSTRAINT,
      scope_expansion: ["결제 실패 화면에 다크 모드 지원도 함께 추가한다."],
    });

    expect(parsed.success).toBe(false);
  });
});
