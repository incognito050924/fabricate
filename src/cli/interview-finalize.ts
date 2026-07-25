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
    const output = [`확정 거부(${outcome.rejection.kind}): ${outcome.rejection.reason}`];
    if (outcome.routing) {
      output.push(`다음 경로: ${outcome.routing.target} — 원 요청에서 다시 합성한다`);
    }
    return { exitCode: 1, output };
  }

  return {
    exitCode: 0,
    output: ["의도를 확정해 기록했다.", outcome.intent.statement],
    intent: outcome.intent,
  };
}
