/**
 * The acceptance-testability gate. An intent statement may only be locked when
 * it says something a later run can actually check: a concrete trigger leading
 * to a countable outcome, with none of the hedge words that let a statement
 * feel agreed while committing to nothing.
 *
 * Both patterns are deliberate APPROXIMATIONS, not decisions about vagueness.
 * They catch the listed hedges and require an observable shape; whether a
 * statement that clears them is genuinely testable stays human judgment and is
 * a declared residual. The gate fails closed — anything it cannot see as
 * observable is refused.
 */

/** Hedge words that let a statement pass as agreed while committing to nothing. */
export const VAGUE_TERMS = /(적절히|적당히|충분히|빠르게|원활히|안정적으로|유연하게|알아서|쉽게)/;

/** A trigger clause ("…면") followed by a countable outcome ("1건", "3회", …). */
export const OBSERVABLE = /면[\s\S]*?\d+\s*(?:건|개|회|번|명|줄|초|분|시간|ms|s|%)/;

export type AcceptanceTestableResult =
  | { ok: true; pass: { statement: string } }
  | { ok: false; reason: string };

export function acceptanceTestable(statement: string): AcceptanceTestableResult {
  if (VAGUE_TERMS.test(statement)) {
    return {
      ok: false,
      reason: `acceptanceTestable 거부 — 모호 표현이 남아 나중에 무엇을 검사할지 정해지지 않는다: ${statement}`,
    };
  }
  if (!OBSERVABLE.test(statement)) {
    return {
      ok: false,
      reason: `acceptanceTestable 거부 — 관찰 가능한 조건→셀 수 있는 결과 형태가 아니다: ${statement}`,
    };
  }
  return { ok: true, pass: { statement } };
}
