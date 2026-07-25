/**
 * Acceptance test for ac-C1 — KAOS extension (extends ac-3 WHY-chain):
 * (1) every refinement leaf carries a deterministic requirement/assumption
 * separation field kind ∈ {requirement, assumption} and nothing else — zod
 * parsing rejects a leaf whose kind field is missing or outside the enum
 * (the "deterministic separation field on every leaf" is forced by making
 * the field required); (2) a refinement_complete predicate is true only
 * when every leaf is single-owner assignable AND verifiable — false when
 * any leaf fails the single-owner axis, false when any leaf fails the
 * verifiability axis (contrast fixtures for each failure axis assert the
 * AND-combination and the "true only when" direction); (3) a deterministic
 * WHY extractor pulls a WHY clause from utterances containing each of the
 * three keywords "so that" / "위해" / "목적" (at least one extraction per
 * keyword) and returns an empty result for an utterance containing none of
 * them (positive/negative contrast of deterministic keyword matching). The
 * positive extraction assertions are structural, not semantic: every
 * returned clause must be a PROPER substring of the utterance (strictly
 * shorter than it), must cover the purpose-side span of the keyword, and
 * must not carry the non-purpose span across the keyword — so an
 * "echo the whole utterance back when a keyword is present" implementation
 * fails. Two distinct fixtures per keyword keep a per-fixture lookup table
 * from standing in for an actual keyword-anchored split.
 *
 * Frozen red: the modules under src/interview/refinement/ do not exist yet;
 * the piece-3 implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-C1.json (oracle_statement clauses 1-3).
 *
 * Residual — deliberately NOT tested here, per the row's residual
 * declaration:
 * (a) requirement-vs-assumption classification — whether a leaf's actual
 *     content really is a requirement or an assumption is a human-judged
 *     predicate; the fixtures fix the kind labels, and only enum
 *     enforcement plus the predicate/extractor wiring are asserted on top
 *     of them;
 * (b) the reality of single-owner assignability and verifiability —
 *     refinement_complete only computes the AND-combination over the
 *     deterministic judgment values recorded on the leaves; whether a leaf
 *     is truly assignable to a single owner and verifiable in the real
 *     world, and whether an extracted WHY clause semantically captures the
 *     actual purpose, are not closed by this test. Clause boundaries are
 *     asserted only as spans of the utterance relative to the keyword,
 *     which is a structural property, not a semantic judgment.
 */

import { describe, expect, test } from "bun:test";
import { refinementComplete } from "../src/interview/refinement/refinement-complete";
import { refinementLeafSchema } from "../src/interview/refinement/refinement-leaf";
import { extractWhy } from "../src/interview/refinement/why-extractor";

const REQUIREMENT_LEAF = {
  id: "leaf-req-1",
  statement: "the CLI persists the locked goal_state before the first fired question",
  kind: "requirement",
  single_owner_assignable: true,
  verifiable: true,
};

const ASSUMPTION_LEAF = {
  id: "leaf-assume-1",
  statement: "the interview session runs on a single machine",
  kind: "assumption",
  single_owner_assignable: true,
  verifiable: true,
};

describe("ac-C1 clause 1: kind ∈ {requirement, assumption} is a required enum on every refinement leaf", () => {
  test("accepts a leaf with kind='requirement' and preserves the value", () => {
    const result = refinementLeafSchema.safeParse(REQUIREMENT_LEAF);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("requirement");
    }
  });

  test("accepts a leaf with kind='assumption' and preserves the value", () => {
    const result = refinementLeafSchema.safeParse(ASSUMPTION_LEAF);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("assumption");
    }
  });

  test("rejects a leaf whose kind field is missing (field is mandatory, not optional)", () => {
    const { kind: _dropped, ...leafWithoutKind } = REQUIREMENT_LEAF;
    const result = refinementLeafSchema.safeParse(leafWithoutKind);
    expect(result.success).toBe(false);
  });

  test("rejects a leaf whose kind is outside the two-value enum", () => {
    const outOfEnum = refinementLeafSchema.safeParse({
      ...REQUIREMENT_LEAF,
      kind: "constraint",
    });
    expect(outOfEnum.success).toBe(false);

    const emptyString = refinementLeafSchema.safeParse({
      ...REQUIREMENT_LEAF,
      kind: "",
    });
    expect(emptyString.success).toBe(false);

    const wrongCase = refinementLeafSchema.safeParse({
      ...REQUIREMENT_LEAF,
      kind: "Requirement",
    });
    expect(wrongCase.success).toBe(false);
  });
});

