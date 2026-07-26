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

import { scanAvoidViolations } from "../glossary/avoid-scan";
import { INTERVIEW_GLOSSARY, glossaryAvoidTerms } from "../glossary/interview-vocabulary";
import { STATIC_COPY_CATALOG, type StaticCopyCatalog } from "./static-copy-catalog";
import { enumerateCoverage } from "./static-copy-coverage";

/**
 * Derived, never retyped: the terms are the agreed-vocabulary glossary's, and a
 * term added there reaches every banner without anyone editing this file.
 */
export const INTERVIEW_AVOID_TERMS: readonly string[] = glossaryAvoidTerms(INTERVIEW_GLOSSARY);

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
  // The grep is the glossary's scanner — this module keeps no second one.
  const violations = scanAvoidViolations(
    [{ concept: input.catalog_key, avoid: input.avoid_terms }],
    input.text,
  ).map((violation) => ({ term: violation.term }));

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

/**
 * The floor under "전수 검수". An empty catalog enumerates to an empty coverage,
 * which aggregates to a pass — reviewing nothing would otherwise be reported as
 * having reviewed everything.
 */
export type CatalogFloor = { ok: true } | { ok: false; reason: "empty_catalog" };

export function checkCatalogFloor(catalog: StaticCopyCatalog): CatalogFloor {
  return Object.keys(catalog).length === 0 ? { ok: false, reason: "empty_catalog" } : { ok: true };
}

export type FidelityGateReport = FidelityGateResult & {
  catalog_floor: CatalogFloor;
  avoid_terms: string[];
  coverage_keys: string[];
  judgments: CopyFidelityJudgment[];
};

const hasCopy = (entry: { ko?: unknown } | undefined): boolean =>
  typeof entry?.ko === "string" && entry.ko.trim().length > 0;

/** The whole surface, reviewed: coverage from the catalog, a verdict per key. */
export function runStaticCopyFidelityGate(
  catalog: StaticCopyCatalog = STATIC_COPY_CATALOG,
): FidelityGateReport {
  const avoid_terms = [...INTERVIEW_AVOID_TERMS];
  const coverage_keys = enumerateCoverage(catalog).map((row) => row.catalog_key);
  // A key with no copy is left UNJUDGED rather than judged over "": a verdict
  // over a string the catalog never held is the fail-open this gate exists to
  // refuse. It lands in unjudged_keys and blocks the pass.
  const judgments = coverage_keys
    .filter((key) => hasCopy(catalog[key]))
    .map((key) =>
      judgeCopyFidelity({ catalog_key: key, text: catalog[key]?.ko ?? "", avoid_terms }),
    );

  const aggregate = aggregateFidelityGate({ coverage_keys, judgments });
  const catalog_floor = checkCatalogFloor(catalog);

  return {
    ...aggregate,
    passed: aggregate.passed && catalog_floor.ok,
    catalog_floor,
    avoid_terms,
    coverage_keys,
    judgments,
  };
}
