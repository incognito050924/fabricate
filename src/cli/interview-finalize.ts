/**
 * The finalize arm of the command line. It is the place where a refusal has to
 * become visible to a shell: a rejected finalize exits non-zero, so a pipeline
 * or a wrapping agent cannot read "the command ran" as "the intent was
 * recorded". The exit code is derived from the finalize outcome, never asserted
 * by the caller.
 */

import {
  type FinalizeCandidate,
  type IntentRecord,
  createIntentStore,
  finalize,
} from "../interview/finalize";
import { staticCopy } from "../interview/i18n/static-copy-catalog";

export type FinalizeCliResult = {
  exitCode: number;
  /** Lines meant for the user, in the order they should be printed. */
  output: string[];
  intent?: IntentRecord;
};

export async function runFinalizeCli(candidate: FinalizeCandidate): Promise<FinalizeCliResult> {
  const store = createIntentStore();
  const outcome = finalize(candidate, store);

  if (outcome.status === "rejected") {
    const rejected = staticCopy("interview.banner.finalize_rejected");
    const output = [`${rejected}(${outcome.rejection.kind}): ${outcome.rejection.reason}`];
    if (outcome.routing) {
      const route = staticCopy("interview.label.next_route");
      const resynthesize = staticCopy("interview.label.resynthesize");
      output.push(`${route}: ${outcome.routing.target} — ${resynthesize}`);
    }
    return { exitCode: 1, output };
  }

  return {
    exitCode: 0,
    output: [staticCopy("interview.banner.intent_recorded"), outcome.intent.statement],
    intent: outcome.intent,
  };
}
