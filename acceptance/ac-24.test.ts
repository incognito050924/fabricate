/**
 * ac-24 acceptance — reverse-direction (d): exhaustive static-copy review of
 * the new interview surface (coverage enumeration + ADR-20260713 banner
 * fidelity gate), consuming the wi_2607130ld i18n catalog seam.
 * Frozen red: the modules under src/interview/i18n/ do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-24.json), covered clauses:
 *  (1) coverage enumeration (deterministic) — a coverage enumeration output
 *      exists and its key set matches the interview-surface static-copy
 *      catalog key set exactly 1:1; a fixture where a catalog copy is missing
 *      from coverage FAILS, and a fixture with a ghost coverage row whose key
 *      is absent from the catalog also FAILS.
 *  (2) ADR-20260713 banner fidelity gate (deterministic) — every copy
 *      enumerated in coverage must pass the gate for an overall pass; the
 *      gate detects machine-detectable fidelity violations (e.g. agreed-
 *      vocabulary avoid-list grep hits) deterministically (same input → same
 *      verdict); a single violating copy rejects the whole gate fail-closed;
 *      a copy without a gate verdict is never counted as passed
 *      (no-verdict = not-passed). The real-surface application of the gate is
 *      pinned end-to-end: the gate report must carry one verdict per catalog
 *      key, judged over that key's verbatim `ko` copy, under a non-empty
 *      avoid list that is proven to actually screen (every declared avoid
 *      term, injected into a probe catalog, must flip the gate to fail).
 *  (3) wi_2607130ld i18n dependency / deepen-only / no duplicate
 *      implementation (deterministic structure check) — coverage enumeration
 *      is derived from the i18n static-copy catalog keys and only consumes
 *      them; review-layer records carry only catalog-key references and
 *      fidelity-review fields, never their own translation string table; a
 *      review record carrying a parallel translation table is rejected.
 *  (4) scope boundary — banner hard promotion belongs to #30; this file
 *      asserts nothing about promotion behavior.
 *
 * Residual (NOT tested here, per row residual):
 *  - Per-copy fidelity content judgment — whether each Korean copy is
 *    actually faithful and natural is a human-judged predicate; only
 *    enumeration exhaustiveness, machine-detectable violation detection and
 *    fail-closed aggregation are closed here. In particular this file never
 *    asserts WHICH terms belong on the avoid list (that is the ac-21 agreed-
 *    vocabulary glossary's content judgment); it asserts only that the list
 *    is non-empty and that every term on it demonstrably screens.
 *  - ADR-20260713 source conformance — the ADR is external to this repo, so
 *    semantic agreement of the implemented gate rules with the ADR text is
 *    not closed by this criterion.
 *  - Real wi_2607130ld linkage and global duplicate absence — only
 *    approximated by the structure checks (key derivation, absence of a
 *    parallel translation table); the final judgment is not closed here.
 *  - Banner hard promotion — declared #30's scope by the contract itself.
 */
import { describe, expect, test } from "bun:test";
import {
  aggregateFidelityGate,
  judgeCopyFidelity,
  runStaticCopyFidelityGate,
} from "../src/interview/i18n/banner-fidelity-gate";
import { STATIC_COPY_CATALOG } from "../src/interview/i18n/static-copy-catalog";
import {
  checkCoverageCompleteness,
  enumerateCoverage,
  validateReviewRecord,
} from "../src/interview/i18n/static-copy-coverage";

// Fixture catalog in the same shape as the real seam: key → { kind, ko }.
// The Korean copy content itself is residual; fixtures only exercise the
// deterministic enumeration / gate / structure predicates.
const FIXTURE_CATALOG = {
  "interview.banner.start": { kind: "banner", ko: "인터뷰를 시작합니다" },
  "interview.prompt.goal": { kind: "prompt", ko: "목표를 한 문장으로 알려주세요" },
  "interview.label.done": { kind: "label", ko: "완료" },
} as const;

