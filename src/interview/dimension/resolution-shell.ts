import type { DimensionState } from "./state";

/**
 * The resolution shell. Closing a critical dimension as resolved requires three
 * markers: the reason the close is justified, a pointer to the user answer the
 * resolution rests on, and the record that a refutation was attempted. Each one
 * answers a different way a close goes wrong — no stated reason, a reason the
 * user never gave, and a reason nobody tried to break.
 *
 * A missing marker produces neither an exception nor a close. The attempt is
 * recorded as `unevaluated`: the dimension was looked at and not judged, which
 * is a different fact from never having been looked at, and one the aggregation
 * refuses to count as closed.
 *
 * Whether the reason really justifies, whether the answer really resolves, and
 * whether the refutation was genuine are human judgments. The shell enforces
 * that the three are present and non-empty; it does not read them.
 */

const RESOLVED: DimensionState = "resolved";
const UNEVALUATED: DimensionState = "unevaluated";

export type DimensionUnderClose = {
  id: string;
  criticality?: string;
  state?: string;
};

export type ResolvedCloseAttempt = {
  state: DimensionState;
  missing_markers: string[];
};

const isPresentText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

export function attemptResolvedClose(
  dimension: DimensionUnderClose,
  close: Record<string, unknown>,
): ResolvedCloseAttempt {
  // The shell fires only on critical dimensions — a non-critical close keeps
  // the behavior it had before the shell existed.
  if (dimension.criticality !== "critical") {
    return { state: RESOLVED, missing_markers: [] };
  }

  const missing_markers: string[] = [];
  if (!isPresentText(close.justifying_reason)) missing_markers.push("justifying_reason");
  if (!isPresentText(close.user_answer_marker)) missing_markers.push("user_answer_marker");
  if (close.refutation_attempted !== true) missing_markers.push("refutation_attempted");

  return {
    state: missing_markers.length === 0 ? RESOLVED : UNEVALUATED,
    missing_markers,
  };
}
