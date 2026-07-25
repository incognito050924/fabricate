/**
 * Where a failed preservation judgment goes. Not back to the driver for
 * editing: the driver's wording is what just failed, and letting the driver
 * patch it would converge on the driver's reading by small steps that each look
 * like an improvement. It goes to a fresh synthesis from the original request
 * instead — which is why a driver-edit target does not exist as a key here, not
 * merely as an unused option.
 */

import type { PreservationJudgment } from "./preservation-judgment";

export type ResynthesisRoute = {
  target: "fresh_resynthesis";
  /** The original request, verbatim — the fresh synthesizer starts from it. */
  source_request: string;
  failed_candidate: string;
};

export function routeAfterPreservationFail(input: {
  source_request: string;
  judgment: PreservationJudgment;
}): ResynthesisRoute {
  return {
    target: "fresh_resynthesis",
    source_request: input.source_request,
    failed_candidate: input.judgment.brief.candidate_statement,
  };
}
