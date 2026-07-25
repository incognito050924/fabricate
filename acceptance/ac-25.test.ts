/**
 * Acceptance test for ac-25 — A1 dimension completeness gate: reverse-map
 * original-intent fragments to dimensions, seed every uncovered fragment as an
 * origin='discovered' state='open' dimension seed, return seededFragmentIds
 * that correspond exactly to the seeded records, drop blank fragments, stay
 * idempotent across repeated runs, count only mappings to really-existing
 * dimension nodes as coverage, and — per the locked "strong plate" decision —
 * hard-block readiness (fail-closed lock/progress refusal, not a display-only
 * flag) while any open discovered seed exists, releasing the block only when
 * fragments are covered by real dimensions or the seed leaves the open state.
 *
 * Frozen red: the modules under src/interview/completeness/ and
 * src/interview/readiness/ do not exist yet; the piece-3 implementation must
 * turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-25.json (oracle_statement clauses 1-6).
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 * (a) semantic quality of how the original intent is segmented into fragments
 *     — the fixtures fix the fragment list, so segmentation quality of real
 *     utterances is not closed by this file;
 * (b) semantic correctness of a fragment→dimension mapping ("does this
 *     dimension really cover that fragment") — only node existence, uncovered
 *     seed wiring, and the readiness-block boolean are machine-checked here
 *     (the §3-1 pattern: an LLM emits the mapping, a pure gate routes it).
 * No prose is graded.
 */

import { describe, expect, test } from "bun:test";
import { computeFragmentCoverage } from "../src/interview/completeness/fragment-mapping";
import { seedUncoveredFragments } from "../src/interview/completeness/seed-uncovered";
import { evaluateReadiness, proceedToLock } from "../src/interview/readiness/readiness-gate";

const FRAGMENTS = [
  { id: "f-1", text: "print an intent summary for the locked criteria" },
  { id: "f-2", text: "persist the interview log after the session ends" },
  { id: "f-3", text: "retry the export when the network fails" },
];

const REAL_DIMENSIONS = [
  { id: "dim-1", label: "summary output", origin: "user", state: "open" },
  { id: "dim-2", label: "log persistence", origin: "user", state: "open" },
];

// Covers f-1 and f-2 against really-existing nodes; f-3 stays uncovered.
const MAPPINGS_COVERING_F1_F2 = [
  { fragment_id: "f-1", dimension_id: "dim-1" },
  { fragment_id: "f-2", dimension_id: "dim-2" },
];

// A deliberately different shape over the same fragments and dimensions: f-1 is
// covered by the other node, f-3 by BOTH nodes, and f-2 by nothing. Any answer
// that ignores the mapping input cannot satisfy this and the fixture above at
// the same time.
const MAPPINGS_COVERING_F1_F3 = [
  { fragment_id: "f-1", dimension_id: "dim-2" },
  { fragment_id: "f-3", dimension_id: "dim-1" },
  { fragment_id: "f-3", dimension_id: "dim-2" },
];

describe("ac-25 clause 1: reverse mapping is computed and each uncovered fragment is seeded as discovered/open", () => {
  test("computes fragment-to-dimension coverage over the fixed fixture", () => {
    const coverage = computeFragmentCoverage({
      fragments: FRAGMENTS,
      mappings: MAPPINGS_COVERING_F1_F2,
      dimensions: REAL_DIMENSIONS,
    });
    expect(coverage.covered.find((c) => c.fragment_id === "f-1")?.dimension_ids).toEqual(["dim-1"]);
    expect(coverage.covered.find((c) => c.fragment_id === "f-2")?.dimension_ids).toEqual(["dim-2"]);
    expect(coverage.uncovered_fragment_ids).toEqual(["f-3"]);
  });

  test("the reverse map follows the mapping input: a different mapping set over the same fragments and dimensions yields a different split", () => {
    const coverage = computeFragmentCoverage({
      fragments: FRAGMENTS,
      mappings: MAPPINGS_COVERING_F1_F3,
      dimensions: REAL_DIMENSIONS,
    });

    expect(coverage.covered.find((c) => c.fragment_id === "f-1")?.dimension_ids).toEqual(["dim-2"]);

    // One fragment mapped to two really-existing nodes reverse-maps to both.
    const f3 = coverage.covered.find((c) => c.fragment_id === "f-3");
    expect(f3?.dimension_ids).toHaveLength(2);
    expect([...(f3?.dimension_ids ?? [])].sort()).toEqual(["dim-1", "dim-2"]);

    expect(coverage.covered.some((c) => c.fragment_id === "f-2")).toBe(false);
    expect(coverage.uncovered_fragment_ids).toEqual(["f-2"]);
  });

  test("with no mappings at all nothing is covered and every fragment is uncovered", () => {
    const coverage = computeFragmentCoverage({
      fragments: FRAGMENTS,
      mappings: [],
      dimensions: REAL_DIMENSIONS,
    });
    expect(coverage.covered).toEqual([]);
    expect(coverage.uncovered_fragment_ids).toEqual(["f-1", "f-2", "f-3"]);
  });

  test("plants the uncovered fragment into the dimension structure with origin='discovered' and state='open'", () => {
    const result = seedUncoveredFragments({
      fragments: FRAGMENTS,
      mappings: MAPPINGS_COVERING_F1_F2,
      dimensions: REAL_DIMENSIONS,
    });

    const seed = result.dimensions.find((d) => d.fragment_id === "f-3");
    expect(seed?.origin).toBe("discovered");
    expect(seed?.state).toBe("open");

    // The seed lands inside the dimension structure; originals are preserved.
    expect(result.dimensions).toHaveLength(3);
    expect(result.dimensions.filter((d) => d.id === "dim-1")).toHaveLength(1);
    expect(result.dimensions.filter((d) => d.id === "dim-2")).toHaveLength(1);
  });
});

