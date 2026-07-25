import { z } from "zod";

/**
 * The goal state — round 0's artifact and the standard that governs the rest of
 * the interview. Each predicate is an observable world-condition paired with
 * the means of verifying it; a predicate without a verification means is
 * refused at parse time, and confirming one is refused too. "Complete" is later
 * judged against these predicates rather than against a list of questions.
 */

export const goalPredicate = z
  .object({
    id: z.string().min(1),
    statement: z.string().min(1),
    /** How this predicate gets checked. Empty means unverifiable — refused. */
    verification_means: z.string().min(1),
    confirmed: z.boolean(),
  })
  .strict();
export type GoalPredicate = z.infer<typeof goalPredicate>;

export const goalState = z
  .object({
    derived_at: z.string().min(1),
    predicates: z.array(goalPredicate),
  })
  .strict();
export type GoalState = z.infer<typeof goalState>;

/** Parse-or-refuse: any predicate missing a verification means throws. */
export function parseGoalState(raw: unknown): GoalState {
  return goalState.parse(raw);
}

export type ConfirmResult = { ok: true; predicate: GoalPredicate } | { ok: false; reason: string };

/**
 * Confirm a predicate. Fail-closed: a predicate carrying no verification means
 * cannot be confirmed — there would be nothing to check it against later.
 */
export function confirmPredicate(candidate: unknown): ConfirmResult {
  const parsed = goalPredicate.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "검증수단 없는 술어는 confirm할 수 없다 — 나중에 무엇으로 검사할지가 없다",
    };
  }
  return { ok: true, predicate: { ...parsed.data, confirmed: true } };
}
