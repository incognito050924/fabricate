import type { DelegationRecord } from "./delegation";
import { staticCopy } from "./i18n/static-copy-catalog";

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
    staticCopy("interview.label.echoed_utterance"),
    record.raw_utterance,
    "",
    staticCopy("interview.label.echoed_reading"),
    record.interpretation,
    "",
    staticCopy("interview.prompt.correct_reading"),
  ].join("\n");
}
