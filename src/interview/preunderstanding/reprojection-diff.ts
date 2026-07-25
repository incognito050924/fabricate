/**
 * Reprojection: after each bundle of answers, the WHOLE intent is re-read
 * against what was just learned, and the diff records which prior items the
 * bundle reached. Without it, an answer lands only where the question was
 * pointed, and everything decided earlier keeps its old meaning under new
 * facts.
 *
 * One diff per bundle, and the advance gate is fail-closed on coverage: every
 * bundle already processed must be named by a diff of its own. Counting diffs
 * would let two diffs for one bundle stand in for another's — which is exactly
 * the bundle whose consequences nobody looked at.
 *
 * Which prior items a bundle really touches is a judgment made upstream (the
 * bundle's revision tags); this module routes those tags, it does not derive
 * them.
 */

export type PriorItem = {
  id: string;
  statement: string;
};

export type AnswerBundle = {
  id: string;
  answers: string[];
  /** Prior items this bundle revises — tagged upstream, routed here. */
  revised_item_ids: string[];
};

export type ReprojectionDiff = {
  bundle_id: string;
  touched_item_ids: string[];
};

export function reprojectAnswerBundles(input: {
  bundles: readonly AnswerBundle[];
  prior_items: readonly PriorItem[];
  sheet?: unknown;
}): { diffs: ReprojectionDiff[] } {
  const knownIds = new Set(input.prior_items.map((item) => item.id));

  return {
    diffs: input.bundles.map((bundle) => ({
      bundle_id: bundle.id,
      touched_item_ids: bundle.revised_item_ids.filter((id) => knownIds.has(id)),
    })),
  };
}

export type BundleAdvanceResult = { ok: true } | { ok: false; reason: string };

export function gateBundleAdvance(input: {
  processed_bundle_ids: string[];
  diffs: readonly ReprojectionDiff[];
  next_bundle_id: string;
}): BundleAdvanceResult {
  const counts = new Map<string, number>();
  for (const diff of input.diffs) {
    counts.set(diff.bundle_id, (counts.get(diff.bundle_id) ?? 0) + 1);
  }

  const uncovered = input.processed_bundle_ids.filter((id) => (counts.get(id) ?? 0) === 0);
  if (uncovered.length > 0) {
    return {
      ok: false,
      reason: `재투영 diff 없는 처리 묶음: ${uncovered.join(", ")} — 다음 묶음으로 넘어갈 수 없다`,
    };
  }

  const duplicated = input.processed_bundle_ids.filter((id) => (counts.get(id) ?? 0) > 1);
  if (duplicated.length > 0) {
    return {
      ok: false,
      reason: `한 묶음에 diff가 여러 건이다: ${duplicated.join(", ")} — 개수는 커버리지가 아니다`,
    };
  }

  const processed = new Set(input.processed_bundle_ids);
  const foreign = [...counts.keys()].filter((id) => !processed.has(id));
  if (foreign.length > 0) {
    return {
      ok: false,
      reason: `처리하지 않은 묶음의 diff: ${foreign.join(", ")} — 다른 묶음을 대신 덮지 못한다`,
    };
  }

  return { ok: true };
}
