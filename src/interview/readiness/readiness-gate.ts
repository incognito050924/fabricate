import type { DimensionNode } from "../completeness/fragment-mapping";

/**
 * Readiness, and the lock that depends on it. An open discovered seed means a
 * piece of the original request was never turned into a question, so readiness
 * is false and the lock refuses — the strong plate: a hard block, not a warning
 * shown next to a button that still works.
 *
 * The verdict is derived, never accepted. A caller may claim to be ready; the
 * gate reads the dimensions instead, because a claim is exactly what the block
 * exists to overrule.
 *
 * The block lifts one way only — the fragment gets covered by a real dimension,
 * or the seed leaves the open state (resolved, or dropped with a reason).
 */

export type ReadinessResult = {
  ready: boolean;
  /** Ids of the seeds standing in the way. */
  blockers: string[];
};

const isOpenDiscoveredSeed = (dimension: DimensionNode): boolean =>
  dimension.origin === "discovered" && dimension.state === "open";

export function evaluateReadiness(input: {
  dimensions: readonly DimensionNode[];
}): ReadinessResult {
  const blockers = input.dimensions.filter(isOpenDiscoveredSeed).map((dimension) => dimension.id);
  return { ready: blockers.length === 0, blockers };
}

export type LockResult = {
  locked: boolean;
  intent?: { dimensions: DimensionNode[] };
  blockers: string[];
};

export function proceedToLock(input: {
  dimensions: readonly DimensionNode[];
  /** Accepted and ignored — readiness is read off the dimensions. */
  claimed_ready?: boolean;
}): LockResult {
  const readiness = evaluateReadiness(input);
  if (!readiness.ready) {
    return { locked: false, blockers: readiness.blockers };
  }
  return { locked: true, intent: { dimensions: [...input.dimensions] }, blockers: [] };
}
