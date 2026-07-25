import type { AssumptionRecord } from "./assumption-ledger";

/**
 * Retrospective settlement — going back over the logged assumptions and
 * comparing what was believed against what turned out. Its target set is every
 * assumption in the ledger, whatever its origin: settling only the interview's
 * assumptions would score the careful ones and leave the hurried ones unscored,
 * which is precisely backwards.
 *
 * Each settlement carries the correlation blind spot in writing. The confidence
 * values being settled all came from the same model prior, so several machines
 * agreeing about an assumption is one opinion repeated, not corroboration. The
 * note does not fix that — nothing here can — but it stops the agreement from
 * being read as evidence.
 *
 * Whether a settled outcome matches retrospective fact needs the actual
 * outcome; this module fixes the target set and the notation, not the verdicts.
 */

export const CORRELATION_BLIND_SPOT =
  "신뢰도 값들이 같은 모델 prior에서 나왔다 — 기계 간 일치를 독립 증거로 가산하지 않는다";

export type SettlementResult = {
  targets: AssumptionRecord[];
  correlation_blind_spot: string;
};

export function runRetroSettlement(records: readonly AssumptionRecord[]): SettlementResult {
  return {
    // No origin filter, by design.
    targets: [...records],
    correlation_blind_spot: CORRELATION_BLIND_SPOT,
  };
}
