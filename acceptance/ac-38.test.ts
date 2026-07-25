/**
 * ac-38 acceptance — C2 three-ledger state (DESIGN node). The criterion's
 * deliverables are a spec document plus frozen red tests, judged the way the
 * sibling DESIGN rows (ac-33 / ac-36 / ac-39 / ac-E2) are judged: with
 * deterministic predicates over file existence, red-run observation records,
 * and frozen hashes — NOT with green assertions of the future gate behavior.
 * Red-frozen.
 *
 * Oracle (gate-a/rows/ac-38.json), covered clauses:
 *  (1) spec rescan (doc evidence) — the three-ledger spec document exists at
 *      the fixed path design/ac-38-three-ledger-state.md, is non-empty, and
 *      contains all six required section markers. The path and the marker
 *      strings come from the single definition in
 *      src/interview/dimension/three-ledger-spec.ts, shared by spec authoring
 *      and this judgment (drift block). Required sections: ① the three
 *      ledgers (결정 / 미진술(fog) / 범위밖), ② the promotion test — "지금
 *      질문을 정확히 진술 가능한가", explicitly NOT answerability ("답 가능"
 *      negated), ③ the out-of-scope rule (reason required, re-questioning
 *      forbidden: 사유 / 재질문 금지), ④ the fog vs frontier boundary
 *      (C1/ac-36 junction), ⑤ the interaction with A2(ac-26) unevaluated,
 *      ⑥ the dimensionState consumer-gate ripple list (readiness, ...).
 *  (2) additive enum migration — the post-migration dimensionState value set
 *      preserves every value ac-26 established (no removal, no rename). The
 *      pre-migration snapshot exported by src/interview/dimension/three-ledger
 *      is not taken on trust: it is cross-checked against ac-26's OWN frozen
 *      surface (LEGACY_DIMENSION_STATES ∪ {unevaluated} from
 *      src/interview/dimension/state), and the migrated enum may add nothing
 *      beyond the three ledger values — so a value ac-26 established cannot be
 *      dropped by omitting it from a post-hoc snapshot. The three ledger
 *      states exist as mutually distinct enum values (fog and out-of-scope
 *      being the new additions), an existing-shape dimension record carrying
 *      no new value still parses (fixture), the record schema's accepted state
 *      set is exactly the enum (not a permissive shell), and records that come
 *      out of it keep their ac-26 aggregation meaning in ac-26's real consumer
 *      surface (allDimensionsClosed / closedDimensionCount /
 *      readinessBlockers) — the backward-compat claim is anchored to a real
 *      consumer, not to a schema authored for this test alone.
 *  (3) frozen red artifact — fog→Decided stated-question pointer gate: the
 *      design-output red test src/interview/dimension/promotion.redtest.ts
 *      exists, is non-empty, is named outside the default test glob
 *      (*.test.ts) so it cannot pollute the green suite, is a real bun:test
 *      file importing at least one named binding from its still-unimplemented
 *      target module (./promotion), and — beyond mere structure — its source
 *      encodes each scenario the oracle says it judges: rejection of a missing
 *      pointer, rejection of a pointer at a nonexistent question id,
 *      acceptance of a valid-pointer promotion (referential integrity), and
 *      invariance of the promotion test to answer-existence/answerability
 *      signals; it carries at least one distinct test per scenario. Its
 *      implementation-preceding red-run record
 *      (design/ac-38-promotion.red-run.json) names this test path, and its
 *      reported non-zero exit code is RE-OBSERVED here by actually running the
 *      red test in a child bun process — the record is verified, not believed
 *      — with a frozen sha256 matching the current red-test content.
 *  (4) frozen red artifact — out-of-scope re-questioning exclusion gate: the
 *      same predicates for src/interview/dimension/out-of-scope.redtest.ts
 *      (scenarios: rejection of an out-of-scope designation without a
 *      non-empty reason, exclusion of out-of-scope dimensions from
 *      question-candidate enumeration, refusal of a direct re-question against
 *      an out-of-scope dimension) and design/ac-38-out-of-scope.red-run.json
 *      (target ./out-of-scope).
 *
 * Residual (NOT tested here, per row residual):
 *  - Spec design quality and content validity — machine judgment stops at
 *    the fixed path plus required section markers; whether the three-ledger
 *    design is actually right and the ripple list complete is human-judged.
 *  - Semantic judgment of "can the question be stated precisely right now" —
 *    operationalized as stated-question record existence plus referential
 *    integrity; the statement's actual precision is not closed here.
 *  - Substantive justification of an out-of-scope reason — only presence and
 *    non-emptiness are in the frozen red test's scope.
 *  - The promotion-rejection / out-of-scope-exclusion runtime behavior — the
 *    DESIGN completion is the additive migration plus red-test artifacts;
 *    the gate behavior closes when the frozen red tests turn green under a
 *    later implementation, outside this criterion. Accordingly the red tests
 *    are required to be RED here (re-observed), never green, and this file
 *    asserts what their source encodes, not that the gate works.
 *  - Correct ledger classification in real interviews — an LLM judgment.
 *  - The old-tree "ambiguity gate" dependency clause — reflected only through
 *    required spec section ⑥; no code anchor of the old tree is asserted.
 */
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  allDimensionsClosed,
  closedDimensionCount,
  readinessBlockers,
} from "../src/interview/dimension/close";
import {
  DIMENSION_STATES,
  type DimensionState,
  LEGACY_DIMENSION_STATES,
} from "../src/interview/dimension/state";
import {
  PRE_THREE_LEDGER_DIMENSION_STATES,
  THREE_LEDGER_STATES,
  dimensionRecordSchema,
} from "../src/interview/dimension/three-ledger";
import {
  THREE_LEDGER_SPEC_PATH,
  THREE_LEDGER_SPEC_REQUIRED_SECTIONS,
} from "../src/interview/dimension/three-ledger-spec";