const FIXTURE_KEYS = Object.keys(FIXTURE_CATALOG).sort();

// Agreed-vocabulary avoid terms (translationese) as gate fixture input.
// Whether these are the right avoid terms is ac-21/residual territory; here
// they only drive the deterministic grep detection.
const AVOID_TERMS = ["여정", "당신"] as const;
const CLEAN_COPY = "인터뷰를 시작합니다";
const VIOLATING_COPY = "여정을 시작합니다";
const DOUBLE_VIOLATING_COPY = "당신의 여정을 시작합니다";

// The three user-facing copy kinds the oracle names (배너·프롬프트·라벨).
const REQUIRED_COPY_KINDS = ["banner", "prompt", "label"] as const;
// A catalog with a single string cannot make "전수 검수" mean anything, so the
// real seam must populate every declared kind with more than one entry.
const MIN_ENTRIES_PER_KIND = 2;
const HANGUL = /[가-힣]/;

const catalogKeysSorted = (catalog: Record<string, unknown>): string[] =>
  Object.keys(catalog).sort();

const sortedByCatalogKey = <T extends { catalog_key: string }>(rows: readonly T[]): T[] =>
  [...rows].sort((left, right) => left.catalog_key.localeCompare(right.catalog_key));

// Same entries, insertion order reversed — used to prove the gate/enumeration
// verdicts do not depend on catalog key iteration order.
const reverseKeyOrder = <T>(catalog: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(catalog).reverse());

describe("ac-24 clause 1 — coverage enumeration is exhaustive over the catalog (1:1 keys)", () => {
  test("real catalog: coverage output exists and its key set equals the catalog key set exactly", () => {
    const coverage = enumerateCoverage(STATIC_COPY_CATALOG);
    const coverageKeys = coverage.map((row) => row.catalog_key).sort();

    expect(coverageKeys).toEqual(catalogKeysSorted(STATIC_COPY_CATALOG));
    expect(coverage.length).toBe(Object.keys(STATIC_COPY_CATALOG).length);

    const completeness = checkCoverageCompleteness(STATIC_COPY_CATALOG, coverage);
    expect(completeness.complete).toBe(true);
  });

  test("fixture catalog: enumeration derives one coverage row per catalog key", () => {
    const coverage = enumerateCoverage(FIXTURE_CATALOG);

    expect(coverage.map((row) => row.catalog_key).sort()).toEqual(FIXTURE_KEYS);
  });

  test("enumeration is order-independent: reversing catalog key order yields the same coverage key set", () => {
    const forward = enumerateCoverage(FIXTURE_CATALOG);
    const reversed = enumerateCoverage(reverseKeyOrder({ ...FIXTURE_CATALOG }));

    expect(reversed.map((row) => row.catalog_key).sort()).toEqual(
      forward.map((row) => row.catalog_key).sort(),
    );
    expect(checkCoverageCompleteness(reverseKeyOrder({ ...FIXTURE_CATALOG }), reversed)).toEqual(
      checkCoverageCompleteness(FIXTURE_CATALOG, forward),
    );
  });

  test("a catalog copy missing from coverage is a deterministic fail naming the missing key", () => {
    const partial = [
      { catalog_key: "interview.banner.start" },
      { catalog_key: "interview.prompt.goal" },
    ];

    const result = checkCoverageCompleteness(FIXTURE_CATALOG, partial);
    expect(result.complete).toBe(false);
    if (result.complete) throw new Error("unreachable");

    expect(result.missing_keys).toEqual(["interview.label.done"]);
    expect(result.phantom_keys).toEqual([]);
  });

  test("a ghost coverage row whose key is not in the catalog is a deterministic fail naming the phantom key", () => {
    const withGhost = [
      { catalog_key: "interview.banner.start" },
      { catalog_key: "interview.prompt.goal" },
      { catalog_key: "interview.label.done" },
      { catalog_key: "interview.banner.ghost" },
    ];

    const result = checkCoverageCompleteness(FIXTURE_CATALOG, withGhost);
    expect(result.complete).toBe(false);
    if (result.complete) throw new Error("unreachable");

    expect(result.phantom_keys).toEqual(["interview.banner.ghost"]);
    expect(result.missing_keys).toEqual([]);
  });
});

