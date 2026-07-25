import { z } from "zod";

/**
 * The assumption ledger — every assumption anyone acted on, with how sure they
 * were when they acted. The confidence field is mandatory: an assumption logged
 * without one cannot be settled later, since there is no claim to compare the
 * outcome against, and a ledger of unscored assumptions only records that
 * guessing happened.
 *
 * The ledger is not interview-scoped. Assumptions made while executing are the
 * same kind of object as assumptions made while interviewing, and scoping the
 * ledger to interviews would leave the ones taken under time pressure — the
 * likeliest to be wrong — unrecorded. So `origin` is a field, not a filter.
 */

export const assumptionRecordSchema = z
  .object({
    assumption_id: z.string().min(1),
    /** Where the assumption was made: interview, execution, review, … */
    origin: z.string().min(1),
    statement: z.string().min(1),
    /** How sure the assumption was when acted on — required, never blank. */
    confidence: z.string().min(1),
    logged_at: z.string().datetime(),
  })
  .strict();
export type AssumptionRecord = z.infer<typeof assumptionRecordSchema>;

export function parseAssumptionRecord(raw: unknown): AssumptionRecord {
  return assumptionRecordSchema.parse(raw);
}

export type AssumptionLedger = {
  log(raw: unknown): AssumptionRecord;
  list(): AssumptionRecord[];
};

export function createAssumptionLedger(): AssumptionLedger {
  const records: AssumptionRecord[] = [];
  return {
    // Parse before storing: a rejected record must not reach the ledger at all.
    log(raw: unknown): AssumptionRecord {
      const record = parseAssumptionRecord(raw);
      records.push(record);
      return record;
    },
    list(): AssumptionRecord[] {
      return [...records];
    },
  };
}
