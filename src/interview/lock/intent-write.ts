import type { AcceptanceTestableResult } from "./acceptance-testable";
import { type IntentSink, type LockOutcome, enterLock } from "./enter";

/**
 * The intent write path. Two gates stand in front of persistence and both fail
 * closed, so nothing reaches the sink unless both hold:
 *
 *   1. the statement is acceptance-testable — an untestable intent locked in is
 *      an intent nobody can later be held to;
 *   2. the confirmation's digest matches the statement being written — the user
 *      agreed to those exact bytes and not to whatever they became since.
 *
 * The two refusals are distinguishable by their reasons, so a digest mismatch
 * is never mistaken for a gate failure.
 *
 * Neither check is performed here any more. Both are stages of the single lock
 * entry point, and these two functions are the doors that hand it their evidence
 * — `lockIntent` a statement to gate, `writeIntent` a gate verdict it already
 * holds. Keeping the checks here as well would be a second copy free to drift.
 */

export type { IntentRecord, IntentSink } from "./enter";

export type WriteResult = { ok: true } | { ok: false; reason: string };

const REFUSED_WITHOUT_REASON = "잠금이 거부됐다 — 사유가 기록되지 않았다";

const projectWrite = (outcome: LockOutcome): WriteResult =>
  outcome.locked
    ? { ok: true }
    : {
        ok: false,
        reason: outcome.refusal?.detail ?? outcome.refusal?.reason ?? REFUSED_WITHOUT_REASON,
      };

export interface WriteIntentInput {
  gate: AcceptanceTestableResult;
  confirmation: { statement_digest: string };
  sink: IntentSink;
}

/** Writes only on a gate PASS whose statement digest the user confirmed. */
export function writeIntent(input: WriteIntentInput): WriteResult {
  return projectWrite(
    enterLock({ gate: input.gate, confirmation: input.confirmation, sink: input.sink }),
  );
}

export interface LockIntentInput {
  statement: string;
  confirmation: { statement_digest: string };
  sink: IntentSink;
}

/** Gate first, then write — the ordering is the point, so it lives in one place. */
export function lockIntent(input: LockIntentInput): WriteResult {
  return projectWrite(
    enterLock({
      statement: input.statement,
      confirmation: input.confirmation,
      sink: input.sink,
    }),
  );
}
