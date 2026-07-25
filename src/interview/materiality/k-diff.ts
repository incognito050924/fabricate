import { z } from "zod";

/**
 * The k-diff record. Instead of asking "is this ambiguous?", the machine takes
 * k readings of the request, projects each one to the artifact it would produce
 * and the behavior that artifact would have, and diffs those. Ambiguity that
 * changes nothing downstream is not worth a question; ambiguity that changes
 * behavior is, and the divergence point names where the readings part.
 *
 * `material` is mandatory and strictly boolean — a truthy string would let an
 * unset verdict read as material and a "false" string as immaterial, which are
 * opposite mistakes made by the same laxity. The divergence point is optional
 * because an immaterial diff has no fork to name.
 *
 * The readings, the projections, and the diff all come from one model prior.
 * A misreading shared by all k of them collapses into "immaterial" and this
 * record cannot tell.
 */

export const kDiffRecordSchema = z
  .object({
    material: z.boolean(),
    /** Where the readings part — present when the diff is material. */
    divergence_point: z.string().optional(),
  })
  .strict();
export type KDiffRecord = z.infer<typeof kDiffRecordSchema>;

export function parseKDiffRecord(raw: unknown): KDiffRecord {
  return kDiffRecordSchema.parse(raw);
}
