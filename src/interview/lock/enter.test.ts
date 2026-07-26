import { describe, expect, test } from "bun:test";
import { acceptanceTestable } from "./acceptance-testable";
import { enterLock } from "./enter";
import { sha256Hex } from "./statement-digest";

/**
 * F1 — the default of the single lock entry point is refusal, not the lock.
 *
 * Every stage here fires on its own evidence, which means a call carrying no
 * evidence at all skipped every stage and arrived at the tail. Locking there
 * would make "nobody put anything on the table" the easiest way through the one
 * door the whole repo is supposed to funnel into — the exact shape
 * `seed-block.ts` refuses one directory away ("silence is not a resolution").
 *
 * Absence of a particular kind of evidence still only means that stage does not
 * fire (a caller supplying an empty dimension list HAS supplied dimensions).
 * Absence of every kind is a different fact, and it is fail-closed.
 */

describe("a call carrying no evidence at all is refused", () => {
  test("enterLock({}) does not lock", () => {
    const outcome = enterLock({});
    expect(outcome.locked).toBe(false);
    expect(outcome.intent).toBeUndefined();
    expect(outcome.lock).toBeUndefined();
    expect(outcome.refusal?.reason).toBe("no-evidence");
  });

  test("the refusal leaves no lock entry in the journal", () => {
    const outcome = enterLock({});
    expect(outcome.journal).toEqual([]);
  });

  test("the refusal records the consistency pass as not-run, never as a verified zero", () => {
    expect(enterLock({}).record.consistency).toEqual({ status: "not-run" });
  });
});

/**
 * F1e — evidence that fires no stage is a caller who meant to write.
 *
 * A gate verdict and a confirmation record only mean anything in front of a
 * sink: stage 3 is the only stage that reads either. So a call carrying one and
 * no sink runs zero checks over it and arrives at the tail — and the worst shape
 * of that is a caller handing over a gate verdict that already reads REFUSED and
 * being granted the lock for it. The same shape catches the plainer accident of
 * a write attempt that forgot to say where to write.
 *
 * A statement without a sink is a different case and stays allowed: the lock
 * path carries the statement into its record without writing it anywhere.
 */
describe("write evidence with no sink to write to is refused", () => {
  const REFUSED_GATE = acceptanceTestable("시스템이 동작한다");
  const PASSING_GATE = acceptanceTestable("저장 버튼을 누르면 목록에 새 항목이 1건 표시된다");

  test("the fixture gates are what this test thinks they are", () => {
    expect(REFUSED_GATE.ok).toBe(false);
    expect(PASSING_GATE.ok).toBe(true);
  });

  test("a gate verdict that says REFUSED never yields a lock", () => {
    const outcome = enterLock({ gate: REFUSED_GATE });
    expect(outcome.locked).toBe(false);
    expect(outcome.refusal?.reason).toBe("evidence-without-a-stage");
  });

  test("even a PASSING gate with nowhere to write is refused, not locked", () => {
    const outcome = enterLock({ gate: PASSING_GATE });
    expect(outcome.locked).toBe(false);
    expect(outcome.refusal?.reason).toBe("evidence-without-a-stage");
  });

  test("a write attempt that forgot the sink does not become a quiet lock", () => {
    const statement = "저장 버튼을 누르면 목록에 새 항목이 1건 표시된다";
    const outcome = enterLock({
      statement,
      confirmation: { statement_digest: sha256Hex(statement) },
    });
    expect(outcome.locked).toBe(false);
    expect(outcome.refusal?.reason).toBe("evidence-without-a-stage");
  });

  test("a statement alone still carries into the lock path without a sink", () => {
    const outcome = enterLock({ statement: "anything at all" });
    expect(outcome.locked).toBe(true);
  });
});

describe("an empty collection is evidence — the caller did put it on the table", () => {
  test("an empty dimension list is a readiness claim with nothing blocking it", () => {
    const outcome = enterLock({ dimensions: [] });
    expect(outcome.locked).toBe(true);
    expect(outcome.intent).toEqual({ dimensions: [] });
  });

  test("an empty answer set without a judge is still fail-closed on the pass", () => {
    const outcome = enterLock({ answers: [] });
    expect(outcome.locked).toBe(false);
    expect(outcome.refusal?.reason).toBe("consistency-pass-not-run");
  });
});