describe("ac-25 clause 2: seededFragmentIds is non-empty and corresponds exactly to the seeded records", () => {
  test("returns every uncovered fragment id, matching the planted seed records one-to-one", () => {
    const result = seedUncoveredFragments({
      fragments: [...FRAGMENTS, { id: "f-4", text: "notify the user when the export completes" }],
      mappings: MAPPINGS_COVERING_F1_F2,
      dimensions: REAL_DIMENSIONS,
    });

    expect(result.seededFragmentIds.length).toBeGreaterThan(0);
    expect([...result.seededFragmentIds].sort()).toEqual(["f-3", "f-4"]);

    const seededRecords = result.dimensions.filter(
      (d) => d.origin === "discovered" && d.state === "open",
    );
    expect(seededRecords.map((d) => d.fragment_id).sort()).toEqual(
      [...result.seededFragmentIds].sort(),
    );
  });

  test("what gets seeded is exactly what the reverse map reports as uncovered, across three fixtures with three different answers", () => {
    const cases = [
      { mappings: MAPPINGS_COVERING_F1_F2, uncovered: ["f-3"] },
      { mappings: MAPPINGS_COVERING_F1_F3, uncovered: ["f-2"] },
      { mappings: [], uncovered: ["f-1", "f-2", "f-3"] },
    ];

    for (const { mappings, uncovered } of cases) {
      const coverage = computeFragmentCoverage({
        fragments: FRAGMENTS,
        mappings,
        dimensions: REAL_DIMENSIONS,
      });
      const seeded = seedUncoveredFragments({
        fragments: FRAGMENTS,
        mappings,
        dimensions: REAL_DIMENSIONS,
      });

      expect([...coverage.uncovered_fragment_ids].sort()).toEqual(uncovered);
      expect([...seeded.seededFragmentIds].sort()).toEqual(uncovered);
      expect(
        seeded.dimensions
          .filter((d) => d.origin === "discovered" && d.state === "open")
          .map((d) => d.fragment_id)
          .sort(),
      ).toEqual(uncovered);
      expect(seeded.dimensions).toHaveLength(REAL_DIMENSIONS.length + uncovered.length);
    }
  });
});

describe("ac-25 clause 3: empty fragment array and blank fragments (two contrast fixtures)", () => {
  test("an empty fragment array completes normally with zero seeds and no error", () => {
    const run = () =>
      seedUncoveredFragments({ fragments: [], mappings: [], dimensions: REAL_DIMENSIONS });
    expect(run).not.toThrow();

    const result = run();
    expect(result.seededFragmentIds).toEqual([]);
    expect(result.dimensions).toHaveLength(REAL_DIMENSIONS.length);
    expect(result.dimensions.filter((d) => d.origin === "discovered")).toHaveLength(0);
  });

  test("empty and whitespace-only fragments are dropped while a real fragment still seeds", () => {
    const result = seedUncoveredFragments({
      fragments: [
        { id: "f-empty", text: "" },
        { id: "f-blank", text: "   \t\n" },
        { id: "f-real", text: "retry the export when the network fails" },
      ],
      mappings: [],
      dimensions: [],
    });

    expect(result.seededFragmentIds).toEqual(["f-real"]);
    const seeded = result.dimensions.filter((d) => d.origin === "discovered");
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.fragment_id).toBe("f-real");
    expect(result.dimensions.some((d) => d.fragment_id === "f-empty")).toBe(false);
    expect(result.dimensions.some((d) => d.fragment_id === "f-blank")).toBe(false);
  });
});

describe("ac-25 clause 4: running the gate twice on the same state seeds nothing new (idempotent)", () => {
  test("the second run adds zero seeds and keeps dimension count and the existing seed unchanged", () => {
    const first = seedUncoveredFragments({
      fragments: FRAGMENTS,
      mappings: MAPPINGS_COVERING_F1_F2,
      dimensions: REAL_DIMENSIONS,
    });
    expect(first.seededFragmentIds).toEqual(["f-3"]);
    const countAfterFirst = first.dimensions.length;

    const second = seedUncoveredFragments({
      fragments: FRAGMENTS,
      mappings: MAPPINGS_COVERING_F1_F2,
      dimensions: first.dimensions,
    });

    expect(second.seededFragmentIds).toEqual([]);
    expect(second.dimensions).toHaveLength(countAfterFirst);

    const seedsForFragment = second.dimensions.filter(
      (d) => d.origin === "discovered" && d.fragment_id === "f-3",
    );
    expect(seedsForFragment).toHaveLength(1);
    expect(seedsForFragment[0]?.state).toBe("open");
  });
});

