import { z } from "zod";
import { oracleSatisfactionRecordSchema } from "./oracle-satisfaction";
import { userJudgmentRecordSchema } from "./user-judgment";

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

/**
 * The persisted form of the goal state — what survives on disk between runs, so
 * that "is the goal established?" can be asked again later by a reader that was
 * not present when the interview happened.
 *
 * Each predicate names its judge. 'oracle' means a machine check decides it;
 * 'user' means only a recorded human verdict can. The judge is mandatory: a
 * predicate with no judge has no one who can ever settle it.
 */

export const predicateJudge = z.enum(["oracle", "user"]);
export type PredicateJudge = z.infer<typeof predicateJudge>;

export const persistedGoalPredicateSchema = z
  .object({
    id: z.string().min(1),
    statement: z.string().min(1),
    verification_means: z.string().min(1),
    judge: predicateJudge,
  })
  .strict();
export type PersistedGoalPredicate = z.infer<typeof persistedGoalPredicateSchema>;

export const goalStateSchema = z
  .object({
    derived_at: z.string().datetime(),
    confirmed: z.boolean(),
    predicates: z.array(persistedGoalPredicateSchema),
  })
  .strict();
export type PersistedGoalState = z.infer<typeof goalStateSchema>;

/**
 * The stored work-item record. goal_state is a member field of it — a
 * discriminant that persists with the item rather than a value recomputed at
 * close time. It is optional so items that predate an interview still parse,
 * and the gate treats its absence as "nothing to judge" rather than "nothing
 * blocks" by accident.
 */
export const persistedWorkItemSchema = z
  .object({
    id: z.string().min(1),
    goal_state: goalStateSchema.optional(),
    oracle_satisfaction: z.array(oracleSatisfactionRecordSchema),
    user_judgments: z.array(userJudgmentRecordSchema),
  })
  .strict();
export type PersistedWorkItem = z.infer<typeof persistedWorkItemSchema>;
