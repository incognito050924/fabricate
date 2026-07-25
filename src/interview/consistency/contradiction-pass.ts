import {
  type ConsistencyRecord,
  deriveConflictingInput,
  evaluateConflictingFloor,
} from "../readiness/conflicting-input";
import {
  type AnswerRecord,
  type ConflictEntry,
  type ConflictReport,
  buildConflictList,
} from "./conflict-list";

/**
 * The cross-answer contradiction pass, run once before the lock.
 *
 * Once, deliberately — not to a fixpoint. Re-running until the judge stops
 * reporting conflicts converges on a state where the judge is quiet, which is a
 * fact about the judge rather than about the answers, and it makes the conflict
 * count meaningless exactly when there are many conflicts to count.
 *
 * The judge sees the whole answer set at once, because a contradiction lives
 * between answers and is invisible to anything looking at one at a time. What
 * it reports is validated before it is carried: a pointer the answer set cannot
 * resolve is refused rather than laundered into the record.
 *
 * The lock is gated on the result, and the pass is an input of the lock call —
 * so a pass run afterwards cannot retroactively satisfy the ordering, and a
 * lock path reached without one records not-run and refuses.
 */

export type ContradictionJudge = (answers: readonly AnswerRecord[]) => readonly ConflictReport[];

export type ContradictionPassResult = {
  id: string;
  conflicts: ConflictEntry[];
};

let passCounter = 0;

export function runContradictionPass(input: {
  answers: readonly AnswerRecord[];
  judge: ContradictionJudge;
}): ContradictionPassResult {
  // One call. The judge is handed the whole set, verbatim.
  const reports = input.judge(input.answers);
  const conflicts = buildConflictList({ reports, answers: input.answers });
  passCounter += 1;
  return { id: `pass-${passCounter}`, conflicts };
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

export type LockPathOutcome = {
  locked: boolean;
  lock?: LockRecord;
  pass?: ContradictionPassResult;
  record: { consistency: ConsistencyRecord };
  journal: JournalEntry[];
  refusal?: { reason: "consistency-pass-not-run" | "conflicting-floor-blocked" };
};

export function enterLockPath(input: {
  statement: string;
  answers: readonly AnswerRecord[];
  judge?: ContradictionJudge;
}): LockPathOutcome {
  const journal: JournalEntry[] = [];

  if (!input.judge) {
    // Honest not-run (ADR-0018): no count, no lock, and a reason of its own.
    return {
      locked: false,
      record: { consistency: { status: "not-run" } },
      journal,
      refusal: { reason: "consistency-pass-not-run" },
    };
  }

  const pass = runContradictionPass({ answers: input.answers, judge: input.judge });
  journal.push({ kind: "contradiction-pass", ref: pass.id });

  // One consistency record, produced here and carried onward by reference, so
  // the lock cannot state a count the pass did not produce.
  const consistency = deriveConflictingInput(pass);
  const floor = evaluateConflictingFloor(consistency);
  if (floor.blocked) {
    return {
      locked: false,
      pass,
      record: { consistency },
      journal,
      refusal: { reason: floor.reason ?? "conflicting-floor-blocked" },
    };
  }

  const lock: LockRecord = { statement: input.statement, pass_ref: pass.id, consistency };
  journal.push({ kind: "lock", ref: pass.id });
  return { locked: true, lock, pass, record: { consistency }, journal };
}
