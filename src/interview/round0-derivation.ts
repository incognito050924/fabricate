import type { Turn } from "./record-turn";

/**
 * Round-0 derivation bookkeeping. The initial derivation of the goal state is
 * ONE interaction: exactly one fired turn, taken once. Quietly re-deriving the
 * goal in a fresh interaction is how an interview drifts away from what the
 * user actually said, so it is refused. Revision remains open — but only when
 * it names the predicate it revises, which is what makes the change reviewable
 * instead of a silent restart.
 */

export interface InitialInteraction {
  kind: "initial";
  turns: Turn[];
}

export interface RevisionInteraction {
  kind: "revision";
  turns: Turn[];
  revises_goal_predicate?: string;
}

export type DerivationInteraction = InitialInteraction | RevisionInteraction;

export interface DerivationRecord {
  kind: "initial" | "revision";
  firedTurnCount: number;
  revises_goal_predicate?: string;
}

export type DerivationResult =
  | { accepted: true; record: DerivationRecord }
  | { accepted: false; reason: string; firedTurnCount: number };

const countFired = (turns: Turn[]): number =>
  turns.filter((turn) => turn.kind === "fired_question").length;

/**
 * Judge one derivation interaction against the previous record (null when none
 * has been taken yet). Fail-closed: every refusal carries its own reason so the
 * three failure modes stay distinguishable.
 */
export function recordDerivationInteraction(
  previous: DerivationRecord | null,
  interaction: DerivationInteraction,
): DerivationResult {
  const firedTurnCount = countFired(interaction.turns);

  if (firedTurnCount !== 1) {
    return {
      accepted: false,
      firedTurnCount,
      reason: `라운드-0 도출은 단일 상호작용이어야 한다 — fired 턴이 정확히 1개여야 하는데 ${firedTurnCount}개다`,
    };
  }

  if (interaction.kind === "initial") {
    if (previous !== null) {
      return {
        accepted: false,
        firedTurnCount,
        reason: "초기 도출을 fresh 상호작용으로 다시 도는 반복 재도출은 거부된다",
      };
    }
    return { accepted: true, record: { kind: "initial", firedTurnCount } };
  }

  const target = interaction.revises_goal_predicate;
  if (target === undefined || target.length === 0) {
    return {
      accepted: false,
      firedTurnCount,
      reason: "개정 상호작용은 revises_goal_predicate로 개정 대상을 명시해야 한다",
    };
  }
  return {
    accepted: true,
    record: { kind: "revision", firedTurnCount, revises_goal_predicate: target },
  };
}
