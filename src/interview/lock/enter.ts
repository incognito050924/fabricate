import type { DimensionNode } from "../completeness/fragment-mapping";
import type { AnswerRecord } from "../consistency/conflict-list";
import {
  type ContradictionJudge,
  type ContradictionPassResult,
  runContradictionPass,
} from "../consistency/pass-run";
import {
  type ConsistencyRecord,
  deriveConflictingInput,
  evaluateConflictingFloor,
} from "../readiness/conflicting-input";
import { blockingSeedIds } from "../readiness/seed-block";
import { type AcceptanceTestableResult, acceptanceTestable } from "./acceptance-testable";
import { confirmationRecordSchema, sha256Hex } from "./statement-digest";

/**
 * The one place a lock verdict is produced.
 *
 * Before this existed the repo had several doors into the lock, each with its
 * own idea of what stands in front of it, so a statement refused at one door
 * was locked at another. The doors are still there — their signatures are what
 * callers and frozen tests hold — but they no longer judge: they hand their
 * evidence to `enterLock` and project the single outcome back into their own
 * shape.
 *
 * Each stage fires on its own evidence. A caller that supplies no answer set is
 * not claiming a clean consistency pass — it is claiming nothing, so the pass is
 * recorded as not-run and the call proceeds. A caller that DOES supply the
 * evidence gets the stage fail-closed: answers without a judge refuse, a sink
 * without a testable statement refuses, a confirmation whose digest does not
 * match refuses. Absence records; presence gates.
 *
 * What this does NOT do is make every path run every check. A lock reached
 * without answers still locks with `status: "not-run"` on its record — honest
 * (ADR-0018) but not blocked. Turning that into a refusal would break frozen
 * tests that lock without an answer set at all.
 */

export type IntentRecord = { statement: string };

export interface IntentSink {
  write(record: IntentRecord): void;
}

export type JournalEntry = {
  kind: "contradiction-pass" | "lock";
  ref: string;
};

export type LockRecord = {
  statement: string;
  pass_ref: string;
  consistency: ConsistencyRecord;
};

export type LockRefusalReason =
  | "no-evidence"
  | "evidence-without-a-stage"
  | "readiness-blocked"
  | "consistency-pass-not-run"
  | "conflicting-floor-blocked"
  | "acceptance-testable"
  | "digest-mismatch";

/** Everything a caller can put on the table. What is absent is not asserted. */
export type LockEvidence = {
  dimensions?: readonly DimensionNode[];
  answers?: readonly AnswerRecord[];
  judge?: ContradictionJudge;
  statement?: string;
  /** A gate verdict the caller already holds — used instead of re-running it. */
  gate?: AcceptanceTestableResult;
  confirmation?: { statement_digest: string };
  sink?: IntentSink;
};

export type LockOutcome = {
  locked: boolean;
  blockers: string[];
  record: { consistency: ConsistencyRecord };
  journal: JournalEntry[];
  pass?: ContradictionPassResult;
  lock?: LockRecord;
  intent?: { dimensions: DimensionNode[] };
  refusal?: { reason: LockRefusalReason; detail?: string };
};

const NOT_RUN: ConsistencyRecord = { status: "not-run" };

/** The lock journal still names its consistency evidence when there was none. */
const NO_PASS_REF = "consistency:not-run";

const MISSING_DIGEST_REASON =
  "확정 기록에 statement_digest가 없거나 형식이 아니다 — 무엇에 동의했는지 결속되지 않는다";
const DIGEST_MISMATCH_REASON =
  "확정된 문장과 기록하려는 문장의 다이제스트가 다르다 — 확정 이후 문장이 바뀌었다";

type RefusalContext = {
  reason: LockRefusalReason;
  consistency: ConsistencyRecord;
  journal: JournalEntry[];
  blockers?: string[] | undefined;
  pass?: ContradictionPassResult | undefined;
  detail?: string | undefined;
};

const refuse = (context: RefusalContext): LockOutcome => {
  const outcome: LockOutcome = {
    locked: false,
    blockers: context.blockers ?? [],
    record: { consistency: context.consistency },
    journal: context.journal,
    refusal:
      context.detail === undefined
        ? { reason: context.reason }
        : { reason: context.reason, detail: context.detail },
  };
  if (context.pass) {
    outcome.pass = context.pass;
  }
  return outcome;
};

/** Did the caller put anything at all on the table? */
const hasAnyEvidence = (evidence: LockEvidence): boolean =>
  evidence.dimensions !== undefined ||
  evidence.answers !== undefined ||
  evidence.judge !== undefined ||
  evidence.statement !== undefined ||
  evidence.gate !== undefined ||
  evidence.confirmation !== undefined ||
  evidence.sink !== undefined;

