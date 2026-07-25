import { z } from "zod";
import { clarificationGradeSchema } from "../clarification/grade";

/**
 * The clarification log — every request turn is stored with the grade it was
 * given AND the reason for that grade. The two are inseparable at parse time:
 * a grade with no rationale is an unexplained routing decision, and a rationale
 * with no grade routes nothing. Either alone is refused rather than stored.
 *
 * Bundle-6's C5 reads out of this same log, through the seam below, so what C5
 * sees is the very record the routing consumed — not a copy that could drift.
 */

export const clarificationRecordSchema = z
  .object({
    request_text: z.string().min(1),
    grade: clarificationGradeSchema,
    rationale: z.string().min(1),
    turn_id: z.string().min(1).optional(),
  })
  .strict();
export type ClarificationRecordInput = z.infer<typeof clarificationRecordSchema>;

export type StoredClarificationRecord = ClarificationRecordInput & { turn_id: string };

export type ClarificationLog = {
  records: StoredClarificationRecord[];
};

export function createClarificationLog(): ClarificationLog {
  return { records: [] };
}

export function recordClarificationTurn(
  log: ClarificationLog,
  turn: unknown,
): StoredClarificationRecord {
  const parsed = clarificationRecordSchema.parse(turn);
  const stored: StoredClarificationRecord = {
    ...parsed,
    turn_id: parsed.turn_id ?? `clariq-${log.records.length + 1}`,
  };
  log.records.push(stored);
  return stored;
}

export class UnknownClarificationTurnError extends Error {
  constructor(turnId: string) {
    super(`명료화 로그에 없는 턴: ${turnId}`);
    this.name = "UnknownClarificationTurnError";
  }
}

/**
 * The C5 consumption seam. It hands back the stored record itself — reading a
 * copy would let C5 act on a grade the log no longer holds.
 */
export function readClarificationRecordForC5(
  log: ClarificationLog,
  turnId: string,
): StoredClarificationRecord {
  const found = log.records.find((record) => record.turn_id === turnId);
  if (!found) throw new UnknownClarificationTurnError(turnId);
  return found;
}
