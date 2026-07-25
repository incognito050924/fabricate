import { z } from "zod";

/**
 * Triadic elicitation (Kelly's repertory grid): when a preference is fuzzy,
 * asking "what do you want?" returns the words the user already used. Showing
 * three concrete alternatives and asking which two side together forces the
 * distinction they actually hold to surface.
 *
 * Exactly three — no fewer, no more. Two alternatives only offer a binary the
 * interviewer chose; four turn the answer into a ranking, and the construct
 * behind the grouping is what the ladder needs.
 */

export const triadicElicitationSchema = z
  .object({
    dimension: z.string().min(1),
    /** Records exist for fuzzy preferences — a clear one needs no ladder. */
    preference_clarity: z.literal("fuzzy"),
    triadic_alternatives: z.array(z.string().min(1)).length(3),
  })
  .strict();
export type TriadicElicitation = z.infer<typeof triadicElicitationSchema>;

export function parseTriadicElicitation(raw: unknown): TriadicElicitation {
  return triadicElicitationSchema.parse(raw);
}