/**
 * Evidence only stage 3 can read, with stage 3 switched off. A gate verdict and
 * a confirmation record are about writing; without a sink nothing reads either,
 * so they would be carried past every check and end at the lock — including a
 * gate verdict that says, in as many words, that this statement was refused.
 */
const hasWriteEvidenceWithoutSink = (evidence: LockEvidence): boolean =>
  evidence.sink === undefined &&
  (evidence.gate !== undefined || evidence.confirmation !== undefined);

type WriteRefusal = { reason: LockRefusalReason; detail: string };

/**
 * Gate, then bind, then write. The order is the point: an untestable statement
 * never reaches the digest check, and an unbound one never reaches the sink.
 */
const attemptWrite = (
  gate: AcceptanceTestableResult,
  confirmation: { statement_digest: string } | undefined,
  sink: IntentSink,
): WriteRefusal | null => {
  if (!gate.ok) {
    return { reason: "acceptance-testable", detail: gate.reason };
  }
  const parsed = confirmationRecordSchema.safeParse(confirmation);
  if (!parsed.success) {
    return { reason: "digest-mismatch", detail: MISSING_DIGEST_REASON };
  }
  if (parsed.data.statement_digest !== sha256Hex(gate.pass.statement)) {
    return { reason: "digest-mismatch", detail: DIGEST_MISMATCH_REASON };
  }
  sink.write({ statement: gate.pass.statement });
  return null;
};

/**
 * The single lock entry point — every intent-lock verdict is born here. (Locks
 * over other subjects, such as the leaf gate in `mold/example-record.ts`, are a
 * different subject and are not this function's business.)
 */
export function enterLock(evidence: LockEvidence): LockOutcome {
  const journal: JournalEntry[] = [];

  // 0. Nothing on the table at all. Each stage below fires on its own evidence,
  //    so a call carrying none skips every one of them — and a lock granted for
  //    having asserted nothing is the cheapest way through the only door there
  //    is. An empty collection is still evidence; no collection is not.
  if (!hasAnyEvidence(evidence)) {
    return refuse({ reason: "no-evidence", consistency: NOT_RUN, journal });
  }

  // 0b. Evidence whose only reader is a stage that will not fire. The caller
  //     meant to write and did not say where — and a refused gate verdict
  //     handed over this way would otherwise buy a lock outright.
  if (hasWriteEvidenceWithoutSink(evidence)) {
    return refuse({ reason: "evidence-without-a-stage", consistency: NOT_RUN, journal });
  }

  // 1. Readiness — fires when a dimension structure is on the table.
  const blockers = evidence.dimensions ? blockingSeedIds(evidence.dimensions) : [];
  if (blockers.length > 0) {
    return refuse({ reason: "readiness-blocked", consistency: NOT_RUN, journal, blockers });
  }

  // 2. Cross-answer consistency — fires when an answer set or a judge is on the
  //    table. Answers without a judge is a claim with nothing behind it.
  let pass: ContradictionPassResult | undefined;
  let consistency: ConsistencyRecord = NOT_RUN;
  if (evidence.answers !== undefined || evidence.judge !== undefined) {
    if (evidence.judge === undefined) {
      return refuse({ reason: "consistency-pass-not-run", consistency, journal });
    }
    pass = runContradictionPass({ answers: evidence.answers ?? [], judge: evidence.judge });
    journal.push({ kind: "contradiction-pass", ref: pass.id });
    // One consistency record, produced here and carried onward by reference, so
    // the lock cannot state a count the pass did not produce.
    consistency = deriveConflictingInput(pass);
    const floor = evaluateConflictingFloor(consistency);
    if (floor.blocked) {
      return refuse({
        reason: floor.reason ?? "conflicting-floor-blocked",
        consistency,
        journal,
        pass,
      });
    }
  }

  // 3. Statement gate, digest binding, write — fires when a sink is on the
  //    table, i.e. when a statement is actually being committed. The gate is
  //    not consulted otherwise: a verdict computed and then discarded would
  //    make this function one that knew of a refusal and locked anyway.
  let statement = evidence.statement ?? "";
  if (evidence.sink) {
    const gate = evidence.gate ?? acceptanceTestable(statement);
    const refusal = attemptWrite(gate, evidence.confirmation, evidence.sink);
    if (refusal) {
      return refuse({
        reason: refusal.reason,
        consistency,
        journal,
        pass,
        detail: refusal.detail,
      });
    }
    if (gate.ok) {
      statement = gate.pass.statement;
    }
  }

  journal.push({ kind: "lock", ref: pass?.id ?? NO_PASS_REF });
  const outcome: LockOutcome = {
    locked: true,
    blockers: [],
    record: { consistency },
    journal,
    intent: { dimensions: [...(evidence.dimensions ?? [])] },
  };
  if (pass) {
    outcome.pass = pass;
    outcome.lock = { statement, pass_ref: pass.id, consistency };
  }
  return outcome;
}