describe("ac-C1 clause 2: refinement_complete is true only when every leaf is single-owner assignable AND verifiable", () => {
  const GREEN_LEAVES = [
    REQUIREMENT_LEAF,
    ASSUMPTION_LEAF,
    {
      id: "leaf-req-2",
      statement: "the finalize gate fails closed on orphan acceptance criteria",
      kind: "requirement",
      single_owner_assignable: true,
      verifiable: true,
    },
  ];

  test("is true when all leaves are single-owner assignable and verifiable", () => {
    expect(refinementComplete(GREEN_LEAVES)).toBe(true);
  });

  test("is false when any single leaf is not single-owner assignable (verifiability intact)", () => {
    const leaves = [
      GREEN_LEAVES[0],
      GREEN_LEAVES[1],
      {
        id: "leaf-shared-owner",
        statement: "both teams jointly own the deployment checklist",
        kind: "requirement",
        single_owner_assignable: false,
        verifiable: true,
      },
    ];
    expect(refinementComplete(leaves)).toBe(false);
  });

  test("is false when any single leaf is not verifiable (assignability intact)", () => {
    const leaves = [
      GREEN_LEAVES[0],
      GREEN_LEAVES[1],
      {
        id: "leaf-unverifiable",
        statement: "the interview should feel pleasant to the user",
        kind: "assumption",
        single_owner_assignable: true,
        verifiable: false,
      },
    ];
    expect(refinementComplete(leaves)).toBe(false);
  });

  test("is false when a leaf fails both axes at once (AND-combination, not OR)", () => {
    const leaves = [
      GREEN_LEAVES[0],
      {
        id: "leaf-both-bad",
        statement: "everyone vaguely improves quality",
        kind: "assumption",
        single_owner_assignable: false,
        verifiable: false,
      },
    ];
    expect(refinementComplete(leaves)).toBe(false);
  });
});

describe("ac-C1 clause 3: deterministic WHY extractor over the keywords 'so that' / '위해' / '목적'", () => {
  /**
   * Each fixture pins the utterance, the purpose-side span the extracted
   * clause must cover, and the span on the other side of the keyword that
   * the clause must not swallow. Together they force a keyword-anchored
   * split instead of returning the utterance itself.
   */
  const POSITIVE_FIXTURES = [
    {
      keyword: "so that",
      utterance: "cache the session token so that the user stays logged in across restarts",
      purposeSpan: "the user stays logged in",
      otherSideSpan: "cache the session token",
    },
    {
      keyword: "so that",
      utterance: "we shard the queue so that a single slow consumer cannot stall the pipeline",
      purposeSpan: "a single slow consumer cannot stall",
      otherSideSpan: "we shard the queue",
    },
    {
      keyword: "위해",
      utterance: "재작업을 줄이기 위해 인터뷰에서 목표 술어를 먼저 확정한다",
      purposeSpan: "재작업을 줄이기",
      otherSideSpan: "인터뷰에서 목표 술어를 먼저 확정한다",
    },
    {
      keyword: "위해",
      utterance: "감사 추적을 남기기 위해 모든 판정 결과를 파일로 기록한다",
      purposeSpan: "감사 추적을 남기기",
      otherSideSpan: "모든 판정 결과를 파일로 기록한다",
    },
    {
      keyword: "목적",
      utterance: "이 게이트의 목적은 고아 질문이 기록되는 것을 막는 것이다",
      purposeSpan: "고아 질문이 기록되는 것을 막는",
      otherSideSpan: "이 게이트의",
    },
    {
      keyword: "목적",
      utterance: "잠금 절차의 목적은 확정된 의도가 조용히 바뀌지 않게 하는 것이다",
      purposeSpan: "확정된 의도가 조용히 바뀌지 않게 하는",
      otherSideSpan: "잠금 절차의",
    },
  ];

  for (const fixture of POSITIVE_FIXTURES) {
    test(`extracts a keyword-anchored WHY clause from '${fixture.keyword}' utterance: ${fixture.utterance}`, () => {
      const { utterance, purposeSpan, otherSideSpan } = fixture;
      const clauses = extractWhy(utterance);

      expect(Array.isArray(clauses)).toBe(true);
      expect(clauses.length).toBeGreaterThanOrEqual(1);

      for (const clause of clauses) {
        // A clause is a span of the utterance, never a rewritten string.
        expect(utterance).toContain(clause);
        // Proper substring: returning the utterance itself is not extraction.
        expect(clause.length).toBeLessThan(utterance.length);
        expect(clause.trim().length).toBeGreaterThan(0);
        // Anchored on the purpose side of the keyword.
        expect(clause).toContain(purposeSpan);
        // The span on the other side of the keyword is not carried along.
        expect(clause.includes(otherSideSpan)).toBe(false);
      }
    });
  }

  test("returns an empty result for an English utterance containing none of the keywords", () => {
    expect(extractWhy("add a retry counter to the upload command")).toEqual([]);
  });

  test("returns an empty result for a Korean utterance containing none of the keywords", () => {
    expect(extractWhy("업로드 명령에 재시도 카운터를 추가한다")).toEqual([]);
  });

  test("returns an empty result for an empty utterance", () => {
    expect(extractWhy("")).toEqual([]);
  });
});
