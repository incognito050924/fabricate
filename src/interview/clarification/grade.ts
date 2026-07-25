import { z } from "zod";

/**
 * The clarification-need scale (ClariQ, 1-4) — the single source of truth for
 * "how much clarifying does this request need?".
 *
 * It is declared exactly once, here. Bundle-6's C5 reuses this scale rather
 * than defining its own: two scales that drift apart would let the same request
 * be lightweight on one path and heavyweight on another, and the disagreement
 * would live in whichever module the reader did not open. Consumers import the
 * schema; they never re-enumerate the values.
 *
 * What grade a given request deserves is a human judgment this module does not
 * make — it fixes the scale, not the grading.
 */

export type ClarificationGrade = 1 | 2 | 3 | 4;

export const clarificationGradeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
