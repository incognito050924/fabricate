/**
 * The `conflicting` input of the readiness floor, and the floor component that
 * consumes it.
 *
 * The count comes from the pass's conflict list every time. A floor fed a
 * constant zero passes exactly as smoothly as a floor fed a real zero, and the
 * difference — whether anything was actually checked — is invisible from the
 * verdict alone.
 *
 * Which is why not-run is its own status rather than a count of zero. A pass
 * that never ran carries no number at all, and the floor blocks on it with a
 * reason of its own, so "nobody checked" is never read as "checked and clean".
 */

export type ConsistencyRecord = { status: "not-run" } | { status: "ran"; conflicting: number };

export type ConflictingFloorVerdict = {
  blocked: boolean;
  reason?: "conflicting-floor-blocked" | "consistency-pass-not-run";
};

/** Derives the floor input from a pass result, or carries a not-run marker. */
export function deriveConflictingInput(
  passOrMarker: { conflicts?: readonly unknown[]; status?: string } | ConsistencyRecord,
): ConsistencyRecord {
  const conflicts = (passOrMarker as { conflicts?: readonly unknown[] }).conflicts;
  if (Array.isArray(conflicts)) {
    return { status: "ran", conflicting: conflicts.length };
  }
  return { status: "not-run" };
}

export function evaluateConflictingFloor(input: ConsistencyRecord): ConflictingFloorVerdict {
  if (input.status !== "ran") {
    return { blocked: true, reason: "consistency-pass-not-run" };
  }
  if (input.conflicting > 0) {
    return { blocked: true, reason: "conflicting-floor-blocked" };
  }
  return { blocked: false };
}
