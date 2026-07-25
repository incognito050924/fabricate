import { z } from "zod";
import { DIMENSION_STATES, type DimensionState, matchDimensionState } from "./state";

/**
 * Closing dimensions, and the aggregations that read the result.
 *
 * Every aggregation here goes through the exhaustive matcher, so a new state
 * cannot quietly land on the closed side of a default arm. `unevaluated` is
 * explicitly not closed: the close was attempted and not judged, which is
 * further from done than an open dimension is, not nearer.
 *
 * The close record keeps the three shell markers optional at schema level —
 * records written before the shell existed still parse — while the shell makes
 * them mandatory on the path that actually needs them.
 */

export const dimensionStateSchema = z.enum(DIMENSION_STATES);

export const closeRecordSchema = z
  .object({
    dimension_id: z.string().min(1),
    target_state: dimensionStateSchema,
    /** Shell markers — required on the critical-resolved path, not in storage. */
    justifying_reason: z.string().optional(),
    user_answer_marker: z.string().optional(),
    refutation_attempted: z.boolean().optional(),
  })
  .strict();
export type CloseRecord = z.infer<typeof closeRecordSchema>;

export type DimensionSnapshot = {
  id: string;
  state: DimensionState;
};

/** Settled either way: resolved by an answer, or dropped out of scope. */
export function isClosedState(state: DimensionState): boolean {
  return matchDimensionState(state, {
    open: () => false,
    resolved: () => true,
    dropped: () => true,
    // 판정되지 않은 close 시도 — 닫힘이 아니다.
    unevaluated: () => false,
  });
}

export function closedDimensionCount(dimensions: readonly DimensionSnapshot[]): number {
  return dimensions.filter((dimension) => isClosedState(dimension.state)).length;
}

export function allDimensionsClosed(dimensions: readonly DimensionSnapshot[]): boolean {
  return dimensions.every((dimension) => isClosedState(dimension.state));
}

/** The ids standing between the interview and readiness. */
export function readinessBlockers(dimensions: readonly DimensionSnapshot[]): string[] {
  return dimensions
    .filter((dimension) => !isClosedState(dimension.state))
    .map((dimension) => dimension.id);
}
