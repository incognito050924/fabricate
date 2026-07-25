import { type QuestionMode, parseQuestionRoundRecord, questionMode } from "./mode-record";

/**
 * The mode distribution audit. It reports what the interview actually did —
 * counts per mode and the modes in round order — and stops there. The policy
 * (open-ended early, boundary labels in the middle, yes/no late) is observable
 * from this output, but a column that violates it still produces a normal
 * audit: whether a given round should have been open-ended is a judgment, and
 * a gate that blocked on it would be enforcing a guess.
 *
 * Every mode appears in the counts, including the ones never used — a mode
 * missing from the report reads as "not applicable" when it means "never asked".
 */

export type ModeDistributionAudit = {
  round_count: number;
  mode_counts: Record<QuestionMode, number>;
  /** Modes in round order — the sequence the policy is read off of. */
  mode_sequence: QuestionMode[];
};

export function auditModeDistribution(rounds: readonly unknown[]): ModeDistributionAudit {
  const parsed = rounds
    .map(parseQuestionRoundRecord)
    .sort((left, right) => left.round_index - right.round_index);

  const mode_counts = Object.fromEntries(questionMode.options.map((mode) => [mode, 0])) as Record<
    QuestionMode,
    number
  >;

  for (const round of parsed) {
    mode_counts[round.question_mode] += 1;
  }

  return {
    round_count: parsed.length,
    mode_counts,
    mode_sequence: parsed.map((round) => round.question_mode),
  };
}
