import { z } from "zod";

/**
 * A glossary entry — the agreed anchor for one concept. Agreement on a term is
 * only real when it is pinned to examples on both sides: what the term does
 * cover and what it does not. The avoid list carries the wordings that were
 * rejected, so a later surface can be checked against them mechanically
 * instead of relying on everyone remembering the agreement.
 */

export const glossaryEntrySchema = z
  .object({
    concept: z.string().min(1),
    /** The agreed Korean rendering — rendering consumes this, never re-translates. */
    korean: z.string().min(1),
    positive_examples: z.array(z.string().min(1)),
    negative_examples: z.array(z.string().min(1)),
    /** Rejected wordings; a surface containing one of these is a violation. */
    avoid: z.array(z.string().min(1)),
  })
  .strict();
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;

export function parseGlossaryEntry(raw: unknown): GlossaryEntry {
  return glossaryEntrySchema.parse(raw);
}
