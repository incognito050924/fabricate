import type { DimensionNode } from "../completeness/fragment-mapping";
import { enterLock } from "../lock/enter";
import { blockingSeedIds } from "./seed-block";

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
 * Both verdicts read the same predicate: readiness asks `seed-block.ts` which
 * seeds block, and the lock asks the single entry point, which asks the same
 * file. Neither restates it, so the lock cannot lock what readiness refuses.
 */

export type ReadinessResult = {
  ready: boolean;
  /** Ids of the seeds standing in the way. */
  blockers: string[];
};

export function evaluateReadiness(input: {
  dimensions: readonly DimensionNode[];
}): ReadinessResult {
  const blockers = blockingSeedIds(input.dimensions);
  return { ready: blockers.length === 0, blockers };
}

export type LockResult = {
  locked: boolean;
  intent?: { dimensions: DimensionNode[] };
  blockers: string[];
};

/** A projection of the single lock entry point — this door holds no judgment. */
export function proceedToLock(input: {
  dimensions: readonly DimensionNode[];
  /** Accepted and ignored — readiness is read off the dimensions. */
  claimed_ready?: boolean;
}): LockResult {
  const outcome = enterLock({ dimensions: input.dimensions });
  return outcome.locked && outcome.intent
    ? { locked: true, intent: outcome.intent, blockers: [] }
    : { locked: false, blockers: outcome.blockers };
}