describe("ac-24 clause 2 — ADR-20260713 fidelity gate: deterministic violation detection, fail-closed aggregation", () => {
  test("an avoid-list grep hit is judged a violation with key, term and verbatim-text pointers; clean copy passes", () => {
    const dirty = judgeCopyFidelity({
      catalog_key: "interview.banner.start",
      text: VIOLATING_COPY,
      avoid_terms: [...AVOID_TERMS],
    });
    expect(dirty.catalog_key).toBe("interview.banner.start");
    expect(dirty.text).toBe("여정을 시작합니다");
    expect(dirty.passed).toBe(false);
    expect(dirty.violations.map((violation) => violation.term)).toEqual(["여정"]);

    const clean = judgeCopyFidelity({
      catalog_key: "interview.label.done",
      text: CLEAN_COPY,
      avoid_terms: [...AVOID_TERMS],
    });
    expect(clean.passed).toBe(true);
    expect(clean.text).toBe("인터뷰를 시작합니다");
    expect(clean.violations).toEqual([]);
  });

  test("every avoid term is checked, not just the first hit", () => {
    const judgment = judgeCopyFidelity({
      catalog_key: "interview.banner.start",
      text: DOUBLE_VIOLATING_COPY,
      avoid_terms: [...AVOID_TERMS],
    });

    expect(judgment.passed).toBe(false);
    expect(judgment.violations.map((violation) => violation.term).sort()).toEqual(["당신", "여정"]);
  });

  test("the per-copy judgment is deterministic: repeated calls and permuted avoid-term order give the same verdict", () => {
    const input = {
      catalog_key: "interview.banner.start",
      text: DOUBLE_VIOLATING_COPY,
      avoid_terms: [...AVOID_TERMS],
    };

    expect(judgeCopyFidelity(input)).toEqual(judgeCopyFidelity(input));
    expect(judgeCopyFidelity(input)).toEqual(judgeCopyFidelity({ ...input }));

    const permuted = judgeCopyFidelity({
      catalog_key: "interview.banner.start",
      text: DOUBLE_VIOLATING_COPY,
      avoid_terms: [...AVOID_TERMS].reverse(),
    });
    const straight = judgeCopyFidelity(input);
    expect(permuted.passed).toBe(straight.passed);
    expect(permuted.violations.map((violation) => violation.term).sort()).toEqual(
      straight.violations.map((violation) => violation.term).sort(),
    );
  });

  test("fail-closed: a single violating copy rejects the whole gate", () => {
    const cleanA = judgeCopyFidelity({
      catalog_key: "interview.prompt.goal",
      text: CLEAN_COPY,
      avoid_terms: [...AVOID_TERMS],
    });
    const cleanB = judgeCopyFidelity({
      catalog_key: "interview.label.done",
      text: CLEAN_COPY,
      avoid_terms: [...AVOID_TERMS],
    });
    const dirty = judgeCopyFidelity({
      catalog_key: "interview.banner.start",
      text: VIOLATING_COPY,
      avoid_terms: [...AVOID_TERMS],
    });

    const rejected = aggregateFidelityGate({
      coverage_keys: ["interview.prompt.goal", "interview.label.done", "interview.banner.start"],
      judgments: [cleanA, cleanB, dirty],
    });
    expect(rejected.passed).toBe(false);
    if (rejected.passed) throw new Error("unreachable");
    expect(rejected.violating_keys).toEqual(["interview.banner.start"]);
    expect(rejected.unjudged_keys).toEqual([]);

    const allClean = aggregateFidelityGate({
      coverage_keys: ["interview.prompt.goal", "interview.label.done"],
      judgments: [cleanA, cleanB],
    });
    expect(allClean.passed).toBe(true);
  });

  test("no-verdict = not-passed: a coverage key without a gate verdict blocks the overall pass", () => {
    const judgedOnly = judgeCopyFidelity({
      catalog_key: "interview.prompt.goal",
      text: CLEAN_COPY,
      avoid_terms: [...AVOID_TERMS],
    });

    const result = aggregateFidelityGate({
      coverage_keys: ["interview.prompt.goal", "interview.banner.start"],
      judgments: [judgedOnly],
    });
    expect(result.passed).toBe(false);
    if (result.passed) throw new Error("unreachable");
    expect(result.unjudged_keys).toEqual(["interview.banner.start"]);
    expect(result.violating_keys).toEqual([]);
  });

  test("the real-surface gate screens under a non-empty avoid list of concrete Korean terms", () => {
    const report = runStaticCopyFidelityGate(STATIC_COPY_CATALOG);

    expect(Array.isArray(report.avoid_terms)).toBe(true);
    expect(report.avoid_terms.length).toBeGreaterThan(0);
    for (const term of report.avoid_terms) {
      expect(typeof term).toBe("string");
      expect(term.trim()).toBe(term);
      expect(term.length).toBeGreaterThan(0);
      expect(HANGUL.test(term)).toBe(true);
    }
    expect(new Set(report.avoid_terms).size).toBe(report.avoid_terms.length);
  });

  test("every declared avoid term actually flips the real gate to fail, naming the offending key", () => {
    const declared = runStaticCopyFidelityGate(STATIC_COPY_CATALOG).avoid_terms;
    expect(declared.length).toBeGreaterThan(0);

    for (const term of declared) {
      const probeCatalog = {
        "interview.banner.probe": { kind: "banner", ko: `${term} 안내를 확인하세요` },
      };

      const probed = runStaticCopyFidelityGate(probeCatalog);
      expect(probed.passed).toBe(false);
      if (probed.passed) throw new Error("unreachable");
      expect(probed.violating_keys).toEqual(["interview.banner.probe"]);
      expect(probed.unjudged_keys).toEqual([]);
      expect(
        probed.judgments
          .filter((judgment) => judgment.catalog_key === "interview.banner.probe")
          .flatMap((judgment) => judgment.violations.map((violation) => violation.term)),
      ).toContain(term);
    }
  });

  test("the real gate report carries one verdict per catalog key, judged over that key's verbatim copy", () => {
    const report = runStaticCopyFidelityGate(STATIC_COPY_CATALOG);
    const keys = catalogKeysSorted(STATIC_COPY_CATALOG);

    expect([...report.coverage_keys].sort()).toEqual(keys);
    expect([...report.coverage_keys].sort()).toEqual(
      enumerateCoverage(STATIC_COPY_CATALOG)
        .map((row) => row.catalog_key)
        .sort(),
    );

    expect(report.judgments.map((judgment) => judgment.catalog_key).sort()).toEqual(keys);
    expect(report.judgments.length).toBe(keys.length);

    for (const judgment of report.judgments) {
      const entry = STATIC_COPY_CATALOG[judgment.catalog_key as keyof typeof STATIC_COPY_CATALOG];
      expect(judgment.text).toBe(entry.ko);
      expect(judgment.passed).toBe(true);
      expect(judgment.violations).toEqual([]);
    }

    // The join: the report is exactly the per-copy gate applied to the catalog
    // under the report's own avoid list — not an independently asserted verdict.
    expect(sortedByCatalogKey(report.judgments)).toEqual(
      keys.map((key) =>
        judgeCopyFidelity({
          catalog_key: key,
          text: STATIC_COPY_CATALOG[key as keyof typeof STATIC_COPY_CATALOG].ko,
          avoid_terms: [...report.avoid_terms],
        }),
      ),
    );

    expect(report.passed).toBe(true);
  });

  test("the real interview-surface gate is deterministic across repeated runs and catalog key reordering", () => {
    const first = runStaticCopyFidelityGate(STATIC_COPY_CATALOG);
    const second = runStaticCopyFidelityGate(STATIC_COPY_CATALOG);
    const third = runStaticCopyFidelityGate(STATIC_COPY_CATALOG);

    expect(second).toEqual(first);
    expect(third).toEqual(first);

    const reordered = runStaticCopyFidelityGate(reverseKeyOrder({ ...STATIC_COPY_CATALOG }));
    expect(reordered.passed).toBe(first.passed);
    expect(reordered.avoid_terms).toEqual(first.avoid_terms);
    expect([...reordered.coverage_keys].sort()).toEqual([...first.coverage_keys].sort());
    expect(sortedByCatalogKey(reordered.judgments)).toEqual(sortedByCatalogKey(first.judgments));
  });
});

