/**
 * "An assumption must be visibly logged" — enforced per item, not in aggregate.
 *
 * The failure this guards against is the silent assumption: a decision taken on
 * the user's behalf that never surfaces anywhere they would read. So the check
 * walks EVERY recorded assumption and demands a visible-log record that
 * references that assumption by id. Counting records is not enough (two records
 * pointing at the same assumption cover one assumption), and a record naming an
 * assumption nobody made covers nothing. With no assumptions at all there is
 * nothing to expose, and the check passes.
 *
 * What the log entry says is not judged here — only that it exists and points
 * at the right assumption.
 */

export type RecordedAssumption = {
  id: string;
  statement: string;
  turn_id?: string;
};

export type VisibleLogRecord = {
  assumption_id: string;
  entry: string;
};

export type AssumptionVisibilityResult = { ok: true } | { ok: false; reason: string };

export function checkAssumptionVisibility(input: {
  assumptions: RecordedAssumption[];
  visible_log: VisibleLogRecord[];
}): AssumptionVisibilityResult {
  const covered = new Set(input.visible_log.map((record) => record.assumption_id));
  const uncovered = input.assumptions
    .filter((assumption) => !covered.has(assumption.id))
    .map((assumption) => assumption.id);

  if (uncovered.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `가시 로그 없는 가정: ${uncovered.join(", ")} — 침묵 가정은 허용하지 않는다`,
  };
}
