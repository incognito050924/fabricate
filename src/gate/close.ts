import { z } from "zod";
import type { CriterionSetLock } from "../intent/lock";

/**
 * Gate ⑤ — close gate, judged against the LOCKED criterion set. First, every
 * locked id must appear in the judged list — a locked criterion silently left
 * off the list is exactly the silent shrink this harness exists to block, and
 * it refuses the close outright (a re-entry contract does not excuse it).
 * Then a "done" close is admissible only when EVERY judged criterion carries a
 * pass verdict; any residue (failed or never-judged) makes done inadmissible,
 * and the only other landing is the honest one: status "unverified" with the
 * residue named and a re-entry contract attached.
 *
 * The landing status is DERIVED here, never accepted from the caller. Judged
 * ids beyond the lock are additions (lock-legal) and are judged like the rest.
 */

export const criterionVerdict = z.enum(["pass", "fail"]);
export type CriterionVerdict = z.infer<typeof criterionVerdict>;

export const reEntry = z
  .object({
    /** What must happen (or become true) for the residue to be picked back up. */
    condition: z.string().min(1),
  })
  .strict();
export type ReEntry = z.infer<typeof reEntry>;

export interface JudgedCriterion {
  id: string;
  /** Absent verdict = never judged (unverified). */
  verdict?: CriterionVerdict;
}

export type CloseDecision =
  | { admissible: true; status: "done" }
  | { admissible: true; status: "unverified"; residue: string[]; re_entry: ReEntry }
  | { admissible: false; reason: string; missing: string[]; residue: string[] };

export function decideClose(
  lock: CriterionSetLock,
  judged: JudgedCriterion[],
  re_entry?: ReEntry,
): CloseDecision {
  const judgedIds = new Set(judged.map((c) => c.id));
  const missing = lock.criterion_ids.filter((id) => !judgedIds.has(id));
  const residue = judged.filter((c) => c.verdict !== "pass").map((c) => c.id);

  if (missing.length > 0) {
    return {
      admissible: false,
      reason: `잠긴 조건이 판정 목록에서 빠졌다 (${missing.join(", ")}) — 조용한 축소로 보고 거부한다. 빠진 조건은 미검증으로라도 목록에 올려야 한다`,
      missing,
      residue,
    };
  }

  if (residue.length === 0) {
    return { admissible: true, status: "done" };
  }

  if (re_entry === undefined) {
    return {
      admissible: false,
      reason: `통과 못 한 조건이 남아 완료 종료는 부적격이다 (${residue.join(", ")}) — 재진입 조건을 붙여 미검증으로만 착지할 수 있다`,
      missing,
      residue,
    };
  }

  return { admissible: true, status: "unverified", residue, re_entry };
}
