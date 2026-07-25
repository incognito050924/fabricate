/**
 * The conflict list — pointers, not prose. A conflict entry names the answer
 * records that contradict each other by id; copying the answers into the entry
 * would fork the text, and the fork is what people then read instead of the
 * answer itself.
 *
 * Two guards make a pointer list mean something. A pointer that resolves to no
 * answer record is refused rather than carried (an unresolvable conflict is
 * unreviewable), and an entry with fewer than two pointers is refused too —
 * a contradiction is a relation, and one answer alone cannot be in one.
 *
 * Whether the two answers really contradict is the judge's call, not this
 * module's.
 */

export type AnswerRecord = {
  id: string;
  question: string;
  answer: string;
};

export type ConflictReport = {
  answer_ids: string[];
};

export type ConflictEntry = {
  answer_ids: string[];
};

export class UnresolvedConflictPointerError extends Error {
  constructor(answerId: string) {
    super(`실재하지 않는 답변 레코드를 가리키는 conflict 포인터: ${answerId}`);
    this.name = "UnresolvedConflictPointerError";
  }
}

export class IncompleteConflictPairError extends Error {
  constructor(answerIds: string[]) {
    super(`모순은 관계다 — 포인터가 둘 미만인 conflict 엔트리: ${answerIds.join(", ")}`);
    this.name = "IncompleteConflictPairError";
  }
}

export function buildConflictList(input: {
  reports: readonly ConflictReport[];
  answers: readonly AnswerRecord[];
}): ConflictEntry[] {
  const knownIds = new Set(input.answers.map((answer) => answer.id));

  return input.reports.map((report) => {
    const answer_ids = [...report.answer_ids];
    for (const answerId of answer_ids) {
      if (!knownIds.has(answerId)) {
        throw new UnresolvedConflictPointerError(answerId);
      }
    }
    if (answer_ids.length < 2) {
      throw new IncompleteConflictPairError(answer_ids);
    }
    return { answer_ids };
  });
}
