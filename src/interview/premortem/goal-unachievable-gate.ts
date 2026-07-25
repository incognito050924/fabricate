/**
 * "The goal cannot be reached" is its own gate. It fires on the verdict alone —
 * fork count is not an input here, and deliberately so: a pre-mortem that found
 * no forks at all can still have concluded that the goal is unreachable, and
 * that is exactly the case where silence would be worst.
 *
 * The gate fires the confirmation; receiving the user's answer is outside it.
 */

import type { PremortemItem } from "./premortem-item";

export type GoalUnachievableInput = {
  goal_unachievable: boolean;
  /** Carried for the caller's context only — the verdict does not read it. */
  forks: PremortemItem[];
};

export type GoalUnachievableResult = {
  forced_user_confirmation: boolean;
  reason?: string;
};

export function goalUnachievableGate(input: GoalUnachievableInput): GoalUnachievableResult {
  if (input.goal_unachievable !== true) {
    return { forced_user_confirmation: false };
  }
  return {
    forced_user_confirmation: true,
    reason: "목표를 달성할 수 없다고 판정됐다 — 계속할지 사용자 확인이 필요하다",
  };
}
