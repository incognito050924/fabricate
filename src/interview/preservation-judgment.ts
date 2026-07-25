import { z } from "zod";
import { DRIVER_CONTEXT } from "./synthesis-provenance";

/**
 * The session-blind preservation judgment: does the candidate wording still
 * carry what the user originally asked for?
 *
 * The judge is kept blind by the shape of what it receives. The brief holds the
 * original request verbatim, the candidate wording, and a tag naming the judging
 * context — and nothing else. Questions and dimension notes are the driver's
 * framing; if they rode along, the judge would be re-reading the driver's
 * interpretation and agreeing with itself. The schema is strict, so those
 * fields are a refusal rather than an ignored extra, and a judgment made in the
 * driver's own context is refused outright.
 *
 * Whether the verdict is *correct* is not decidable here — the judge shares the
 * driver's model prior. This module only fixes the shape and the vocabulary.
 */

export const preservationBriefSchema = z
  .object({
    /** Byte-for-byte the user's own words — never a summary. */
    source_request: z.string().min(1),
    candidate_statement: z.string().min(1),
    judge_context: z
      .string()
      .min(1)
      .refine((value) => value !== DRIVER_CONTEXT, {
        message: "보존 판정을 driver 컨텍스트에서 내릴 수 없다 — 세션-맹검 위반",
      }),
  })
  .strict();
export type PreservationBrief = z.infer<typeof preservationBriefSchema>;

export const preservationVerdict = z.enum(["pass", "fail"]);
export type PreservationVerdict = z.infer<typeof preservationVerdict>;

export const preservationJudgmentSchema = z
  .object({
    verdict: preservationVerdict,
    brief: preservationBriefSchema,
  })
  .strict();
export type PreservationJudgment = z.infer<typeof preservationJudgmentSchema>;

/** Builds the brief by construction: the key set is fixed at these three. */
export function buildPreservationBrief(input: {
  source_request: string;
  candidate_statement: string;
  judge_context: string;
}): PreservationBrief {
  return preservationBriefSchema.parse({
    source_request: input.source_request,
    candidate_statement: input.candidate_statement,
    judge_context: input.judge_context,
  });
}
