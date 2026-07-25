/**
 * Interview dimensions — the open threads of an interview. A dimension is
 * approved only when it names the goal predicate it serves, and it stops
 * blocking the finalize only when it is dropped with a stated reason: silence
 * is not a resolution.
 */

import { type ApprovalResult, hasGoalLink, isNonBlank, orphanRejection } from "./orphan-gate";

/** 'seed' comes from the original request; 'discovered' arises during the interview. */
export type DimensionOrigin = "seed" | "discovered";
export type DimensionState = "open" | "dropped";

export type Dimension = {
  id: string;
  label: string;
  origin: DimensionOrigin | string;
  state: DimensionState | string;
  goal_predicate_ref?: string;
  drop_reason?: string;
};

export function approveDimension(dimension: Dimension): ApprovalResult {
  if (!hasGoalLink(dimension.goal_predicate_ref)) {
    return { approved: false, rejection: orphanRejection("goal_predicate_ref") };
  }
  return { approved: true };
}

/**
 * Drop a dimension. The reason is mandatory — a dimension dropped without one
 * would release the finalize block while leaving no record of what was given up.
 */
export function dropDimension(dimension: Dimension, reason: string): Dimension {
  if (!reason || reason.trim().length === 0) {
    throw new Error("사유 없는 차원 드롭은 거부한다 — 무엇을 포기했는지가 남지 않는다");
  }
  return { ...dimension, state: "dropped", drop_reason: reason };
}

/** Only a dropped-with-reason dimension is settled; anything else still blocks. */
export function isSettled(dimension: Dimension): boolean {
  return dimension.state === "dropped" && isNonBlank(dimension.drop_reason);
}
