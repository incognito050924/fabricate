import { z } from "zod";
import { oracleSatisfactionRecordSchema } from "./oracle-satisfaction";
import { userJudgmentRecordSchema } from "./user-judgment";

/**
 * The goal state — round 0's artifact and the standard that governs the rest of
 * the interview. Each predicate is an observable world-condition paired with
 * the means of verifying it; a predicate without a verification means is
 * refused at parse time, and confirming one is refused too. "Complete" is later
 * judged against these predicates rather than against a list of questions.
 *
 * The same goal state is looked at through several lenses in this repo — the
 * live one below, the revisable one in goal-revision.ts, the persisted one
 * further down, the gate's reader in goal-state-gate.ts, and the summary's in
 * session.ts. They used to REFUSE each other's records, so a goal state derived
 * by round 0 could never be finalized and a correctly-linked question was
 * counted as an orphan. The live lens therefore carries the other lenses'
 * fields instead of discarding them: `text`, `judge` and `satisfied` are
 * optional passengers here, and unknown keys ride through rather than being
 * rejected. What this lens still OWNS is unchanged: an id, a statement, a
 * non-empty verification means, and a per-predicate confirmation flag.
 */

export const goalPredicate = z
  .object({
    id: z.string().min(1),
    statement: z.string().min(1),
    /** How this predicate gets checked. Empty means unverifiable — refused. */
    verification_means: z.string().min(1),
    confirmed: z.boolean(),
    /** The revisable lens's wording of the same predicate (goal-revision.ts). */
    text: z.string().optional(),
    /** The persisted lens's "who may settle this" (goal-state-gate.ts reads it). */
    judge: z.string().optional(),
    /** The summary lens's "does this world-condition hold yet" (session.ts). */
    satisfied: z.boolean().optional(),
  })
  .passthrough();
export type GoalPredicate = z.infer<typeof goalPredicate>;

export const goalState = z
  .object({
    /** The whole-state confirmation flag the revisable lens carries. */
    confirmed: z.boolean().optional(),
    derived_at: z.string().datetime({ offset: true }),
    predicates: z.array(goalPredicate).min(1),
  })
  .passthrough();
export type GoalState = z.infer<typeof goalState>;

/** Parse-or-refuse: any predicate missing a verification means throws. */
export function parseGoalState(raw: unknown): GoalState {
  return goalState.parse(raw);
}

/**
 * Read the predicate ids out of ANY goal-state shape, structurally.
 *
 * This deliberately does not go through zod: a reader that asks "which
 * predicates does this state name?" must not answer "none" merely because the
 * state was written through a different lens. Fail-closed on genuine
 * unreadability — a missing or non-array predicate list, or an id that is not
 * a non-blank string, yields null, which callers must treat as "this state
 * cannot vouch for anything" and NOT as "this state has no predicates".
 */
export function readPredicateIds(raw: unknown): string[] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const predicates = (raw as { predicates?: unknown }).predicates;
  if (!Array.isArray(predicates)) return null;

  const ids: string[] = [];
  for (const predicate of predicates) {
    if (typeof predicate !== "object" || predicate === null) return null;
    const id = (predicate as { id?: unknown }).id;
    if (typeof id !== "string" || id.trim().length === 0) return null;
    ids.push(id);
  }
  return ids;
}

/**
 * Is this goal state confirmed?
 *
 * A whole-state boolean wins when one is present — that is the flag the
 * revision path resets, and honouring it is what makes "revision costs the
 * confirmation" enforceable. When no such flag exists, confirmation is DERIVED
 * from the per-predicate flags: every predicate confirmed, and at least one
 * predicate to confirm. The empty predicate list is deliberately not vacuously
 * confirmed.
 *
 * NOTE: that derivation is an interpretation. The contract text does not state
 * the relation between the per-predicate flag and the whole-state one; see the
 * repair report's confession list.
 */
export function isGoalStateConfirmed(state: unknown): boolean {
  if (typeof state !== "object" || state === null) return false;

  const declared = (state as { confirmed?: unknown }).confirmed;
  if (typeof declared === "boolean") return declared;

  const predicates = (state as { predicates?: unknown }).predicates;
  if (!Array.isArray(predicates) || predicates.length === 0) return false;
  return predicates.every(
    (predicate) =>
      typeof predicate === "object" &&
      predicate !== null &&
      (predicate as { confirmed?: unknown }).confirmed === true,
  );
}

/**
 * The wording of a predicate, whichever lens wrote it. `text` is the revisable
 * lens's field and `statement` the live one's; a predicate carrying neither has
 * no wording to show, which reads as the empty string rather than a crash. No
 * gate consumes this yet — it exists so that consumers stop picking one field
 * name and silently losing the other.
 */
export function predicateText(predicate: { text?: string; statement?: string }): string {
  return predicate.text ?? predicate.statement ?? "";
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
 *
 * These three schemas are FROZEN by acceptance/ac-4.test.ts, which asserts the
 * mandatory `judge`, the `.datetime()` derived_at, the mandatory `confirmed`
 * and the `.strict()` unknown-key refusal. They are not relaxed here.
 *
 * Known conflict, measured 2026-07-26, to be resolved when those criteria are
 * built — NOT now:
 *  - acceptance/ac-10h.test.ts's goal-state fixture carries an `entailment` key
 *    on each predicate. `goalStateSchema.safeParse` REJECTS it:
 *    unrecognized_keys ["entailment"] at predicates[0].
 *  - a work item shaped like acceptance/ac-G3.test.ts's (an item-level
 *    `questions_asked` key) is REJECTED by persistedWorkItemSchema:
 *    unrecognized_keys ["questions_asked"]. (ac-G3 does not route its item
 *    through this schema today; it feeds goalStateGate directly.)
 * Whoever builds ac-10h and ac-G3 must revisit this `.strict()`.
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
