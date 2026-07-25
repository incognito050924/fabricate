import { type KDiffRecord, kDiffRecordSchema } from "./k-diff";

/**
 * Routing on materiality. Three destinations, from two inputs: whether the diff
 * is material, and how reversible the decision is.
 *
 * An immaterial diff never asks, whatever the risk tag. If the readings produce
 * the same behavior, the question has no answer that changes anything, and
 * asking it spends the user's attention on the interview's own uncertainty.
 * What it does instead is assume and log visibly — with the k-diff record
 * attached as evidence, so "we checked and it didn't matter" is a claim someone
 * can inspect rather than take on trust.
 *
 * A material diff on a reversible decision assumes and logs too; a material
 * diff on an irreversible one asks, naming the divergence point so the user
 * answers the fork rather than the whole subject.
 */

export const ASSUME_PLUS_VISIBLE_LOG = "가정+가시로그";
export const DIVERGENCE_QUESTION = "분기점 질문";
export const ASSUMPTION_LOG = "가정로그";

export type MaterialityRoute =
  | typeof ASSUME_PLUS_VISIBLE_LOG
  | typeof DIVERGENCE_QUESTION
  | typeof ASSUMPTION_LOG;

export type VisibleLogEntry = {
  entry: string;
  /** The k-diff that justified assuming instead of asking. */
  evidence?: KDiffRecord;
};

export type AssumptionLogEntry = {
  entry: string;
};

export type DivergenceQuestion = {
  question: string;
  divergence_point?: string;
};

export type MaterialityRouting = {
  route: MaterialityRoute;
  questions: DivergenceQuestion[];
  visible_log: VisibleLogEntry[];
  assumption_log: AssumptionLogEntry[];
};

const LOW_RISK_REVERSIBLE = "low-risk-reversible";

export function routeMateriality(input: {
  k_diff: unknown;
  risk_tag: string;
}): MaterialityRouting {
  const kDiff = kDiffRecordSchema.parse(input.k_diff);

  if (kDiff.material === false) {
    return {
      route: ASSUME_PLUS_VISIBLE_LOG,
      questions: [],
      visible_log: [
        {
          entry: "해석들이 같은 행동으로 수렴해 묻지 않고 가정으로 진행한다",
          evidence: kDiff,
        },
      ],
      assumption_log: [],
    };
  }

  if (input.risk_tag === LOW_RISK_REVERSIBLE) {
    return {
      route: ASSUMPTION_LOG,
      questions: [],
      visible_log: [],
      assumption_log: [
        {
          entry: `해석이 갈리지만 되돌릴 수 있어 가정으로 진행한다: ${
            kDiff.divergence_point ?? "분기점 미기재"
          }`,
        },
      ],
    };
  }

  // Anything not tagged reversible is treated as irreversible — asking is the
  // recoverable mistake.
  const point = kDiff.divergence_point;
  return {
    route: DIVERGENCE_QUESTION,
    questions: [
      {
        question: point
          ? `해석이 갈리는 지점입니다 — ${point}. 어느 쪽입니까?`
          : "해석이 갈리는데 분기점이 기재되지 않았습니다. 어느 쪽입니까?",
        ...(point === undefined ? {} : { divergence_point: point }),
      },
    ],
    visible_log: [],
    assumption_log: [],
  };
}

export type AttachmentCheckResult = { ok: true } | { ok: false; reason: string };

/** An assumption logged without its k-diff is an assumption without evidence. */
export function checkKDiffAttachment(input: {
  visible_log: readonly VisibleLogEntry[];
}): AttachmentCheckResult {
  const unattached = input.visible_log.filter(
    (record) => !kDiffRecordSchema.safeParse(record.evidence).success,
  );
  if (unattached.length > 0) {
    return {
      ok: false,
      reason: "k-diff 레코드가 첨부되지 않은 가정 로그다 — 증거 없는 가정은 남기지 않는다",
    };
  }
  return { ok: true };
}
