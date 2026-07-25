import { z } from "zod";

/**
 * A grounding citation — what a challenge stands on. The excerpt is required
 * and non-empty because a citation that names a source without quoting it
 * cannot be checked against that source, which is the whole reason to demand
 * one: a challenge with an uncheckable citation is an assertion wearing a
 * reference.
 *
 * The authority kind is an enum so the gate can tell which source a challenge
 * leans on. Naming glossary as a kind is not endorsing it — glossary citations
 * parse here and are refused by the gate, because the two questions ("is this a
 * well-formed citation?" and "does it cite the authority that decides?") are
 * different questions.
 */

export const citationAuthority = z.enum(["code", "glossary", "doc"]);
export type CitationAuthority = z.infer<typeof citationAuthority>;

export const groundingCitationSchema = z
  .object({
    authority: citationAuthority,
    source_ref: z.string().min(1),
    /** Quoted verbatim, so it can be compared against the source. */
    excerpt: z.string().min(1),
  })
  .strict();
export type GroundingCitation = z.infer<typeof groundingCitationSchema>;

export function parseGroundingCitation(raw: unknown): GroundingCitation {
  return groundingCitationSchema.parse(raw);
}
