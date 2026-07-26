import { describe, expect, test } from "bun:test";
import { STATIC_COPY_CATALOG } from "./static-copy-catalog";
import {
  REVIEW_RECORD_FIELDS,
  enumerateCoverage,
  validateReviewRecord,
} from "./static-copy-coverage";

describe("the review record's vocabulary is an allowlist, not a blocklist", () => {
  test("the four review fields are accepted", () => {
    expect(REVIEW_RECORD_FIELDS).toEqual(["catalog_key", "kind", "passed", "violations"]);
    expect(
      validateReviewRecord({
        catalog_key: "interview.banner.start",
        kind: "banner",
        passed: false,
        violations: [{ term: "여정" }],
      }),
    ).toEqual({ accepted: true });
  });

  test("every enumerated coverage row is a valid review record", () => {
    for (const row of enumerateCoverage(STATIC_COPY_CATALOG)) {
      expect({ row, result: validateReviewRecord(row) }).toEqual({
        row,
        result: { accepted: true },
      });
    }
  });

  test("a field nobody allowed is refused even when it carries no Korean at all", () => {
    expect(validateReviewRecord({ catalog_key: "k", en: "Welcome to the interview" })).toEqual({
      accepted: false,
      reason: "parallel_translation_table",
    });
    expect(validateReviewRecord({ catalog_key: "k", fr: "Bienvenue" })).toEqual({
      accepted: false,
      reason: "parallel_translation_table",
    });
    expect(
      validateReviewRecord({ catalog_key: "k", translations: { a: { ko: "환영합니다" } } }),
    ).toEqual({ accepted: false, reason: "parallel_translation_table" });
  });

  test("an allowed field holding copy is still refused — the allowlist is not a free pass", () => {
    expect(validateReviewRecord({ catalog_key: "k", kind: "배너" })).toEqual({
      accepted: false,
      reason: "parallel_translation_table",
    });
    expect(validateReviewRecord({ catalog_key: "k", violations: { a: "환영합니다" } })).toEqual({
      accepted: false,
      reason: "parallel_translation_table",
    });
    expect(validateReviewRecord({ catalog_key: "k", passed: "환영합니다" })).toEqual({
      accepted: false,
      reason: "parallel_translation_table",
    });
  });

  test("a missing catalog key is still its own refusal, distinct from a parallel table", () => {
    expect(validateReviewRecord({ kind: "banner" })).toEqual({
      accepted: false,
      reason: "missing_catalog_key",
    });
  });
});
