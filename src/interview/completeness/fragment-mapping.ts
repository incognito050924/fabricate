/**
 * Reverse-mapping the original intent onto the dimensions being interviewed.
 * The question it answers is not "did we cover the dimensions?" but "is there a
 * piece of what the user actually asked for that no dimension is about?" —
 * which is the failure that survives an interview feeling complete.
 *
 * Coverage counts only against dimensions that really exist. A mapping naming a
 * node that is not in the structure covers nothing, and treating it as coverage
 * would make a typo look like an answered fragment.
 *
 * Whether a mapping is semantically right — whether that dimension truly covers
 * that fragment — is judged upstream; this module checks node existence and
 * routes the rest.
 */

export type IntentFragment = {
  id: string;
  text: string;
};

export type FragmentMapping = {
  fragment_id: string;
  dimension_id: string;
};

export type DimensionNode = {
  id: string;
  label?: string;
  origin?: string;
  state?: string;
  fragment_id?: string;
  drop_reason?: string;
};

export type FragmentCoverage = {
  covered: Array<{ fragment_id: string; dimension_ids: string[] }>;
  uncovered_fragment_ids: string[];
};

/** A fragment with no text says nothing to cover. */
export function isRealFragment(fragment: IntentFragment): boolean {
  return typeof fragment.text === "string" && fragment.text.trim().length > 0;
}

export function computeFragmentCoverage(input: {
  fragments: readonly IntentFragment[];
  mappings: readonly FragmentMapping[];
  dimensions: readonly DimensionNode[];
}): FragmentCoverage {
  const existingNodeIds = new Set(input.dimensions.map((dimension) => dimension.id));
  const covered: FragmentCoverage["covered"] = [];
  const uncovered_fragment_ids: string[] = [];

  for (const fragment of input.fragments.filter(isRealFragment)) {
    const dimension_ids = input.mappings
      .filter((mapping) => mapping.fragment_id === fragment.id)
      .map((mapping) => mapping.dimension_id)
      .filter((dimensionId) => existingNodeIds.has(dimensionId));

    if (dimension_ids.length > 0) {
      covered.push({ fragment_id: fragment.id, dimension_ids });
    } else {
      uncovered_fragment_ids.push(fragment.id);
    }
  }

  return { covered, uncovered_fragment_ids };
}
