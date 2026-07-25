/**
 * Question and answer are recorded as one atom. An answer stored on its own
 * becomes a sentence whose question is remembered rather than recorded, and the
 * remembering drifts: the answer stays fixed while the question it answered
 * quietly becomes the question someone later assumes was asked.
 *
 * So the record carries both verbatims, and the question text is resolved from
 * the asked-question store by id — never taken from the most recent question,
 * which is the same shortcut in a different disguise. Either both land or
 * nothing does; a rejected write leaves the store untouched.
 */

export type AskedQuestion = {
  id: string;
  text: string;
  asked_at: string;
};

export type AtomicPairRecord = {
  question_id: string;
  /** The question as it was actually asked. */
  question_text: string;
  /** The answer as the user actually gave it. */
  answer_text: string;
  answered_at: string;
};

export type PairStore = {
  asked_questions: AskedQuestion[];
  pairs: AtomicPairRecord[];
};

export type AtomicPairInput = {
  question_id: string;
  answer_text: string;
  answered_at: string;
};

export type RecordAtomicPairResult =
  | { accepted: true; store: PairStore; record: AtomicPairRecord }
  | { accepted: false; reason: string };

const isBlank = (value: unknown): boolean => typeof value !== "string" || value.trim().length === 0;

export function recordAtomicPair(store: PairStore, input: AtomicPairInput): RecordAtomicPairResult {
  if (isBlank(input.question_id)) {
    return { accepted: false, reason: "질문 결속 없는 답은 기록하지 않는다" };
  }

  const question = store.asked_questions.find((asked) => asked.id === input.question_id);
  if (!question) {
    return { accepted: false, reason: `묻지 않은 질문 id다: ${input.question_id}` };
  }

  if (isBlank(input.answer_text)) {
    return { accepted: false, reason: "답 원문이 비어 있다 — 쌍을 완결할 수 없다" };
  }

  const record: AtomicPairRecord = {
    question_id: question.id,
    question_text: question.text,
    answer_text: input.answer_text,
    answered_at: input.answered_at,
  };

  return {
    accepted: true,
    store: { asked_questions: store.asked_questions, pairs: [...store.pairs, record] },
    record,
  };
}