const REPO_ROOT = resolve(import.meta.dir, "..");

// ---------------------------------------------------------------------------
// Clause 1 fixtures — the six required section keys and the load-bearing
// phrases each marker string must carry. The Korean phrases are the ones the
// locked oracle statement requires verbatim; requiring "답 가능" together with
// "아니" inside the promotion-test marker forces the spec to state explicitly
// that the promotion test is statement-precision, not answerability.
// ---------------------------------------------------------------------------

const REQUIRED_SECTION_KEYS = [
  "ledgers",
  "promotionTest",
  "outOfScopeRule",
  "fogVsFrontier",
  "unevaluatedInteraction",
  "consumerRipple",
] as const;

type RequiredSectionKey = (typeof REQUIRED_SECTION_KEYS)[number];

const REQUIRED_MARKER_PHRASES: Record<RequiredSectionKey, readonly string[]> = {
  ledgers: ["결정", "미진술", "fog", "범위밖"],
  promotionTest: ["지금 질문을 정확히 진술 가능한가", "답 가능", "아니"],
  outOfScopeRule: ["범위밖", "사유", "재질문 금지"],
  fogVsFrontier: ["fog", "frontier", "ac-36"],
  unevaluatedInteraction: ["unevaluated", "ac-26"],
  consumerRipple: ["dimensionState", "readiness"],
};

const readSpecDocument = (): string =>
  readFileSync(resolve(REPO_ROOT, THREE_LEDGER_SPEC_PATH), "utf8");

// ---------------------------------------------------------------------------
// Clause 2 fixtures — ac-26's consumer surface takes {id, state} dimensions
// (ac-26.test.ts fixes that shape); the record schema output is fed through it
// so "existing records still parse" is anchored to a real consumer.
// ---------------------------------------------------------------------------

const asDimension = (id: string, state: string) => ({ id, state: state as DimensionState });

const ledgerValueList = (): readonly string[] => [
  THREE_LEDGER_STATES.decided,
  THREE_LEDGER_STATES.fog,
  THREE_LEDGER_STATES.outOfScope,
];

// ---------------------------------------------------------------------------
// Clause 3/4 fixtures — the two frozen red design artifacts. Each red test is
// judged at the filesystem level (importing it here would execute its failing
// tests inside this suite); its source must encode every scenario the oracle
// names, and its red-run record is re-observed by running the red test in a
// child bun process rather than trusted as a self-report.
// ---------------------------------------------------------------------------

