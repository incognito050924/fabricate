import type { DimensionNode } from "../completeness/fragment-mapping";

/**
 * The single definition of "this dimension still stands in the way of the lock".
 *
 * It lives apart from both the readiness gate and the lock entry point so the
 * two cannot drift into two different notions of blocking — a lock verdict
 * disagreeing with its own readiness verdict is exactly the failure this file
 * exists to make impossible. Every caller reads the predicate from here; nobody
 * re-states it inline.
 *
 * The predicate itself is unchanged from where it was lifted
 * (`readiness-gate.ts`): a discovered seed blocks while its state reads `open`.
 * Moving it is all this file does — what the predicate ought to say is a
 * separate question and a separate change.
 */

/** A discovered seed blocks while it sits in the open state. */
export function isBlockingSeed(dimension: DimensionNode): boolean {
  return dimension.origin === "discovered" && dimension.state === "open";
}

/** The ids standing between the interview and the lock. */
export function blockingSeedIds(dimensions: readonly DimensionNode[]): string[] {
  return dimensions.filter(isBlockingSeed).map((dimension) => dimension.id);
}
