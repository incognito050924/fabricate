/**
 * U2 source attribution on a turn. At the plan/summary threshold — the moments
 * where an agent's reading is most likely to be mistaken for the user's words —
 * the turn carries three labeled compartments: what the user SAID, what was
 * INFERRED from it, and what was ASSUMED. Keeping them apart is what stops an
 * inference from later being cited as a user requirement.
 *
 * Firing is gated to those thresholds ("계획·요약 문턱만"): ordinary turns are
 * still recorded, just without the marking. Which item belongs in which
 * compartment is human judgment and stays residual — the classified content
 * passes through verbatim.
 */

export type ThresholdTag = "plan" | "summary" | "none";

export interface AttributedTurnInput {
  turn_id: string;
  threshold_tag: ThresholdTag;
  content: string;
  said: string[];
  inferred: string[];
  assumed: string[];
}

export interface AttributionCompartment {
  /** The user-visible Korean label for this compartment. */
  label: string;
  items: string[];
}

export interface Attribution {
  said: AttributionCompartment;
  inferred: AttributionCompartment;
  assumed: AttributionCompartment;
}

export interface AttributedTurn {
  turn_id: string;
  content: string;
  attribution_fired: boolean;
  attribution?: Attribution;
}

const MARKING_THRESHOLDS: readonly ThresholdTag[] = ["plan", "summary"];

export function recordAttributedTurn(input: AttributedTurnInput): AttributedTurn {
  if (!MARKING_THRESHOLDS.includes(input.threshold_tag)) {
    return { turn_id: input.turn_id, content: input.content, attribution_fired: false };
  }
  return {
    turn_id: input.turn_id,
    content: input.content,
    attribution_fired: true,
    attribution: {
      said: { label: "말한것", items: input.said },
      inferred: { label: "추론", items: input.inferred },
      assumed: { label: "가정", items: input.assumed },
    },
  };
}
