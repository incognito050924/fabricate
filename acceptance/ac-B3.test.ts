/**
 * ac-B3 acceptance — Grice implicature ledger (ac-12/U2 extension).
 * Frozen red: src/interview/implicature/ledger.ts and
 * src/interview/implicature/decision-set-gate.ts do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-B3.json), covered clauses:
 *  (1) ledger attachment — a fixture turn tagged as a substantive utterance
 *      parses into a record carrying the candidate implicature ledger field
 *      implicature_ledger[] (array required; an empty array is accepted when
 *      no candidate implicature exists, but field absence is a parse
 *      rejection), with fixture entries passed through verbatim
 *  (2) ledger enum — each ledger entry's state admits exactly the three
 *      values {확정, 미확정, 취소됨}; an entry with a missing state or an
 *      out-of-enum state is rejected by zod parsing (negative fixtures),
 *      including when such an entry is nested inside a turn record
 *  (3) unconfirmed → decision-set block — admitting a state='미확정'
 *      implicature into the decision set returns a rejection variant and
 *      leaves the decision set unchanged, while the contrast fixture's
 *      state='확정' implicature passes the same gate and enters the
 *      decision set (2-state contrast fixtures)
 *  (4) fact-promotion block scenario ('…라는 뜻은 아니에요') — a natural
 *      implicature sits on the ledger as state='미확정', its decision-set
 *      admission attempt is rejected by the clause-3 gate, the user's
 *      cancellation utterance transitions exactly that entry to
 *      state='취소됨' (attribution fixture-fixed) while the rest of the
 *      ledger is left verbatim, and re-deriving the decision set from the
 *      cancelled entry after the transition still rejects it and still
 *      leaves the implicature absent — premature fact-promotion is blocked,
 *      keeping the Gricean cancellability path alive
 *
 * Residual (NOT tested here, per row residual):
 *  - Implicature classification — which candidate implicatures go on the
 *    ledger, and whether each entry's state label (확정/미확정/취소됨) is
 *    right for the actual discourse, is not mechanized; the fixtures fix the
 *    ledger and its labels, and only enum enforcement and gate routing are
 *    asserted.
 *  - Substantive-utterance identification — which turns bear the ledger
 *    obligation is fixed by the fixture tag; whether that identification is
 *    right in a real session is not closed by this criterion.
 *  - Cancellation-utterance interpretation — which implicature an utterance
 *    like '…라는 뜻은 아니에요' actually cancels is part of the
 *    classification residual; the test asserts decision-set absence on top
 *    of the fixture-fixed 취소됨 transition.
 */
import { describe, expect, test } from "bun:test";
import { admitToDecisionSet } from "../src/interview/implicature/decision-set-gate";
import {
  cancelImplicature,
  implicatureLedgerEntrySchema,
  substantiveTurnRecordSchema,
} from "../src/interview/implicature/ledger";

// ---------------------------------------------------------------------------
// Fixtures. Which implicatures are on the ledger and their state labels are
// residual (human-judged); the fixtures fix them, the test asserts only enum
// enforcement and gate routing.
// ---------------------------------------------------------------------------

const IMPLICATURE_STATES = ["확정", "미확정", "취소됨"] as const;

// The user's request naturally implicates that performance optimization is
// part of the job — candidate implicature, not yet confirmed by the user.
const UNCONFIRMED_ENTRY = {
  id: "imp-perf-included",
  content: "이 요청에는 성능 최적화까지 포함된다",
  state: "미확정",
} as const;

const CONFIRMED_ENTRY = {
  id: "imp-delete-originals",
  content: "옮긴 뒤 원본 위치의 임시 파일은 지워도 된다",
  state: "확정",
} as const;

// A second candidate implicature riding on the same turn. The cancellation
// utterance does not target it, so it must survive the transition untouched.
const OTHER_UNCONFIRMED_ENTRY = {
  id: "imp-notify-on-done",
  content: "옮기기가 끝나면 알림을 보내야 한다",
  state: "미확정",
} as const;

// A previously admitted, user-confirmed decision already in the decision set.
const PRIOR_DECISION = {
  id: "imp-daily-schedule",
  content: "옮기기는 매일 자정에 반복 실행된다",
  state: "확정",
} as const;

function makeSubstantiveTurn(ledger: readonly unknown[]) {
  return {
    turn_id: "t-substantive-1",
    substantive: true, // fixture tag: this turn is a substantive utterance
    utterance: "임시 파일부터 옮겨 주세요. 성능은 나중에 볼게요.",
    implicature_ledger: [...ledger],
  };
}

const withoutField = (record: Record<string, unknown>, field: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== field));

// ---------------------------------------------------------------------------
// Clause 1 — substantive-turn records carry implicature_ledger[]
// ---------------------------------------------------------------------------

