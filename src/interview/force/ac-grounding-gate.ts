import { type UtteranceRecord, isBindingForce } from "./speech-act-force";

/**
 * Grounding gate for acceptance criteria. An AC may only rest on utterances
 * that actually bind — 제약 or 약속. Every non-binding utterance offered as
 * grounding is named and the whole grounding is refused: a binding companion
 * does NOT launder a preference sitting beside it, because once the AC is
 * written nobody can tell which utterance it really came from.
 */

export interface AcGroundingInput {
  ac_id: string;
  grounding_utterances: UtteranceRecord[];
}

export interface AcGroundingResult {
  accepted: boolean;
  rejected_utterance_ids: string[];
  reason?: string;
}

export function evaluateAcGroundingGate(input: AcGroundingInput): AcGroundingResult {
  const rejected_utterance_ids = input.grounding_utterances
    .filter((utterance) => !isBindingForce(utterance.force))
    .map((utterance) => utterance.utterance_id);

  if (rejected_utterance_ids.length === 0) {
    return { accepted: true, rejected_utterance_ids };
  }
  return {
    accepted: false,
    rejected_utterance_ids,
    reason: `구속력 없는 발화는 수용 기준의 근거가 될 수 없다 (${input.ac_id}: ${rejected_utterance_ids.join(", ")})`,
  };
}
