/**
 * A question built on an unsettled preunderstanding does not ask — it tells.
 * "When we move the login session to the database, what should expire?" has
 * already decided that "session" meant the login session, and whatever the user
 * answers will be read as agreement to that.
 *
 * So the gate reads the SHEET's state for each presupposed item, not the item's
 * identity: the same question is leading or not depending on whether the user
 * has since settled that preunderstanding. When it is leading, the original
 * text does not go out at all — a rewrite does, and the record keeps the
 * original verbatim so the substitution is auditable.
 *
 * Whether the question truly presupposes the item, and whether the rewrite
 * actually removed the presupposition, are human judgments this gate does not
 * make.
 */

import type { PreunderstandingItem } from "./sheet";

export type TaggedQuestion = {
  text: string;
  /** Sheet items this question takes for granted (tagged upstream). */
  presupposed_item_ids: string[];
};

export type LeadingQuestionRewrite = {
  original_question_text: string;
  rewritten_question_text: string;
  presupposed_item_ids: string[];
};

export type LeadingQuestionResult = {
  leading_question: boolean;
  /** What actually goes to the user — the rewrite whenever one was needed. */
  emitted_question_text: string;
  rewrite?: LeadingQuestionRewrite;
};

/** 확정 is the only settled state; exposed and refuted both leave it open. */
const isSettled = (item: PreunderstandingItem | undefined): boolean => item?.state === "확정";

function rewriteWithoutPresupposition(question: TaggedQuestion, unsettledIds: string[]): string {
  return [
    `아직 확정되지 않은 선이해(${unsettledIds.join(", ")})를 먼저 확인하겠습니다.`,
    `그 전제를 빼고 여쭙니다: ${question.text}`,
  ].join(" ");
}

export function gateLeadingQuestion(input: {
  question: TaggedQuestion;
  sheet: readonly PreunderstandingItem[];
}): LeadingQuestionResult {
  const byId = new Map(input.sheet.map((item) => [item.id, item]));
  const unsettledIds = input.question.presupposed_item_ids.filter((id) => !isSettled(byId.get(id)));

  if (unsettledIds.length === 0) {
    return { leading_question: false, emitted_question_text: input.question.text };
  }

  const rewritten_question_text = rewriteWithoutPresupposition(input.question, unsettledIds);
  return {
    leading_question: true,
    emitted_question_text: rewritten_question_text,
    rewrite: {
      original_question_text: input.question.text,
      rewritten_question_text,
      presupposed_item_ids: [...unsettledIds],
    },
  };
}
