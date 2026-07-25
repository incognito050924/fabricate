import { z } from "zod";

/**
 * Where an oracle-judged predicate's satisfaction is *held*. The judgment lives
 * in this record, not in the gate that reads it: whoever ran the verification
 * means writes what they observed, and the gate later only reports it. That
 * split is what keeps the gate a pure reader (ac-4 clause 5).
 */

export const oracleSatisfactionRecordSchema = z
  .object({
    predicate_id: z.string().min(1),
    /** Observed, not inferred — no coercion, so "false" is not false. */
    satisfied: z.boolean(),
    checked_at: z.string().datetime(),
  })
  .strict();
export type OracleSatisfactionRecord = z.infer<typeof oracleSatisfactionRecordSchema>;
