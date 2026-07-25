/**
 * U7 hearback correction. When the user reads a plan back WRONG, the agent must
 * correct it on the spot; letting the misreading stand is how a divergence gets
 * silently ratified, so silence in that situation is itself the violation
 * ("침묵=위반") rather than a neutral non-event.
 *
 * Firing is gated to the situation ("발생 시만"): an ordinary turn records
 * neither a correction nor a violation, even if a correction utterance happens
 * to be supplied. Whether an utterance really is a misreading is human
 * judgment; the tag fixes it and this records the structure that follows.
 */

export type MisreadbackTag = "misreadback" | "none";

export interface HearbackTurnInput {
  turn_id: string;
  misreadback_tag: MisreadbackTag;
  agent_utterance: string;
  user_utterance: string;
  correction_utterance: string;
}

export interface CorrectionRecord {
  utterance: string;
}

export interface HearbackTurn {
  turn_id: string;
  hearback_fired: boolean;
  silence_violation: boolean;
  correction?: CorrectionRecord;
  /** The cue this violation is judged against, quoted from the U7 block. */
  violation_label?: string;
}

/** Quoted from the U7 directive block — the violation names the cue it breaks. */
const SILENCE_IS_VIOLATION = "침묵=위반";

export function recordHearbackTurn(input: HearbackTurnInput): HearbackTurn {
  if (input.misreadback_tag !== "misreadback") {
    return { turn_id: input.turn_id, hearback_fired: false, silence_violation: false };
  }

  if (input.correction_utterance.length === 0) {
    return {
      turn_id: input.turn_id,
      hearback_fired: false,
      silence_violation: true,
      violation_label: SILENCE_IS_VIOLATION,
    };
  }

  return {
    turn_id: input.turn_id,
    hearback_fired: true,
    silence_violation: false,
    correction: { utterance: input.correction_utterance },
  };
}
