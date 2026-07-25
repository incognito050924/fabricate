import type { KDiffRecord } from "./k-diff";

/**
 * The diversity floor. "The readings agree, so this is immaterial" is only
 * meaningful if there were readings to agree — one reading restated k times
 * agrees with itself, and calling that immaterial converts a failure to
 * generate alternatives into a verdict that no question is needed.
 *
 * So an immaterial verdict is refused below two distinct interpretations. This
 * is a structural approximation and nothing more: it catches collapse into one
 * reading, not k readings that differ on the surface while sharing the same
 * prior's blind spot.
 */

export type DiversityFloorResult = { ok: true } | { ok: false; reason: string };

export function checkDiversityFloor(input: {
  interpretations: readonly string[];
  k_diff: KDiffRecord;
}): DiversityFloorResult {
  if (input.k_diff.material !== false) {
    return { ok: true };
  }

  const distinct = new Set(input.interpretations.map((reading) => reading.trim()));
  if (distinct.size < 2) {
    return {
      ok: false,
      reason: "해석이 하나로 붕괴했다 — 단일 해석 위에서 '비중대' 판정을 내릴 수 없다",
    };
  }

  return { ok: true };
}
