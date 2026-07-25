/**
 * What a reprojection diff touched has to be confirmed again. An item agreed
 * three rounds ago was agreed under the understanding of that moment; once a
 * later answer reaches it, the old agreement covers a different statement than
 * the one now standing.
 *
 * The marking is exactly the diff's touched set — no wider (re-confirming
 * everything makes confirmation meaningless) and no narrower. Untouched items
 * are returned marked false rather than left ambiguous, so "not marked" is a
 * readable fact rather than a missing field.
 */

import type { PriorItem, ReprojectionDiff } from "./reprojection-diff";

export type MarkedItem = PriorItem & {
  reconfirm_required: boolean;
};

export function markReconfirmRequired(input: {
  items: readonly PriorItem[];
  diff: ReprojectionDiff;
}): MarkedItem[] {
  const touched = new Set(input.diff.touched_item_ids);
  return input.items.map((item) => ({ ...item, reconfirm_required: touched.has(item.id) }));
}
