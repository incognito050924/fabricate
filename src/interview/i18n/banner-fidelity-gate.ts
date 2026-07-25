/**
 * The banner fidelity gate (ADR-20260713) applied to the whole static-copy
 * surface. Whether a Korean line reads naturally is a human judgment; what a
 * machine can do is catch the wordings that were already agreed against, so
 * this gate greps each copy for the agreed-vocabulary avoid terms.
 *
 * Two aggregation rules carry the weight. One violation rejects the entire
 * gate — an exhaustive review that passes with a known-bad line reviewed the
 * wrong thing. And a copy with no verdict is not a pass: unjudged keys block
 * the overall result, so forgetting to review is never indistinguishable from
 * reviewing and finding nothing.
 *
 * Which terms belong on the avoid list is the agreed-vocabulary glossary's
 * judgment (ac-21), not this module's; what this module fixes is that the list
 * is applied to every key, deterministically.
 */

import { STATIC_COPY_CATALOG, type StaticCopyCatalog } from "./static-copy-catalog";
import { enumerateCoverage } from "./static-copy-coverage";

/** Translationese rejected for user-facing copy — the machine-checkable subset. */
export const INTERVIEW_AVOID_TERMS: readonly string[] = ["여정", "당신", "귀하", "원활한"];

export type FidelityViolation = {
  term: string;
};

export type CopyFidelityJudgment = {
  catalog_key: string;
  /** The copy as it stands in the catalog — verbatim, never normalized. */
  text: string;
  passed: boolean;
  violations: FidelityViolation[];
};

export function judgeCopyFidelity(input: {
  catalog_key: string;
  text: string;
  avoid_terms: string[];
}): CopyFidelityJudgment {
  const violations = input.avoid_terms
    .filter((term) => input.text.includes(term))
    .map((term) => ({ term }));

  return {
    catalog_key: input.catalog_key,
    text: input.text,
    passed: violations.length === 0,
    violations,
  };
}

export type FidelityGateResult = {
  passed: boolean;
  violating_keys: string[];
  unjudged_keys: string[];
};

export function aggregateFidelityGate(input: {
  coverage_keys: string[];
  judgments: CopyFidelityJudgment[];
}): FidelityGateResult {
  const byKey = new Map(input.judgments.map((judgment) => [judgment.catalog_key, judgment]));

  const unjudged_keys = input.coverage_keys.filter((key) => !byKey.has(key));
  const violating_keys = input.coverage_keys.filter((key) => byKey.get(key)?.passed === false);

  return {
    passed: unjudged_keys.length === 0 && violating_keys.length === 0,
    violating_keys,
    unjudged_keys,
  };
}

export type FidelityGateReport = FidelityGateResult & {
  avoid_terms: string[];
  coverage_keys: string[];
  judgments: CopyFidelityJudgment[];
};

/** The whole surface, reviewed: coverage from the catalog, a verdict per key. */
export function runStaticCopyFidelityGate(
  catalog: StaticCopyCatalog = STATIC_COPY_CATALOG,
): FidelityGateReport {
  const avoid_terms = [...INTERVIEW_AVOID_TERMS];
  const coverage_keys = enumerateCoverage(catalog).map((row) => row.catalog_key);
  const judgments = coverage_keys.map((key) =>
    judgeCopyFidelity({
      catalog_key: key,
      text: catalog[key]?.ko ?? "",
      avoid_terms,
    }),
  );

  return {
    ...aggregateFidelityGate({ coverage_keys, judgments }),
    avoid_terms,
    coverage_keys,
    judgments,
  };
}
