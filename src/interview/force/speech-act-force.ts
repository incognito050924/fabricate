import { z } from "zod";

/**
 * Speech-act force tagging. Not everything a user says binds: a preference, an
 * example, a hypothesis and a grumble are all real utterances that commit to
 * nothing, and treating them as requirements is the classic way an interview
 * invents scope the user never asked for. Only 제약 (a constraint) and 약속
 * (a commitment) bind.
 *
 * The force field is required per utterance — an untagged utterance is refused
 * rather than defaulting to binding — and the enum is closed, so a near-miss
 * label cannot smuggle in a seventh category.
 */

export const BINDING_FORCES = ["제약", "약속"] as const;
export const NON_BINDING_FORCES = ["선호", "예시", "가설", "푸념"] as const;

export const speechActForce = z.enum(["제약", "약속", "선호", "예시", "가설", "푸념"]);
export type SpeechActForce = z.infer<typeof speechActForce>;

export const utteranceRecordSchema = z
  .object({
    utterance_id: z.string().min(1),
    text: z.string().min(1),
    force: speechActForce,
  })
  .strict();
export type UtteranceRecord = z.infer<typeof utteranceRecordSchema>;

export function isBindingForce(force: SpeechActForce): boolean {
  return (BINDING_FORCES as readonly string[]).includes(force);
}
