import type { DimensionNode } from "../completeness/fragment-mapping";
import { isDimensionState, matchDimensionState } from "../dimension/state";

/**
 * The single definition of "this dimension still stands in the way of the lock".
 *
 * It lives apart from both the readiness gate and the lock entry point so the
 * two cannot drift into two different notions of blocking — a lock verdict
 * disagreeing with its own readiness verdict is exactly the failure this file
 * exists to make impossible. Every caller reads the predicate from here; nobody
 * re-states it inline.
 *
 * The block lifts one way only: the seed must be shown to have positively left
 * the open state. Resolved counts, and dropped counts when a reason was stated
 * — the rule `dimension.ts` already applies, because a drop with no record of
 * what was given up is not a resolution. Everything else blocks: `unevaluated`
 * is a close that was attempted and refused, a state the enum does not know is
 * a state nobody has judged, and an absent state is silence. Reading the state
 * through the exhaustive matcher is what keeps a future state value from
 * landing on the released side by default.
 */

const hasStatedReason = (dimension: DimensionNode): boolean =>
  typeof dimension.drop_reason === "string" && dimension.drop_reason.trim().length > 0;

/** Positively out of the open state — the only way the block lifts. */
const isSettledSeed = (dimension: DimensionNode): boolean => {
  const state = dimension.state;
  if (!isDimensionState(state)) {
    // Unknown or absent: fail-closed. Silence is not a resolution.
    return false;
  }
  return matchDimensionState(state, {
    open: () => false,
    // 판정되지 않은 close 시도 — 닫힘이 아니듯 해소도 아니다.
    unevaluated: () => false,
    resolved: () => true,
    dropped: () => hasStatedReason(dimension),
  });
};

/** A discovered seed blocks until it is settled. */
export function isBlockingSeed(dimension: DimensionNode): boolean {
  return dimension.origin === "discovered" && !isSettledSeed(dimension);
}

/** The ids standing between the interview and the lock. */
export function blockingSeedIds(dimensions: readonly DimensionNode[]): string[] {
  return dimensions.filter(isBlockingSeed).map((dimension) => dimension.id);
}
