import { z } from "zod";

/**
 * Per-round question records. The mode is a required field, and that is the
 * whole enforcement: "the mode is recorded every round" cannot rest on
 * remembering to, so a round with no mode does not parse at all. The vocabulary
 * is fixed at three — open-ended, boundary-label, yes/no — because a fourth
 * informal label would make the distribution audit unreadable.
 *
 * Whether a given question really is open-ended is a human judgment. This
 * schema fixes the label set, not the labeling.
 */

export const questionMode = z.enum(["개방형", "경계라벨", "예아니오"]);
export type QuestionMode = z.infer<typeof questionMode>;

export const questionRoundRecordSchema = z
  .object({
    round_index: z.number().int().min(1),
    question_text: z.string().min(1),
    question_mode: questionMode,
  })
  .strict();
export type QuestionRoundRecord = z.infer<typeof questionRoundRecordSchema>;

export function parseQuestionRoundRecord(raw: unknown): QuestionRoundRecord {
  return questionRoundRecordSchema.parse(raw);
}