type ScenarioAnchor = {
  scenario: string;
  patterns: readonly RegExp[];
};

type FrozenRedArtifact = {
  label: string;
  redTestPath: string;
  redRunRecordPath: string;
  targetImportSpecifier: string;
  vocabulary: readonly RegExp[];
  scenarios: readonly ScenarioAnchor[];
};

const FROZEN_RED_ARTIFACTS: readonly FrozenRedArtifact[] = [
  {
    label: "fog→Decided stated-question pointer promotion gate",
    redTestPath: "src/interview/dimension/promotion.redtest.ts",
    redRunRecordPath: "design/ac-38-promotion.red-run.json",
    targetImportSpecifier: "./promotion",
    vocabulary: [/fog/i, /stated[-_ ]?question/i, /pointer/i],
    scenarios: [
      {
        scenario: "a missing stated-question pointer is deterministically rejected",
        patterns: [/pointer/i, /missing|absent|without|no[-_ ]pointer/i, /reject|refus|invalid/i],
      },
      {
        scenario: "a pointer at a nonexistent question id is deterministically rejected",
        patterns: [
          /question[-_ ]?id/i,
          /nonexistent|non-existent|unknown|dangling|missing/i,
          /reject|refus|invalid/i,
        ],
      },
      {
        scenario: "a valid pointer promotes fog→decided (referential integrity)",
        patterns: [/valid/i, /promot/i, /referential|integrity/i],
      },
      {
        scenario: "the promotion test is invariant to answer-existence / answerability",
        patterns: [/answerab|answer[-_ ]?exist/i, /invarian|regardless|unchanged|independent/i],
      },
    ],
  },
  {
    label: "out-of-scope re-questioning exclusion gate",
    redTestPath: "src/interview/dimension/out-of-scope.redtest.ts",
    redRunRecordPath: "design/ac-38-out-of-scope.red-run.json",
    targetImportSpecifier: "./out-of-scope",
    vocabulary: [/out[-_ ]?of[-_ ]?scope/i, /reason/i],
    scenarios: [
      {
        scenario: "an out-of-scope designation without a non-empty reason is rejected",
        patterns: [/reason/i, /empty|blank|missing|whitespace/i, /reject|refus|invalid/i],
      },
      {
        scenario: "out-of-scope dimensions are excluded from question-candidate enumeration",
        patterns: [/candidate/i, /exclud|omit|filter|not[-_ ]?includ/i],
      },
      {
        scenario: "a direct re-question against an out-of-scope dimension is refused",
        patterns: [/re[-_ ]?question|재질문/i, /refus|reject|forbid|denied|not[-_ ]?allow/i],
      },
    ],
  },
];

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sha256Hex = (absolutePath: string): string =>
  createHash("sha256").update(readFileSync(absolutePath)).digest("hex");

const readRedRunRecord = (absolutePath: string): Record<string, unknown> =>
  JSON.parse(readFileSync(absolutePath, "utf8")) as Record<string, unknown>;

const countMatches = (source: string, pattern: RegExp): number =>
  source.match(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`))?.length ?? 0;

const testTitlesOf = (source: string): readonly string[] => {
  const titles: string[] = [];
  const titlePattern = /\b(?:test|it)\s*\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let match = titlePattern.exec(source);
  while (match !== null) {
    titles.push(match[2] ?? "");
    match = titlePattern.exec(source);
  }
  return titles;
};

const targetImportBindings = (source: string, specifier: string): readonly string[] => {
  const importPattern = new RegExp(
    `import\\s+([^;]*?)\\s*from\\s*["']${escapeForRegExp(specifier)}["']`,
  );
  const clause = source.match(importPattern)?.[1] ?? "";
  return (
    clause.match(/[A-Za-z_$][\w$]*/g)?.filter((name) => name !== "as" && name !== "type") ?? []
  );
};

