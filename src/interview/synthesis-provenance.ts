import { z } from "zod";

/**
 * Who wrote the synthesis. The driver may not: a driver-authored synthesis is
 * the driver's reading of the interview passing itself off as the user's
 * intent, which is exactly the substitution this harness exists to prevent.
 * So the context is recorded as a field and 'driver' is refused at construction
 * time rather than checked later by whoever remembers to.
 */

export const DRIVER_CONTEXT = "driver";

export const synthesisProvenanceSchema = z
  .object({
    author_context: z
      .string()
      .min(1)
      .refine((value) => value !== DRIVER_CONTEXT, {
        message: "합성 provenance의 author_context는 driver일 수 없다 — 소유권 분리 위반",
      }),
  })
  .strict();
export type SynthesisProvenance = z.infer<typeof synthesisProvenanceSchema>;

export function createSynthesisProvenance(input: { author_context: string }): SynthesisProvenance {
  return synthesisProvenanceSchema.parse(input);
}
