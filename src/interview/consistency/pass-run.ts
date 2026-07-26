import {
  type AnswerRecord,
  type ConflictEntry,
  type ConflictReport,
  buildConflictList,
} from "./conflict-list";

/**
 * Running the cross-answer contradiction pass — the single producer of pass
 * results, and therefore of pass ids.
 *
 * It sits below the lock entry point rather than beside it: the entry point
 * needs the pass, the pass must not need the entry point, and one counter must
 * hand out the ids so that two pass results can never claim the same identity.
 *
 * Once, deliberately — not to a fixpoint. Re-running until the judge stops
 * reporting conflicts converges on a state where the judge is quiet, which is a
 * fact about the judge rather than about the answers.
 *
 * The judge sees the whole answer set at once, because a contradiction lives
 * between answers and is invisible to anything looking at one at a time. What
 * it reports is validated before it is carried: a pointer the answer set cannot
 * resolve is refused rather than laundered into the record.
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
