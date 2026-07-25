import type { DelegationRecord } from "./delegation";

/**
 * Reflecting a delegation back to the user. The interpretation is shown
 * verbatim, next to their own words: a delegation is the one moment where the
 * interview starts deciding on the user's behalf, and the only defense against
 * a wrong reading is that the reading is visible while it can still be
 * corrected.
 *
 * The interpretation is never reworded on the way out — a rendering that
 * polishes it would show the user something other than what was acted on.
 */

export function renderDelegationReflection(record: DelegationRecord): string {
  return [
    "말씀하신 것:",
    record.raw_utterance,
    "",
    "이렇게 이해했습니다:",
    record.interpretation,
    "",
    "다르게 이해했다면 지금 바로잡아 주세요.",
  ].join("\n");
}
