import { z } from "zod";

/**
 * Where a user-judged predicate's verdict is *held*. A predicate whose judge is
 * the user cannot be satisfied by any amount of machine evidence — only by a
 * recorded verdict. Absence of a record therefore means unverified, never
 * satisfied, and a recorded 'unsatisfied' is read as such rather than being
 * counted as "the user was asked" (ac-4 clause 4).
 */

export const userVerdict = z.enum(["satisfied", "unsatisfied"]);
export type UserVerdict = z.infer<typeof userVerdict>;

export const userJudgmentRecordSchema = z
  .object({
    predicate_id: z.string().min(1),
    verdict: userVerdict,
    judged_at: z.string().datetime(),
  })
  .strict();
export type UserJudgmentRecord = z.infer<typeof userJudgmentRecordSchema>;