// Re-observe redness instead of trusting the recorded self-report. The red test
// is deliberately named outside the default glob, so bun needs the explicit
// "./" path form to treat the argument as a file rather than a name filter.
const observeRedExitCode = (relativeRedTestPath: string): number | null => {
  const run = spawnSync(process.execPath, ["test", `./${relativeRedTestPath}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  return run.status;
};

// ---------------------------------------------------------------------------
// Clause 1 — spec rescan (doc evidence) against the single-definition module
// ---------------------------------------------------------------------------

describe("ac-38 clause 1 — spec rescan shares the single definition in three-ledger-spec", () => {
  test("the single definition pins the fixed spec document path", () => {
    expect(THREE_LEDGER_SPEC_PATH).toBe("design/ac-38-three-ledger-state.md");
  });

  test("exactly the six required section markers are declared, non-empty and distinct", () => {
    expect(Object.keys(THREE_LEDGER_SPEC_REQUIRED_SECTIONS).sort()).toEqual(
      [...REQUIRED_SECTION_KEYS].sort(),
    );
    const markers = REQUIRED_SECTION_KEYS.map((key) => THREE_LEDGER_SPEC_REQUIRED_SECTIONS[key]);
    for (const marker of markers) {
      expect(typeof marker).toBe("string");
      expect(marker.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(markers).size).toBe(REQUIRED_SECTION_KEYS.length);
  });

  for (const key of REQUIRED_SECTION_KEYS) {
    test(`the '${key}' section marker carries its load-bearing phrases`, () => {
      const marker = THREE_LEDGER_SPEC_REQUIRED_SECTIONS[key];
      for (const phrase of REQUIRED_MARKER_PHRASES[key]) {
        expect(marker).toContain(phrase);
      }
    });
  }

  test("the spec document exists at the fixed path and is not empty", () => {
    expect(existsSync(resolve(REPO_ROOT, THREE_LEDGER_SPEC_PATH))).toBe(true);
    expect(readSpecDocument().trim().length).toBeGreaterThan(0);
  });

  test("the spec document contains every required section marker verbatim", () => {
    const document = readSpecDocument();
    for (const key of REQUIRED_SECTION_KEYS) {
      expect(document).toContain(THREE_LEDGER_SPEC_REQUIRED_SECTIONS[key]);
    }
  });
});

// ---------------------------------------------------------------------------
// Clause 2 — additive dimensionState enum migration
// ---------------------------------------------------------------------------

describe("ac-38 clause 2 — additive dimensionState enum migration", () => {
  test("the pre-migration snapshot is cross-checked against ac-26's own frozen surface", () => {
    // ac-26 established: DIMENSION_STATES = LEGACY_DIMENSION_STATES + unevaluated.
    // The snapshot the new module declares must contain every one of those, so a
    // value cannot be deleted during this migration by omitting it here.
    expect(LEGACY_DIMENSION_STATES.length).toBeGreaterThan(0);
    expect(LEGACY_DIMENSION_STATES).toContain("open");
    expect(LEGACY_DIMENSION_STATES).toContain("resolved");
    for (const legacyValue of LEGACY_DIMENSION_STATES) {
      expect(PRE_THREE_LEDGER_DIMENSION_STATES).toContain(legacyValue);
    }
    expect(PRE_THREE_LEDGER_DIMENSION_STATES).toContain("unevaluated");
    expect(new Set(PRE_THREE_LEDGER_DIMENSION_STATES).size).toBe(
      PRE_THREE_LEDGER_DIMENSION_STATES.length,
    );
  });

  test("every pre-migration value survives in the migrated enum (no removal, no rename)", () => {
    for (const value of PRE_THREE_LEDGER_DIMENSION_STATES) {
      expect(DIMENSION_STATES).toContain(value);
    }
    expect(new Set(DIMENSION_STATES).size).toBe(DIMENSION_STATES.length);
  });

  test("the migration is additive-only — the enum gains nothing but the ledger values", () => {
    // Pins the snapshot from the other side: post-migration values are exactly
    // the pre-migration set plus the three ledger values, so the snapshot cannot
    // quietly shrink to hide a deletion.
    const preSet = new Set<string>(PRE_THREE_LEDGER_DIMENSION_STATES);
    const ledgerSet = new Set<string>(ledgerValueList());
    for (const value of DIMENSION_STATES) {
      expect(preSet.has(value) || ledgerSet.has(value)).toBe(true);
    }
    const expectedSize = new Set<string>([...preSet, ...ledgerSet]).size;
    expect(new Set<string>(DIMENSION_STATES).size).toBe(expectedSize);
  });

  test("the three ledger states exist as mutually distinct dimensionState enum values", () => {
    expect(Object.keys(THREE_LEDGER_STATES).sort()).toEqual(["decided", "fog", "outOfScope"]);
    for (const value of ledgerValueList()) {
      expect(typeof value).toBe("string");
      expect(DIMENSION_STATES).toContain(value);
    }
    expect(new Set(ledgerValueList()).size).toBe(3);
  });

  test("fog and out-of-scope are the new enum values — absent from the pre-migration set", () => {
    expect(PRE_THREE_LEDGER_DIMENSION_STATES).not.toContain(THREE_LEDGER_STATES.fog);
    expect(PRE_THREE_LEDGER_DIMENSION_STATES).not.toContain(THREE_LEDGER_STATES.outOfScope);
  });

  test("an existing-shape dimension record carrying no new value still parses", () => {
    for (const state of PRE_THREE_LEDGER_DIMENSION_STATES) {
      const legacyShapeRecord = { id: `dim-${state}`, criticality: "critical", state };
      expect(dimensionRecordSchema.safeParse(legacyShapeRecord).success).toBe(true);
    }
  });

  test("a record carrying each three-ledger state parses (the ledgers are real enum values)", () => {
    for (const state of ledgerValueList()) {
      const record = { id: `dim-${state}`, criticality: "critical", state };
      expect(dimensionRecordSchema.safeParse(record).success).toBe(true);
    }
  });

  test("the record schema's accepted state set is exactly the enum, not a permissive shell", () => {
    const enumValues = new Set<string>(DIMENSION_STATES);
    for (const state of DIMENSION_STATES) {
      expect(dimensionRecordSchema.safeParse({ id: "dim-a", state }).success).toBe(true);
      for (const mutation of [`${state}-x`, state.toUpperCase(), ` ${state}`]) {
        if (enumValues.has(mutation)) continue;
        expect(dimensionRecordSchema.safeParse({ id: "dim-a", state: mutation }).success).toBe(
          false,
        );
      }
    }
    expect(dimensionRecordSchema.safeParse({ id: "dim-a" }).success).toBe(false);
    expect(dimensionRecordSchema.safeParse({ state: "resolved" }).success).toBe(false);
    expect(dimensionRecordSchema.safeParse("resolved").success).toBe(false);
  });

  test("a state unknown to the enum is refused — the record schema is not a vacuous shell", () => {
    const bogusRecord = { id: "dim-x", criticality: "critical", state: "definitely-not-a-state" };
    expect(dimensionRecordSchema.safeParse(bogusRecord).success).toBe(false);
  });

  test("parsed existing-shape records keep their ac-26 meaning in ac-26's real consumers", () => {
    // Backward compatibility is not judged against a schema authored for this
    // test alone: the parsed values are handed to the ac-26 surface that really
    // consumes dimension states, and its frozen aggregation meaning must hold.
    const parse = (id: string, state: string) => {
      const parsed = dimensionRecordSchema.safeParse({ id, criticality: "critical", state });
      expect(parsed.success).toBe(true);
      if (!parsed.success) throw new Error("unreachable");
      return asDimension(parsed.data.id as string, parsed.data.state as string);
    };
    const resolvedDimension = parse("dim-res", "resolved");
    const openDimension = parse("dim-open", "open");
    const unevaluatedDimension = parse("dim-unev", "unevaluated");

    expect(allDimensionsClosed([resolvedDimension])).toBe(true);
    expect(allDimensionsClosed([resolvedDimension, openDimension])).toBe(false);
    expect(allDimensionsClosed([resolvedDimension, unevaluatedDimension])).toBe(false);
    expect(closedDimensionCount([resolvedDimension, openDimension])).toBe(1);
    const blockers = readinessBlockers([openDimension, resolvedDimension]);
    expect(blockers).toContain("dim-open");
    expect(blockers).not.toContain("dim-res");
  });
});

// ---------------------------------------------------------------------------
// Clauses 3 & 4 — frozen red design artifacts. No green of the gate behavior is
// required (residual); the judgment closes at existence, the scenario content
// the oracle names, a re-observed red run, and the frozen hash.
// ---------------------------------------------------------------------------

describe("ac-38 clauses 3 & 4 — frozen red design artifacts", () => {
  for (const artifact of FROZEN_RED_ARTIFACTS) {
    const redTestAbsolute = resolve(REPO_ROOT, artifact.redTestPath);
    const recordAbsolute = resolve(REPO_ROOT, artifact.redRunRecordPath);
    const readRedTest = (): string => readFileSync(redTestAbsolute, "utf8");

    describe(artifact.label, () => {
      test("the red test file exists, is non-empty, and stays out of the default test glob", () => {
        expect(artifact.redTestPath.endsWith(".redtest.ts")).toBe(true);
        const basename = artifact.redTestPath.split("/").pop() ?? "";
        expect(basename.includes(".test.")).toBe(false);
        expect(basename.includes(".spec.")).toBe(false);
        expect(basename.includes("_test_")).toBe(false);
        expect(basename.includes("_spec_")).toBe(false);
        expect(existsSync(redTestAbsolute)).toBe(true);
        expect(readRedTest().trim().length).toBeGreaterThan(0);
      });

      test("the red test is a real bun:test file importing named bindings of its target", () => {
        const source = readRedTest();
        expect(source).toContain("bun:test");
        const bindings = targetImportBindings(source, artifact.targetImportSpecifier);
        expect(bindings.length).toBeGreaterThan(0);
        for (const binding of bindings) {
          expect(source.split(binding).length).toBeGreaterThan(2);
        }
        expect(/\bexpect\s*\(/.test(source)).toBe(true);
      });

      test("the red test carries at least one distinct, substantive test per judged scenario", () => {
        const source = readRedTest();
        const titles = testTitlesOf(source);
        expect(titles.length).toBeGreaterThanOrEqual(artifact.scenarios.length);
        expect(new Set(titles).size).toBe(titles.length);
        for (const title of titles) {
          expect(title.trim().length).toBeGreaterThanOrEqual(12);
        }
        expect(countMatches(source, /\bexpect\s*\(/)).toBeGreaterThanOrEqual(titles.length);
      });

      test("the red test source speaks this gate's subject-matter vocabulary", () => {
        const source = readRedTest();
        for (const pattern of artifact.vocabulary) {
          expect(pattern.test(source)).toBe(true);
        }
      });

      for (const { scenario, patterns } of artifact.scenarios) {
        test(`the red test encodes the judged scenario: ${scenario}`, () => {
          const source = readRedTest();
          for (const pattern of patterns) {
            expect(pattern.test(source)).toBe(true);
          }
        });
      }

      test("the red-run record names this red test and reports a non-zero exit code", () => {
        expect(existsSync(recordAbsolute)).toBe(true);
        const record = readRedRunRecord(recordAbsolute);
        expect(record.test_path).toBe(artifact.redTestPath);
        expect(Number.isInteger(record.observed_red_exit_code)).toBe(true);
        expect(record.observed_red_exit_code).not.toBe(0);
      });

      test("the recorded red observation is re-observed: the red test still exits non-zero", () => {
        const observed = observeRedExitCode(artifact.redTestPath);
        expect(typeof observed).toBe("number");
        expect(observed).not.toBe(0);
        const record = readRedRunRecord(recordAbsolute);
        expect(record.observed_red_exit_code).toBe(observed);
      }, 180_000);

      test("the recorded frozen sha256 matches the current red test content", () => {
        const record = readRedRunRecord(recordAbsolute);
        expect(typeof record.frozen_sha256).toBe("string");
        expect(/^[0-9a-f]{64}$/.test(record.frozen_sha256 as string)).toBe(true);
        expect(record.frozen_sha256).toBe(sha256Hex(redTestAbsolute));
      });
    });
  }
});