describe("ac-24 clause 3 — coverage consumes the wi_2607130ld catalog seam; no parallel translation table", () => {
  test("the catalog seam covers every declared copy kind with real Korean copy, not a token stub", () => {
    const entries = Object.entries(STATIC_COPY_CATALOG);
    expect(entries.length).toBeGreaterThanOrEqual(
      REQUIRED_COPY_KINDS.length * MIN_ENTRIES_PER_KIND,
    );

    for (const [key, entry] of entries) {
      expect(typeof key).toBe("string");
      expect(key.trim().length).toBeGreaterThan(0);
      expect(typeof entry.ko).toBe("string");
      expect(entry.ko.trim()).toBe(entry.ko);
      expect(entry.ko.length).toBeGreaterThan(0);
      expect(HANGUL.test(entry.ko)).toBe(true);
      expect(REQUIRED_COPY_KINDS).toContain(entry.kind);
    }

    for (const kind of REQUIRED_COPY_KINDS) {
      const ofKind = entries.filter(([, entry]) => entry.kind === kind);
      expect(ofKind.length).toBeGreaterThanOrEqual(MIN_ENTRIES_PER_KIND);
    }
  });

  test("every enumerated coverage row references a catalog key and is a valid consume-only review record", () => {
    const catalogKeys = new Set(Object.keys(STATIC_COPY_CATALOG));
    const rows = enumerateCoverage(STATIC_COPY_CATALOG);

    expect(rows.length).toBe(catalogKeys.size);
    expect(rows.length).toBeGreaterThanOrEqual(REQUIRED_COPY_KINDS.length * MIN_ENTRIES_PER_KIND);

    for (const row of rows) {
      expect(catalogKeys.has(row.catalog_key)).toBe(true);
      expect(validateReviewRecord(row).accepted).toBe(true);
    }
  });

  test("a review record holding a catalog-key reference and fidelity-review fields is accepted", () => {
    expect(validateReviewRecord({ catalog_key: "interview.banner.start" }).accepted).toBe(true);
    expect(
      validateReviewRecord({
        catalog_key: "interview.banner.start",
        passed: true,
        violations: [],
      }).accepted,
    ).toBe(true);
  });

  test("a review record defining its own translation string table is rejected", () => {
    const result = validateReviewRecord({
      catalog_key: "interview.banner.start",
      translations: { "interview.banner.start": "환영합니다" },
    });

    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("unreachable");
    expect(result.reason).toBe("parallel_translation_table");
  });

  test("a parallel copy table is rejected whatever it is named", () => {
    for (const field of ["strings", "messages", "copy", "labels"]) {
      const result = validateReviewRecord({
        catalog_key: "interview.banner.start",
        [field]: { "interview.banner.start": "환영합니다" },
      });

      expect(result.accepted).toBe(false);
      if (result.accepted) throw new Error("unreachable");
      expect(result.reason).toBe("parallel_translation_table");
    }
  });

  test("a review record carrying its own Korean copy string is rejected as a parallel translation", () => {
    const result = validateReviewRecord({
      catalog_key: "interview.banner.start",
      ko: "환영합니다",
    });

    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("unreachable");
    expect(result.reason).toBe("parallel_translation_table");
  });
});
