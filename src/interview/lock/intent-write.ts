import { type AcceptanceTestableResult, acceptanceTestable } from "./acceptance-testable";
import { confirmationRecordSchema, sha256Hex } from "./statement-digest";

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
 */

export interface IntentRecord {
  statement: string;
}

export interface IntentSink {
  write(record: IntentRecord): void;
}

export type WriteResult = { ok: true } | { ok: false; reason: string };

export interface WriteIntentInput {
  gate: AcceptanceTestableResult;
  confirmation: { statement_digest: string };
  sink: IntentSink;
}

/** Writes only on a gate PASS whose statement digest the user confirmed. */
export function writeIntent(input: WriteIntentInput): WriteResult {
  if (!input.gate.ok) {
    return { ok: false, reason: input.gate.reason };
  }

  const confirmation = confirmationRecordSchema.safeParse(input.confirmation);
  if (!confirmation.success) {
    return {
      ok: false,
      reason:
        "확정 기록에 statement_digest가 없거나 형식이 아니다 — 무엇에 동의했는지 결속되지 않는다",
    };
  }

  const statement = input.gate.pass.statement;
  if (confirmation.data.statement_digest !== sha256Hex(statement)) {
    return {
      ok: false,
      reason: "확정된 문장과 기록하려는 문장의 다이제스트가 다르다 — 확정 이후 문장이 바뀌었다",
    };
  }

  input.sink.write({ statement });
  return { ok: true };
}

export interface LockIntentInput {
  statement: string;
  confirmation: { statement_digest: string };
  sink: IntentSink;
}

/** Gate first, then write — the ordering is the point, so it lives in one place. */
export function lockIntent(input: LockIntentInput): WriteResult {
  return writeIntent({
    gate: acceptanceTestable(input.statement),
    confirmation: input.confirmation,
    sink: input.sink,
  });
}
