/**
 * The orphan gate — one place that decides whether a thing is attached to the
 * goal state, so question recording, dimension approval, AC finalization and
 * discovery-question adoption cannot drift apart.
 *
 * The gate only checks that an explicit link token is present. Whether the
 * token semantically reaches the right predicate is human judgment (ac-3
 * residual); nothing here grades prose.
 */

export type OrphanRejection = {
  kind: "orphan";
  /** The link field whose absence made this an orphan. */
  missing_field: string;
  reason: string;
};

export type ApprovalResult = {
  approved: boolean;
  rejection?: OrphanRejection;
};

export function isNonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** A link is present only when it is a non-blank string. */
export function hasGoalLink(ref: unknown): ref is string {
  return isNonBlank(ref);
}

export function orphanRejection(missingField: string): OrphanRejection {
  return {
    kind: "orphan",
    missing_field: missingField,
    reason: `${missingField} 없이는 목표에 닿지 않는다 — 고아로 거부한다`,
  };
}

export type DiscoveryQuestion = {
  question_text: string;
  asked_at: string;
  /** Which goal predicate this question proposes to revise. */
  revises_goal_predicate?: string;
};

/**
 * A discovery question earns the right to touch the goal state only by naming
 * the predicate it revises. Unnamed, it is an orphan like any other.
 */
export function approveDiscoveryQuestion(question: DiscoveryQuestion): ApprovalResult {
  if (!hasGoalLink(question.revises_goal_predicate)) {
    return { approved: false, rejection: orphanRejection("revises_goal_predicate") };
  }
  return { approved: true };
}