describe("ac-25 clause 5: a mapping to a non-existent dimension node is not coverage (ghost-node fixture)", () => {
  // f-1 is mapped to one real node AND one ghost node (only the real node may
  // count); f-2 and f-3 are mapped exclusively to non-existent nodes, so both
  // must fall through as uncovered. The correct answer here differs from every
  // other fixture in this file.
  const GHOST_MAPPINGS = [
    { fragment_id: "f-1", dimension_id: "dim-1" },
    { fragment_id: "f-1", dimension_id: "dim-ghost" },
    { fragment_id: "f-2", dimension_id: "dim-ghost" },
    { fragment_id: "f-3", dimension_id: "dim-phantom" },
  ];

  test("only really-existing nodes count as coverage: ghost targets are dropped from the reverse map", () => {
    const coverage = computeFragmentCoverage({
      fragments: FRAGMENTS,
      mappings: GHOST_MAPPINGS,
      dimensions: REAL_DIMENSIONS,
    });

    expect(coverage.covered).toHaveLength(1);
    expect(coverage.covered[0]?.fragment_id).toBe("f-1");
    // The ghost target next to the real one must not leak into the reverse map.
    expect(coverage.covered[0]?.dimension_ids).toEqual(["dim-1"]);
    expect(coverage.uncovered_fragment_ids).toEqual(["f-2", "f-3"]);
  });

  test("the ghost-mapped fragments are still seeded as discovered/open and no phantom node appears", () => {
    const result = seedUncoveredFragments({
      fragments: FRAGMENTS,
      mappings: GHOST_MAPPINGS,
      dimensions: REAL_DIMENSIONS,
    });

    expect([...result.seededFragmentIds].sort()).toEqual(["f-2", "f-3"]);
    for (const fragmentId of ["f-2", "f-3"]) {
      const seed = result.dimensions.find((d) => d.fragment_id === fragmentId);
      expect(seed?.origin).toBe("discovered");
      expect(seed?.state).toBe("open");
    }
    // The really-covered fragment is not seeded.
    expect(
      result.dimensions
        .filter((d) => d.origin === "discovered")
        .map((d) => d.fragment_id)
        .sort(),
    ).toEqual(["f-2", "f-3"]);
    expect(result.dimensions.some((d) => d.id === "dim-ghost")).toBe(false);
    expect(result.dimensions.some((d) => d.id === "dim-phantom")).toBe(false);
    expect(result.dimensions).toHaveLength(4);
  });
});

describe("ac-25 clause 6: open discovered seeds hard-block readiness fail-closed; resolution releases the block", () => {
  const seededState = () =>
    seedUncoveredFragments({
      fragments: FRAGMENTS,
      mappings: MAPPINGS_COVERING_F1_F2,
      dimensions: REAL_DIMENSIONS,
    });

  test("readiness is false and the lock/progress path refuses while an open discovered seed exists", () => {
    const seeded = seededState();
    expect(seeded.seededFragmentIds.length).toBeGreaterThan(0);

    const readiness = evaluateReadiness({ dimensions: seeded.dimensions });
    expect(readiness.ready).toBe(false);

    const lock = proceedToLock({ dimensions: seeded.dimensions });
    expect(lock.locked).toBe(false);
    expect(lock.intent).toBeUndefined();
  });

  test("a caller-supplied claimed-ready flag cannot pass the gate (block is real, not display-only)", () => {
    const seeded = seededState();
    const lock = proceedToLock({ dimensions: seeded.dimensions, claimed_ready: true });
    expect(lock.locked).toBe(false);
    expect(lock.intent).toBeUndefined();
  });

  test("contrast state A: every fragment covered by real dimensions — readiness true, lock succeeds", () => {
    const covered = seedUncoveredFragments({
      fragments: [FRAGMENTS[0], FRAGMENTS[1]],
      mappings: MAPPINGS_COVERING_F1_F2,
      dimensions: REAL_DIMENSIONS,
    });
    expect(covered.seededFragmentIds).toEqual([]);

    expect(evaluateReadiness({ dimensions: covered.dimensions }).ready).toBe(true);
    expect(proceedToLock({ dimensions: covered.dimensions }).locked).toBe(true);
  });

  test("contrast state B: resolving the seed out of the open state releases the block caused by this input", () => {
    const seeded = seededState();
    const resolved = seeded.dimensions.map((d) =>
      d.origin === "discovered" && d.state === "open"
        ? {
            ...d,
            state: "dropped",
            drop_reason: "user confirmed the retry fragment is out of scope",
          }
        : d,
    );

    expect(evaluateReadiness({ dimensions: resolved }).ready).toBe(true);
    expect(proceedToLock({ dimensions: resolved }).locked).toBe(true);
  });
});
