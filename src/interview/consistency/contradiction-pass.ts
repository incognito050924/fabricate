import {
  type JournalEntry,
  type LockRecord,
  type LockRefusalReason,
  enterLock,
} from "../lock/enter";
import type { ConsistencyRecord } from "../readiness/conflicting-input";
import type { AnswerRecord } from "./conflict-list";
import type { ContradictionJudge, ContradictionPassResult } from "./pass-run";

/**
 * The lock path as the contradiction pass sees it.
 *
 * The pass itself lives in `pass-run.ts` and the lock verdict is produced by
 * `lock/enter.ts`; what remains here is the projection — this door's shape, kept
 * because callers and the frozen contract hold it. It carries no judgment of its
 * own, so the ordering it documents (pass first, lock after, one consistency
 * record shared by both) is the ordering the single entry point performs, not a
 * second implementation that happens to agree today.
 */

export type { ContradictionJudge, ContradictionPassResult } from "./pass-run";
export { runContradictionPass } from "./pass-run";
export type { JournalEntry, LockRecord } from "../lock/enter";

export type LockPathOutcome = {
  locked: boolean;
  lock?: LockRecord;
  pass?: ContradictionPassResult;
  record: { consistency: ConsistencyRecord };
  journal: JournalEntry[];
  refusal?: { reason: LockRefusalReason };
};

export function enterLockPath(input: {
  statement: string;
  answers: readonly AnswerRecord[];
  judge?: ContradictionJudge;
}): LockPathOutcome {
  const outcome = enterLock(
    input.judge === undefined
      ? { statement: input.statement, answers: input.answers }
      : { statement: input.statement, answers: input.answers, judge: input.judge },
  );

  const projected: LockPathOutcome = {
    locked: outcome.locked,
    record: outcome.record,
    journal: outcome.journal,
  };
  if (outcome.pass) {
    projected.pass = outcome.pass;
  }
  if (outcome.lock) {
    projected.lock = outcome.lock;
  }
  if (outcome.refusal) {
    projected.refusal = { reason: outcome.refusal.reason };
  }
  return projected;
}