describe("ac-B3 clause 1 — substantive-turn records carry implicature_ledger[] (array required)", () => {
  test("a substantive fixture turn with candidate implicatures parses and carries the ledger array", () => {
    const parsed = substantiveTurnRecordSchema.safeParse(
      makeSubstantiveTurn([CONFIRMED_ENTRY, UNCONFIRMED_ENTRY]),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the substantive turn record to parse");
    expect(Array.isArray(parsed.data.implicature_ledger)).toBe(true);
    // Fixture entries pass through verbatim — id, content, and state untouched.
    expect(parsed.data.implicature_ledger).toEqual([CONFIRMED_ENTRY, UNCONFIRMED_ENTRY]);
  });

  test("an empty ledger array is accepted when no candidate implicature exists", () => {
    const parsed = substantiveTurnRecordSchema.safeParse(makeSubstantiveTurn([]));
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the empty-ledger turn record to parse");
    expect(parsed.data.implicature_ledger).toEqual([]);
  });

  test("ledger field absence is a parse rejection (array required, not optional)", () => {
    const record = withoutField(makeSubstantiveTurn([]), "implicature_ledger");
    expect(substantiveTurnRecordSchema.safeParse(record).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Clause 2 — ledger entry state enum {확정, 미확정, 취소됨} enforced by zod
// ---------------------------------------------------------------------------

describe("ac-B3 clause 2 — ledger entry state admits exactly {확정, 미확정, 취소됨} (zod)", () => {
  for (const state of IMPLICATURE_STATES) {
    test(`an entry with state '${state}' parses`, () => {
      const parsed = implicatureLedgerEntrySchema.safeParse({
        id: "imp-enum-positive",
        content: "후보 함축 내용",
        state,
      });
      expect(parsed.success).toBe(true);
    });
  }

  test("an entry without a state is rejected at parse time", () => {
    const entry = withoutField({ ...UNCONFIRMED_ENTRY }, "state");
    expect(implicatureLedgerEntrySchema.safeParse(entry).success).toBe(false);
  });

  for (const bogus of ["보류", "pending", ""]) {
    test(`an entry with out-of-enum state '${bogus}' is rejected at parse time`, () => {
      const parsed = implicatureLedgerEntrySchema.safeParse({
        id: "imp-enum-negative",
        content: "후보 함축 내용",
        state: bogus,
      });
      expect(parsed.success).toBe(false);
    });
  }

  test("a turn record whose ledger holds an out-of-enum entry is rejected as a whole", () => {
    const record = makeSubstantiveTurn([{ ...UNCONFIRMED_ENTRY, state: "보류" }]);
    expect(substantiveTurnRecordSchema.safeParse(record).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Clause 3 — unconfirmed implicatures are blocked from the decision set;
// confirmed implicatures pass the same gate (2-state contrast fixtures)
// ---------------------------------------------------------------------------

describe("ac-B3 clause 3 — the gate blocks state='미확정' and passes state='확정'", () => {
  test("admitting a state='미확정' implicature returns a rejection variant", () => {
    const result = admitToDecisionSet([], UNCONFIRMED_ENTRY);
    expect(result.admitted).toBe(false);
    if (result.admitted) throw new Error("expected the gate to reject an unconfirmed implicature");
    expect(result.rejection.reason).toBe("unconfirmed_implicature");
    expect(result.rejection.entry_id).toBe(UNCONFIRMED_ENTRY.id);
  });

  test("the rejected admission leaves the decision set unchanged", () => {
    const initial = [PRIOR_DECISION];
    const before = structuredClone(initial);
    const result = admitToDecisionSet(initial, UNCONFIRMED_ENTRY);
    expect(result.admitted).toBe(false);
    // The returned decision set is exactly the pre-attempt decision set…
    expect(result.decision_set).toEqual(before);
    // …and the input decision set was not mutated in place either.
    expect(initial).toEqual(before);
    expect(result.decision_set.some((d: { id: string }) => d.id === UNCONFIRMED_ENTRY.id)).toBe(
      false,
    );
  });

  test("contrast fixture: a state='확정' implicature passes the same gate into the decision set", () => {
    const result = admitToDecisionSet([PRIOR_DECISION], CONFIRMED_ENTRY);
    expect(result.admitted).toBe(true);
    if (!result.admitted) throw new Error("expected the gate to admit a confirmed implicature");
    expect(result.decision_set.some((d: { id: string }) => d.id === CONFIRMED_ENTRY.id)).toBe(true);
    // Admission is additive — the prior decision survives.
    expect(result.decision_set.some((d: { id: string }) => d.id === PRIOR_DECISION.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Clause 4 — '…라는 뜻은 아니에요': premature fact-promotion stays blocked
// through the cancellation transition (Gricean cancellability path alive)
// ---------------------------------------------------------------------------

describe("ac-B3 clause 4 — cancellation keeps the natural implicature out of the decision set", () => {
  // Ledger fixed by fixture: two candidate implicatures sit as 미확정 next to
  // an already-confirmed one. The cancellation utterance targets exactly one.
  const makeLedger = () => [CONFIRMED_ENTRY, UNCONFIRMED_ENTRY, OTHER_UNCONFIRMED_ENTRY];

  test("cancellation transitions only the named entry and leaves the rest of the ledger verbatim", () => {
    const ledger = makeLedger();
    const before = structuredClone(ledger);

    const cancelledLedger = cancelImplicature(ledger, UNCONFIRMED_ENTRY.id);

    // Order and membership are preserved — cancellation is a state transition,
    // not a rewrite of the ledger.
    expect(cancelledLedger.map((entry: { id: string }) => entry.id)).toEqual([
      CONFIRMED_ENTRY.id,
      UNCONFIRMED_ENTRY.id,
      OTHER_UNCONFIRMED_ENTRY.id,
    ]);
    // The named entry, and only it, moved to 취소됨; id and content verbatim.
    expect(cancelledLedger[1]).toEqual({ ...UNCONFIRMED_ENTRY, state: "취소됨" });
    // The other entries are byte-for-byte what the fixture put there — the
    // untargeted 미확정 candidate is still 미확정.
    expect(cancelledLedger[0]).toEqual(CONFIRMED_ENTRY);
    expect(cancelledLedger[2]).toEqual(OTHER_UNCONFIRMED_ENTRY);
    expect(cancelledLedger[2].state).toBe("미확정");
    // The caller's ledger is not mutated in place.
    expect(ledger).toEqual(before);
  });

  test("the cancelled ledger still parses — 취소됨 is an in-enum state", () => {
    const cancelledLedger = cancelImplicature(makeLedger(), UNCONFIRMED_ENTRY.id);
    const parsed = substantiveTurnRecordSchema.safeParse(makeSubstantiveTurn(cancelledLedger));
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the cancelled-ledger turn record to parse");
    expect(parsed.data.implicature_ledger).toEqual([
      CONFIRMED_ENTRY,
      { ...UNCONFIRMED_ENTRY, state: "취소됨" },
      OTHER_UNCONFIRMED_ENTRY,
    ]);
  });

  test("an unconfirmed natural implicature never reaches the decision set across its cancellation", () => {
    // Admission attempt while 미확정 — rejected by the clause-3 gate, so the
    // implicature was never promoted to fact.
    const attempt = admitToDecisionSet([PRIOR_DECISION], UNCONFIRMED_ENTRY);
    expect(attempt.admitted).toBe(false);
    if (attempt.admitted) throw new Error("expected the 미확정 admission attempt to be rejected");
    expect(attempt.rejection.reason).toBe("unconfirmed_implicature");
    expect(attempt.decision_set.map((d: { id: string }) => d.id)).toEqual([PRIOR_DECISION.id]);

    // The user cancels: "성능 최적화까지 해 달라는 뜻은 아니에요." Which
    // implicature that utterance cancels is fixture-fixed (residual) — the
    // fixture attributes it to UNCONFIRMED_ENTRY.
    const cancelledLedger = cancelImplicature(makeLedger(), UNCONFIRMED_ENTRY.id);
    const cancelled = cancelledLedger.find(
      (entry: { id: string }) => entry.id === UNCONFIRMED_ENTRY.id,
    );
    if (!cancelled) throw new Error("expected the cancelled entry to remain on the ledger");
    expect(cancelled.state).toBe("취소됨");
    // Cancellation transitions state only — the candidate content is
    // preserved verbatim on the ledger.
    expect(cancelled.content).toBe(UNCONFIRMED_ENTRY.content);

    // Decisive: re-derive the decision set AFTER the 취소됨 transition by
    // running the cancelled entry through the very same gate. A cancelled
    // implicature is not a fact either — it stays out.
    const afterCancellation = admitToDecisionSet(attempt.decision_set, cancelled);
    expect(afterCancellation.admitted).toBe(false);
    if (afterCancellation.admitted)
      throw new Error("expected the 취소됨 implicature to be refused admission");
    expect(afterCancellation.rejection.entry_id).toBe(UNCONFIRMED_ENTRY.id);
    expect(
      afterCancellation.decision_set.some((d: { id: string }) => d.id === UNCONFIRMED_ENTRY.id),
    ).toBe(false);
    // The prior confirmed decision is the only thing in the decision set —
    // the whole episode added nothing.
    expect(afterCancellation.decision_set.map((d: { id: string }) => d.id)).toEqual([
      PRIOR_DECISION.id,
    ]);
  });
});
