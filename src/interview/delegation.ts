import { z } from "zod";
import { goalState } from "./goal-state";
import { type Session, appendUtteranceTurn } from "./turn";

/**
 * Delegation — the user handing the remaining decisions over. Only an explicit
 * skip counts. A nudge ("are we there yet?") is impatience, and a partial
 * answer is an answer; reading either as permission to decide the rest is how
 * an interview quietly promotes its own preferences into the user's intent. So
 * those utterances are kept in the turn record and produce no delegation.
 *
 * What is recorded is the utterance verbatim plus the interpretation that was
 * acted on — and the interpretation is reflected back to the user, because a
 * delegation acted on an unstated reading is indistinguishable from a guess.
 * An empty interpretation is refused rather than stored.
 *
 * Delegation does not skip round 0. Handing over the details is not handing
 * over the goal, so a first-interaction delegation without the autonomous goal
 * derivation is refused: the interview would otherwise proceed with no standard
 * to judge completion against.
 *
 * Whether an utterance really is an explicit skip is a classification made
 * upstream; this module routes the tag, it does not judge it.
 */

export const delegationKind = z.enum(["explicit_skip"]);
export type DelegationKind = z.infer<typeof delegationKind>;

export const delegationRecordSchema = z
  .object({
    kind: delegationKind,
    /** Byte-for-byte what the user said — never trimmed, never normalized. */
    raw_utterance: z.string().min(1),
    interpretation: z.string().min(1),
  })
  .strict();
export type DelegationRecord = z.infer<typeof delegationRecordSchema>;

export function parseDelegationRecord(raw: unknown): DelegationRecord {
  return delegationRecordSchema.parse(raw);
}

export type UtteranceInput = {
  /** The upstream classification: explicit_skip / nudge / partial_answer / … */
  tag: string;
  utterance: string;
  interpretation?: string;
  /** Round-0 output, required when a first-interaction delegation arrives. */
  autonomous_goal_draft?: { derived_at?: string; predicates: unknown[] };
};

export type RecordUtteranceResult =
  | { accepted: true; session: Session }
  | { accepted: false; reason: string };

const EXPLICIT_SKIP: DelegationKind = "explicit_skip";

export function recordUserUtterance(
  session: Session,
  input: UtteranceInput,
): RecordUtteranceResult {
  const turn = { kind: "user_utterance" as const, tag: input.tag, utterance: input.utterance };

  if (input.tag !== EXPLICIT_SKIP) {
    return { accepted: true, session: appendUtteranceTurn(session, turn) };
  }

  if (!input.interpretation || input.interpretation.trim().length === 0) {
    return {
      accepted: false,
      reason: "위임에는 interpretation이 있어야 한다 — 되비치지 않은 해석으로 진행하지 않는다",
    };
  }

  let derivedGoalState = session.goal_state;
  if (derivedGoalState === undefined) {
    if (!input.autonomous_goal_draft) {
      return {
        accepted: false,
        reason: "위임은 라운드-0을 건너뛰지 못한다 — goal_state 도출이 없다",
      };
    }
    const parsed = goalState.safeParse({
      derived_at: input.autonomous_goal_draft.derived_at ?? new Date().toISOString(),
      predicates: input.autonomous_goal_draft.predicates,
    });
    if (!parsed.success) {
      return {
        accepted: false,
        reason: "자율 도출한 goal_state가 스키마를 통과하지 못했다",
      };
    }
    derivedGoalState = parsed.data;
  }

  const record = delegationRecordSchema.safeParse({
    kind: EXPLICIT_SKIP,
    raw_utterance: input.utterance,
    interpretation: input.interpretation,
  });
  if (!record.success) {
    return { accepted: false, reason: "위임 레코드가 형태 검사를 통과하지 못했다" };
  }

  const withTurn = appendUtteranceTurn(session, turn);
  return {
    accepted: true,
    session: {
      ...withTurn,
      goal_state: derivedGoalState,
      delegations: [...session.delegations, record.data],
    },
  };
}
