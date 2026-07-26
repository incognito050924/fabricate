/**
 * Review coverage over the static-copy catalog. "Exhaustive review" is only
 * meaningful if the list of what was reviewed is derived from the catalog
 * itself: a hand-maintained list silently stops covering the copy added after
 * it was written. So coverage is enumerated FROM the catalog keys, and the
 * completeness check reports both directions of mismatch — copy that no row
 * covers, and rows that cover copy the catalog does not have.
 *
 * Review rows reference catalog keys and carry review verdicts. They may not
 * carry copy: a review record holding its own Korean string is a second
 * translation table wearing a review record's clothes.
 */

import type { StaticCopyCatalog } from "./static-copy-catalog";

export type CoverageRow = {
  catalog_key: string;
  kind: string;
};

export function enumerateCoverage(catalog: StaticCopyCatalog): CoverageRow[] {
  return Object.entries(catalog).map(([catalog_key, entry]) => ({
    catalog_key,
    kind: entry.kind,
  }));
}

export type CoverageCompleteness =
  | { complete: true }
  | { complete: false; missing_keys: string[]; phantom_keys: string[] };

export function checkCoverageCompleteness(
  catalog: StaticCopyCatalog,
  coverage: readonly { catalog_key: string }[],
): CoverageCompleteness {
  const catalogKeys = new Set(Object.keys(catalog));
  const coveredKeys = new Set(coverage.map((row) => row.catalog_key));

  const missing_keys = [...catalogKeys].filter((key) => !coveredKeys.has(key)).sort();
  const phantom_keys = [...coveredKeys].filter((key) => !catalogKeys.has(key)).sort();

  if (missing_keys.length === 0 && phantom_keys.length === 0) {
    return { complete: true };
  }
  return { complete: false, missing_keys, phantom_keys };
}

export type ReviewRecordValidation = { accepted: true } | { accepted: false; reason: string };

const HANGUL = /[가-힣]/;

/**
 * The review layer's entire vocabulary: which catalog key was reviewed, what
 * kind of copy it is, the verdict, and the violations behind it.
 *
 * An allowlist rather than a blocklist, because a blocklist only rejects the
 * copy-shaped fields somebody thought of — `en: "Welcome to the interview"`
 * carries a second surface string past every Korean-shaped test.
 */
export const REVIEW_RECORD_FIELDS = ["catalog_key", "kind", "passed", "violations"] as const;

const isAllowed = (field: string): boolean =>
  (REVIEW_RECORD_FIELDS as readonly string[]).includes(field);

/** Fields carrying a shape they were not given hold copy in disguise. */
function holdsCopy(field: string, value: unknown): boolean {
  switch (field) {
    // The kind is an internal English tag; Korean in it is user-facing copy.
    case "kind":
      return typeof value !== "string" || HANGUL.test(value);
    case "passed":
      return typeof value !== "boolean";
    case "violations":
      return !Array.isArray(value);
    default:
      return true;
  }
}

export function validateReviewRecord(record: Record<string, unknown>): ReviewRecordValidation {
  const key = record.catalog_key;
  if (typeof key !== "string" || key.trim().length === 0) {
    return { accepted: false, reason: "missing_catalog_key" };
  }

  for (const [field, value] of Object.entries(record)) {
    if (field === "catalog_key") continue;
    if (!isAllowed(field) || holdsCopy(field, value)) {
      return { accepted: false, reason: "parallel_translation_table" };
    }
  }

  return { accepted: true };
}
