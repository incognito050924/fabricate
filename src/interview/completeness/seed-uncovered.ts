import {
  type DimensionNode,
  type FragmentMapping,
  type IntentFragment,
  computeFragmentCoverage,
} from "./fragment-mapping";

/**
 * Planting the uncovered fragments as dimensions. An uncovered fragment is
 * something the user said that the interview never turned into a question, so
 * it becomes an open dimension of discovered origin — a visible hole rather
 * than a report nobody reads.
 *
 * Seeding is idempotent: a fragment that already carries a seed is not seeded
 * again. Otherwise running the completeness check twice would breed duplicates,
 * and each duplicate would have to be closed separately to reach readiness.
 */

export type SeedResult = {
  dimensions: DimensionNode[];
  /** The fragments seeded by THIS run — empty on a repeat run. */
  seededFragmentIds: string[];
};

export function seedUncoveredFragments(input: {
  fragments: readonly IntentFragment[];
  mappings: readonly FragmentMapping[];
  dimensions: readonly DimensionNode[];
}): SeedResult {
  const coverage = computeFragmentCoverage(input);
  const alreadySeeded = new Set(
    input.dimensions
      .filter((dimension) => dimension.origin === "discovered")
      .map((dimension) => dimension.fragment_id),
  );

  const fragmentsById = new Map(input.fragments.map((fragment) => [fragment.id, fragment]));
  const seededFragmentIds = coverage.uncovered_fragment_ids.filter(
    (fragmentId) => !alreadySeeded.has(fragmentId),
  );

  const seeds: DimensionNode[] = seededFragmentIds.map((fragmentId) => ({
    id: `dim-seed-${fragmentId}`,
    label: fragmentsById.get(fragmentId)?.text ?? fragmentId,
    origin: "discovered",
    state: "open",
    fragment_id: fragmentId,
  }));

  return { dimensions: [...input.dimensions, ...seeds], seededFragmentIds };
}
