/**
 * ac-10e acceptance — Scalia interpretive-canon verdict list (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10e.json), covered clauses:
 *  (1) interpretive_canons[] exists in the round-0 reading output; each item's
 *      verdict is restricted to the enum {지지, 기각, 해당없음} and any other
 *      value is refused by zod parsing.
 *  (2) the canon set is fixed as a code constant and includes at least the 7
 *      canons the contract names verbatim: 잉여 금지 · 통상 의미 · 무언 추가
 *      금지 · 전체-문맥 · 기존 결정(ADR) 조화 · 불합리 기각 · 해석불능 시
 *      추측 금지.
 *  (3) completeness fail-closed: an output missing any canon of the fixed set
 *      is refused at schema parse time (asserted by dropping each canon in
 *      turn, by an empty list, and by a duplicate-masking fixture whose length
 *      matches but whose canon coverage does not); only outputs in which every
 *      canon of the set carries a verdict are accepted, and the parse-or-refuse
 *      entry point returns the accepted judgments verbatim.
 *
 * Residual (NOT tested here, per row residual):
 *  - Canon-application judgment — whether each canon's 지지/기각/해당없음
 *    verdict is actually correct is mechanically undecidable (the contract
 *    itself declares it residual). This file closes existence, enum, and
 *    completeness (fail-closed) only; it never scores verdict content.
 */
import { describe, expect, test } from "bun:test";
import {
  REQUIRED_CANONS,
  interpretiveCanonsSchema,
  parseInterpretiveCanons,
} from "../src/interview/reading/interpretive-canons";
import { round0ReadingSchema } from "../src/interview/reading/round0-reading";

/** The 7 canons the contract statement names, verbatim. */
const CONTRACT_NAMED_CANONS = [
  "잉여 금지",
  "통상 의미",
  "무언 추가 금지",
  "전체-문맥",
  "기존 결정(ADR) 조화",
  "불합리 기각",
  "해석불능 시 추측 금지",
] as const;

const ALLOWED_VERDICTS = ["지지", "기각", "해당없음"] as const;

/** Build a judgment list covering the entire fixed canon set. */
const completeFixture = (verdictAt: (index: number) => string) =>
  REQUIRED_CANONS.map((canon: string, index: number) => ({
    canon,
    verdict: verdictAt(index),
  }));

/** Complete list rotating through all three allowed verdicts. */
const mixedComplete = () =>
  completeFixture((index) => ALLOWED_VERDICTS[index % ALLOWED_VERDICTS.length] ?? "지지");

describe("ac-10e clause 2 — the canon set is a fixed code constant", () => {
  test("REQUIRED_CANONS contains every contract-named canon verbatim", () => {
    for (const named of CONTRACT_NAMED_CANONS) {
      expect(REQUIRED_CANONS).toContain(named);
    }
  });

  test("the set has no duplicates and at least the 7 named canons", () => {
    expect(new Set(REQUIRED_CANONS).size).toBe(REQUIRED_CANONS.length);
    expect(REQUIRED_CANONS.length).toBeGreaterThanOrEqual(CONTRACT_NAMED_CANONS.length);
  });
});

describe("ac-10e clause 1 — verdict enum {지지, 기각, 해당없음} is enforced by zod", () => {
  test("each of the three allowed verdicts is accepted across a complete list", () => {
    for (const verdict of ALLOWED_VERDICTS) {
      const uniform = completeFixture(() => verdict);
      expect(interpretiveCanonsSchema.safeParse(uniform).success).toBe(true);
    }
  });

  test("any verdict outside the enum is refused, with the issue anchored at the verdict", () => {
    const fixture = mixedComplete();
    fixture[0] = { canon: fixture[0]?.canon ?? "잉여 금지", verdict: "찬성" };

    const result = interpretiveCanonsSchema.safeParse(fixture);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues.some((issue) => issue.path.includes("verdict"))).toBe(true);
  });

  test("other out-of-enum verdict values are refused too", () => {
    for (const bad of ["미정", "유보", "", "approve"]) {
      const fixture = mixedComplete();
      fixture[0] = { canon: fixture[0]?.canon ?? "잉여 금지", verdict: bad };
      expect(interpretiveCanonsSchema.safeParse(fixture).success).toBe(false);
    }
  });

  test("an item missing its verdict entirely is refused", () => {
    const fixture: Array<{ canon: string; verdict?: string }> = mixedComplete();
    fixture[0] = { canon: fixture[0]?.canon ?? "잉여 금지" };
    expect(interpretiveCanonsSchema.safeParse(fixture).success).toBe(false);
  });
});

describe("ac-10e clause 3 — completeness is fail-closed", () => {
  test("dropping any single canon of the fixed set refuses the whole output", () => {
    for (const dropped of REQUIRED_CANONS) {
      const incomplete = mixedComplete().filter((item) => item.canon !== dropped);
      expect(interpretiveCanonsSchema.safeParse(incomplete).success).toBe(false);
    }
  });

  test("an empty judgment list is refused", () => {
    expect(interpretiveCanonsSchema.safeParse([]).success).toBe(false);
  });

  test("a duplicate canon cannot mask a missing one (length alone is not completeness)", () => {
    // Replace 잉여 금지 with a second 통상 의미 row: same length, incomplete coverage.
    const masked = mixedComplete().map((item) =>
      item.canon === "잉여 금지" ? { canon: "통상 의미", verdict: item.verdict } : item,
    );
    expect(masked.length).toBe(REQUIRED_CANONS.length);
    expect(interpretiveCanonsSchema.safeParse(masked).success).toBe(false);
  });

  test("only a list where every canon of the set carries a verdict is accepted", () => {
    expect(interpretiveCanonsSchema.safeParse(mixedComplete()).success).toBe(true);
  });
});

describe("ac-10e — parse-or-refuse entry point", () => {
  test("parseInterpretiveCanons returns accepted judgments verbatim", () => {
    const fixture = mixedComplete();
    const parsed = parseInterpretiveCanons(fixture);
    expect(parsed.map(({ canon, verdict }) => ({ canon, verdict }))).toEqual(fixture);
  });

  test("parseInterpretiveCanons refuses (throws) instead of returning a partial list", () => {
    expect(() => parseInterpretiveCanons(mixedComplete().slice(1))).toThrow();
    const badVerdict = mixedComplete();
    badVerdict[0] = { canon: badVerdict[0]?.canon ?? "잉여 금지", verdict: "찬성" };
    expect(() => parseInterpretiveCanons(badVerdict)).toThrow();
  });
});

describe("ac-10e clause 1 — interpretive_canons is a required field of the round-0 reading output", () => {
  test("an output without interpretive_canons is refused with an issue at that field", () => {
    const result = round0ReadingSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues.some((issue) => issue.path[0] === "interpretive_canons")).toBe(true);
  });

  test("a complete canon list raises no issue at the interpretive_canons field", () => {
    const result = round0ReadingSchema.safeParse({ interpretive_canons: mixedComplete() });
    const canonIssues = result.success
      ? []
      : result.error.issues.filter((issue) => issue.path[0] === "interpretive_canons");
    expect(canonIssues).toEqual([]);
  });

  test("an incomplete canon list is refused at the interpretive_canons field", () => {
    const result = round0ReadingSchema.safeParse({
      interpretive_canons: mixedComplete().slice(1),
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues.some((issue) => issue.path[0] === "interpretive_canons")).toBe(true);
  });
});
