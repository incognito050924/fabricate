/**
 * Echo check for the round-0 restatement. Confirming the goal by repeating the
 * user's own words proves nothing — it only shows the words were copied. So a
 * restatement that reuses too much of the source's vocabulary is refused as an
 * echo.
 *
 * The metric is deliberately crude and explicit: the fraction of the source's
 * DISTINCT whitespace tokens that reappear in the restatement. Exceeding the
 * threshold is an echo; landing exactly on it is not. This is a structural
 * approximation only — whether a sub-threshold restatement is a genuine
 * paraphrase is human judgment and stays a declared residual.
 */

export const ECHO_OVERLAP_THRESHOLD = 0.6;

const distinctTokens = (text: string): Set<string> =>
  new Set(text.split(/\s+/).filter((token) => token.length > 0));

export type RestatementCheck =
  | { accepted: true; overlap: number }
  | { accepted: false; overlap: number; reason: string };

export function checkRestatement(sourceRequest: string, restatement: string): RestatementCheck {
  const sourceTokens = distinctTokens(sourceRequest);
  const restatementTokens = distinctTokens(restatement);
  const shared = [...sourceTokens].filter((token) => restatementTokens.has(token)).length;
  const overlap = sourceTokens.size === 0 ? 0 : shared / sourceTokens.size;

  if (overlap > ECHO_OVERLAP_THRESHOLD) {
    return {
      accepted: false,
      overlap,
      reason: `되말하기가 원문 토큰을 과다 재사용해 에코로 거부된다 (중복 ${overlap.toFixed(3)} > 임계 ${ECHO_OVERLAP_THRESHOLD})`,
    };
  }
  return { accepted: true, overlap };
}
