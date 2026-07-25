/**
 * The synthesis brief — the packet handed to whoever synthesizes the interview.
 * Ownership separation: the synthesizer must work from what the user actually
 * said (the source request, verbatim) plus what was confirmed, and NOT from the
 * driver's questions or turn log. Questions carry the driver's framing, so
 * letting them through would let the driver's reading pass itself off as the
 * user's intent. The builder therefore drops them by construction — the brief's
 * key set is fixed — and refuses to build at all when the author is the driver.
 */

import { DRIVER_CONTEXT } from "./synthesis-provenance";

export interface ConfirmationRecord {
  predicate_id: string;
  utterance: string;
  at: string;
}

export interface SynthesisBriefInput {
  /** Preserved byte-for-byte — this is the one thing that must not be reworded. */
  source_request: string;
  confirmations: ConfirmationRecord[];
  author_context: string;
  /** Contamination sources, accepted so they can be visibly dropped. */
  questions?: unknown;
  turns?: unknown;
}

export interface SynthesisBrief {
  source_request: string;
  confirmations: ConfirmationRecord[];
  synthesis_provenance: { author_context: string };
}

export type SynthesisBriefResult =
  | { built: true; brief: SynthesisBrief }
  | { built: false; reason: string };

export function buildSynthesisBrief(input: SynthesisBriefInput): SynthesisBriefResult {
  if (input.author_context === DRIVER_CONTEXT) {
    return {
      built: false,
      reason: "합성 brief를 driver 컨텍스트에서 작성할 수 없다 — 소유권 분리 위반",
    };
  }
  return {
    built: true,
    brief: {
      source_request: input.source_request,
      confirmations: input.confirmations,
      synthesis_provenance: { author_context: input.author_context },
    },
  };
}
