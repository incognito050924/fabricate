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
 *
 * And why "ran" is derived from the pass's id rather than from the shape of its
 * conflict list. Any object literal can carry an empty array; only a pass that
 * actually ran carries the id the pass runner minted for it. Reading the array
 * alone let `{ conflicts: [] }` manufacture the verified zero ADR-0018 exists
 * to forbid — a count with no judge, no answers, and no journal entry behind it.
 */

export type ConsistencyRecord = { status: "not-run" } | { status: "ran"; conflicting: number };

export type ConflictingFloorVerdict = {
  blocked: boolean;
  reason?: "conflicting-floor-blocked" | "consistency-pass-not-run";
};

/** Derives the floor input from a pass result, or carries a not-run marker. */
export function deriveConflictingInput(
  passOrMarker:
    | { id?: string; conflicts?: readonly unknown[]; status?: string }
    | ConsistencyRecord,
): ConsistencyRecord {
  const candidate = passOrMarker as { id?: unknown; conflicts?: readonly unknown[] };
  const ran = typeof candidate.id === "string" && candidate.id.length > 0;
  if (ran && Array.isArray(candidate.conflicts)) {
    return { status: "ran", conflicting: candidate.conflicts.length };
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
