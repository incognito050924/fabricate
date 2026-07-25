import { z } from "zod";

/**
 * Gate ⑤ — close gate. A "done" close is admissible only when EVERY criterion
 * carries a pass verdict; any residue (failed or never-judged criteria) makes
 * done inadmissible. The only other landing is the honest one: status
 * "unverified" with the residue named and a re-entry contract attached —
 * landing residue without a re-entry contract is refused outright.
 *
 * The landing status is DERIVED here, never accepted from the caller, so a
 * loop cannot claim "done" past its own unpassed criteria.
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
  | { admissible: false; reason: string; residue: string[] };

export function decideClose(criteria: JudgedCriterion[], re_entry?: ReEntry): CloseDecision {
  if (criteria.length === 0) {
    return {
      admissible: false,
      reason: "판정할 조건이 하나도 없다 — 빈 조건 집합으로는 완료를 선언할 수 없다",
      residue: [],
    };
  }

  const residue = criteria.filter((c) => c.verdict !== "pass").map((c) => c.id);
  if (residue.length === 0) {
    return { admissible: true, status: "done" };
  }

  if (re_entry === undefined) {
    return {
      admissible: false,
      reason: `통과 못 한 조건이 남아 완료 종료는 부적격이다 (${residue.join(", ")}) — 재진입 조건을 붙여 미검증으로만 착지할 수 있다`,
      residue,
    };
  }

  return { admissible: true, status: "unverified", residue, re_entry };
}
