import { describe, expect, test } from "bun:test";
/**
 * ac-26 acceptance — A2 resolution shell: a critical dimension's resolved
 * close is accepted only when justifying_reason + user-answer marker +
 * refutation_attempted are all present; any missing marker leaves the
 * dimension `unevaluated` (a real dimensionState enum value, not closed),
 * every dimensionState consumer is wired for it, and non-critical closes
 * keep their existing behavior. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-26.json), covered clauses:
 *  (1) three-marker requirement — a critical resolved close carrying a
 *      non-empty justifying_reason, a non-empty user-answer marker (the
 *      positive fixture points it at a recorded user answer turn), and
 *      refutation_attempted is accepted: dimensionState becomes "resolved".
 *      Empty-string justifying_reason / user_answer_marker do not satisfy
 *      the non-empty requirement.
 *  (2) three-value gate (prism port) — each single-marker-missing fixture
 *      (3 kinds) and the all-missing fixture (1 kind) yield "unevaluated":
 *      no exception, no silent pass. "resolved", "unevaluated", and "open"
 *      are three distinct dimensionState enum values.
 *  (3) unevaluated is not closed — closure aggregation does not count an
 *      unevaluated dimension as closed; with an unevaluated dimension
 *      remaining, the all-dimensions-closed verdict does not hold.
 *  (4) wiring — "unevaluated" exists as a dimensionState enum value (not a
 *      side-channel field) and the extension is additive: every legacy enum
 *      value is preserved (no removal, no rename), "unevaluated" is the
 *      addition. The exhaustive matcher dispatches a handler per enum value.
 *      (4a) deterministic src/ scan — a consumption point is a production
 *      .ts file under src/ (unit *.test.ts files excluded: they exercise
 *      states as data, not as production consumption points) that imports
 *      the dimension-state module — directly or through any re-exporting
 *      module — and branches on dimensionState values. The enumeration must
 *      be non-empty and must include the closure-aggregation module, and
 *      zero points may lack an explicit unevaluated arm (case, comparison,
 *      handler key) or a matcher call — so no consumer can swallow
 *      unevaluated via default-fallthrough.
 *      (4b) the new-surface consumers — readiness aggregation and closure
 *      aggregation — branch explicitly on unevaluated input, and a value
 *      unknown to the enum never falls through to closed (it is either
 *      excluded from closed / reported as a blocker, or refused).
 *  (5) backward compatibility — a non-critical resolved close closes
 *      without the three markers (the shell fires only on critical resolved
 *      closes), and an existing-shape close record without the three new
 *      fields still parses (the new fields are optional at schema level,
 *      required only on the critical-resolved path) while the schema still
 *      rejects malformed records and preserves parsed values verbatim.
 *
 * How the scan is kept honest (the matcher exemption and the text rules):
 *  - all textual rules run on comment-stripped source, so a comment
 *    mentioning "unevaluated" can never stand in for a real arm;
 *  - the matcher exemption is only sound if a missing handler is a
 *    compile error, so this file checks that condition directly: it runs
 *    the repo's own tsc over generated probes (complete handler map must
 *    compile, a map missing one enum value and an off-enum state value must
 *    not) and additionally asserts the runtime refusal;
 *  - branching through anything other than a dimensionState string literal
 *    or the exhaustive matcher (imported constant aliases, namespace
 *    members) is itself a violation, so partial enumeration cannot be used
 *    to escape the unevaluated requirement.
 *
 * Residual (NOT tested here, per row residual):
 *  - Resolution-content judgment — whether justifying_reason actually
 *    justifies the close, whether the answer the user-answer marker points
 *    at actually resolves the dimension, and whether refutation_attempted
 *    was a genuine refutation attempt are human-judged predicates the locked
 *    statement itself declares residual. This test enforces only the
 *    presence/non-emptiness of the three fields and the three-value
 *    state-transition structure.
 *  - Port fidelity to the prism original (engine.ts:143-187) — this test
 *    does not compare against prism source; only the ported three-value
 *    gate's own behavior is checked, not behavioral equivalence with the
 *    original.
 */
import { mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  allDimensionsClosed,
  closeRecordSchema,
  closedDimensionCount,
  readinessBlockers,
} from "../src/interview/dimension/close";
import { attemptResolvedClose } from "../src/interview/dimension/resolution-shell";
import {
  DIMENSION_STATES,
  type DimensionState,
  LEGACY_DIMENSION_STATES,
  matchDimensionState,
} from "../src/interview/dimension/state";

// ---------------------------------------------------------------------------
// Fixtures. Marker CONTENT adequacy is residual (see header) — only presence,
// non-emptiness, and the resulting state transitions are asserted.
// ---------------------------------------------------------------------------

const recordedUserAnswerTurns = [
  {
    turn_id: "turn-3",
    role: "user",
    text: "재시도는 3회까지만 하고, 그 뒤에는 실패로 확정해 주세요.",
  },
];

const criticalDimension = {
  id: "dim-retry-policy",
  criticality: "critical",
  state: "open",
};

const nonCriticalDimension = {
  id: "dim-log-format",
  criticality: "non-critical",
  state: "open",
};

const JUSTIFYING_REASON =
  "The user fixed the retry ceiling at three attempts, settling this dimension.";

const completeCriticalClose = {
  dimension_id: "dim-retry-policy",
  target_state: "resolved",
  justifying_reason: JUSTIFYING_REASON,
  user_answer_marker: "turn-3",
  refutation_attempted: true,
};

// Existing-shape close record: no justifying_reason, no user_answer_marker,
// no refutation_attempted — the pre-shell shape.
const legacyShapeClose = {
  dimension_id: "dim-log-format",
  target_state: "resolved",
};

const THREE_MARKER_FIELDS = [
  "justifying_reason",
  "user_answer_marker",
  "refutation_attempted",
] as const;

const OFF_ENUM_STATE = "definitely-not-a-state";

const withoutField = (record: Record<string, unknown>, field: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== field));

const dimension = (id: string, state: string) => ({ id, state: state as DimensionState });

// ---------------------------------------------------------------------------
// Clause 4a deterministic scan (see header for the consumer definition).
// Every textual rule below runs on comment-stripped source.
// ---------------------------------------------------------------------------

const SRC_ROOT = resolve(import.meta.dir, "../src");
const STATE_MODULE_PATH = join(SRC_ROOT, "interview", "dimension", "state");
const CLOSE_MODULE_RELATIVE = "interview/dimension/close.ts";
const MATCHER_CALL = /\bmatchDimensionState\s*\(/;

const toPosix = (value: string): string => value.split(sep).join("/");

// Comments must not be able to satisfy any textual rule.
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1");

const listProductionSourceFiles = (dir: string): string[] => {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listProductionSourceFiles(full));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
};

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const moduleKey = (path: string): string => path.replace(/\.ts$/, "").replace(/\/index$/, "");

const resolveSpecifier = (file: string, specifier: string): string | null =>
  specifier.startsWith(".") ? moduleKey(toPosix(resolve(dirname(file), specifier))) : null;

const importSpecifiers = (source: string): string[] =>
  [...source.matchAll(/(?:\bfrom|\bimport|\brequire)\s*\(?\s*["']([^"']+)["']/g)].map(
    (match) => match[1] ?? "",
  );

const reExportSpecifiers = (source: string): string[] =>
  [
    ...source.matchAll(
      /\bexport\s+(?:\*(?:\s+as\s+\w+)?|type\s*\{[^}]*\}|\{[^}]*\})\s*from\s*["']([^"']+)["']/g,
    ),
  ].map((match) => match[1] ?? "");

type SourceFile = { file: string; source: string };

// Closure of the state module under re-export: a barrel that re-exports the
// state module counts as the state module for import purposes, so consumers
// cannot hide behind an indirection.
const stateModuleClosure = (files: SourceFile[]): Set<string> => {
  const closure = new Set<string>([moduleKey(toPosix(STATE_MODULE_PATH))]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const { file, source } of files) {
      const self = moduleKey(toPosix(file));
      if (closure.has(self)) continue;
      for (const specifier of reExportSpecifiers(source)) {
        const resolved = resolveSpecifier(file, specifier);
        if (resolved && closure.has(resolved)) {
          closure.add(self);
          grew = true;
          break;
        }
      }
    }
  }
  return closure;
};

const importsStateClosure = (file: string, source: string, closure: Set<string>): boolean =>
  importSpecifiers(source).some((specifier) => {
    const resolved = resolveSpecifier(file, specifier);
    return resolved !== null && closure.has(resolved);
  });

const namesImportedFromClosure = (file: string, source: string, closure: Set<string>): string[] => {
  const names: string[] = [];
  for (const match of source.matchAll(
    /\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    const resolved = resolveSpecifier(file, match[2] ?? "");
    if (resolved === null || !closure.has(resolved)) continue;
    for (const part of (match[1] ?? "").split(",")) {
      const name = part
        .replace(/\btype\b/g, "")
        .split(/\bas\b/)
        .pop()
        ?.trim();
      if (name) names.push(name);
    }
  }
  for (const match of source.matchAll(/\bimport\s+\*\s+as\s+(\w+)\s*from\s*["']([^"']+)["']/g)) {
    const resolved = resolveSpecifier(file, match[2] ?? "");
    if (resolved !== null && closure.has(resolved)) names.push(match[1] ?? "");
  }
  return names.filter((name) => name.length > 0);
};

// Allowed branch forms: a dimensionState string literal (case label or
// equality comparison), a dimensionState key in a dispatch map, or the
// exhaustive matcher.
const literalBranchPatterns = (value: string): RegExp[] => {
  const literal = `["']${escapeForRegExp(value)}["']`;
  return [
    new RegExp(`case\\s+${literal}`),
    new RegExp(`[=!]==?\\s*${literal}`),
    new RegExp(`${literal}\\s*[=!]==?`),
  ];
};

const dispatchKeyPattern = (value: string): RegExp =>
  new RegExp(`(?:^|[{,\\s])["']?${escapeForRegExp(value)}["']?\\s*:`, "m");

const branchesOnLiteral = (source: string, value: string): boolean =>
  literalBranchPatterns(value).some((pattern) => pattern.test(source)) ||
  dispatchKeyPattern(value).test(source);

// Forbidden branch form: comparing against an identifier re-exported from the
// state module (constant alias, namespace member) instead of a literal. The
// member chain is restricted to capitalised segments and call expressions are
// excluded, so `DIMENSION_STATES.length === 3` and `x === matchDimensionState(...)`
// are not mistaken for state comparisons.
const aliasBranchPatterns = (name: string): RegExp[] => {
  const identifier = `${escapeForRegExp(name)}(?:\\.[A-Z]\\w*)*(?!\\s*\\()`;
  return [
    new RegExp(`case\\s+${identifier}\\s*:`),
    new RegExp(`[=!]==?\\s*${identifier}\\b`),
    new RegExp(`\\b${identifier}\\s*[=!]==?`),
  ];
};

type ConsumptionPoint = {
  file: string;
  branchedValues: string[];
  usesMatcher: boolean;
  aliasBranches: string[];
};

const scanDimensionStateConsumers = (): {
  points: ConsumptionPoint[];
  violations: string[];
} => {
  const files: SourceFile[] = listProductionSourceFiles(SRC_ROOT).map((file) => ({
    file,
    source: stripComments(readFileSync(file, "utf8")),
  }));
  const closure = stateModuleClosure(files);
  const points: ConsumptionPoint[] = [];
  const violations: string[] = [];
  for (const { file, source } of files) {
    if (closure.has(moduleKey(toPosix(file)))) continue;
    if (!importsStateClosure(file, source, closure)) continue;
    const branchedValues = DIMENSION_STATES.filter((value: DimensionState) =>
      branchesOnLiteral(source, value),
    );
    const usesMatcher = MATCHER_CALL.test(source);
    const aliasBranches = namesImportedFromClosure(file, source, closure).filter((name) =>
      aliasBranchPatterns(name).some((pattern) => pattern.test(source)),
    );
    if (branchedValues.length === 0 && !usesMatcher && aliasBranches.length === 0) continue;
    const relativePath = toPosix(relative(SRC_ROOT, file));
    points.push({ file: relativePath, branchedValues, usesMatcher, aliasBranches });
    if (aliasBranches.length > 0) {
      violations.push(`${relativePath}: non-literal branch on ${aliasBranches.join(", ")}`);
      continue;
    }
    // A file that branches on any dimensionState literal must carry the
    // unevaluated arm itself; calling the matcher elsewhere in the same file
    // does not excuse a literal branch set that omits unevaluated.
    if (branchedValues.length > 0 && !branchesOnLiteral(source, "unevaluated")) {
      violations.push(`${relativePath}: no explicit unevaluated arm`);
    }
  }
  return { points, violations };
};

// ---------------------------------------------------------------------------
// Compile-time enforcement probe: the matcher exemption in the 4a scan is only
// legitimate if omitting an enum value fails to compile. The repo's own tsc is
// run over generated probes to check exactly that.
// ---------------------------------------------------------------------------

const TSC_BIN = resolve(import.meta.dir, "../node_modules/.bin/tsc");

const handlerEntries = (values: readonly string[]): string =>
  values.map((value) => `  ${JSON.stringify(value)}: () => 1,`).join("\n");

const typecheckProbe = (body: string): { exitCode: number; output: string } => {
  const dir = realpathSync(mkdtempSync(join(realpathSync(tmpdir()), "ac-26-typecheck-")));
  const probe = join(dir, "probe.ts");
  const importPath = toPosix(relative(dir, STATE_MODULE_PATH));
  writeFileSync(
    probe,
    `import { matchDimensionState } from ${JSON.stringify(importPath)};\n${body}\n`,
    "utf8",
  );
  const run = Bun.spawnSync({
    cmd: [
      TSC_BIN,
      "--noEmit",
      "--strict",
      "--target",
      "esnext",
      "--module",
      "esnext",
      "--moduleResolution",
      "bundler",
      "--skipLibCheck",
      probe,
    ],
    cwd: resolve(import.meta.dir, ".."),
  });
  return {
    exitCode: run.exitCode ?? 1,
    output: `${run.stdout.toString()}${run.stderr.toString()}`,
  };
};

// ---------------------------------------------------------------------------
// Clause 1 — three-marker requirement on critical resolved close
// ---------------------------------------------------------------------------

describe("ac-26 clause 1 — critical resolved close requires all three markers", () => {
  test("a critical resolved close carrying all three markers is accepted as resolved", () => {
    // The positive fixture's user-answer marker points at a recorded user
    // answer turn (fixture consistency; content adequacy is residual).
    expect(
      recordedUserAnswerTurns.some(
        (turn) => turn.role === "user" && turn.turn_id === completeCriticalClose.user_answer_marker,
      ),
    ).toBe(true);
    const result = attemptResolvedClose(criticalDimension, completeCriticalClose);
    expect(result.state).toBe("resolved");
  });

  test("an empty justifying_reason does not satisfy the marker requirement (non-empty required)", () => {
    const close = { ...completeCriticalClose, justifying_reason: "" };
    expect(attemptResolvedClose(criticalDimension, close).state).toBe("unevaluated");
  });

  test("an empty user_answer_marker does not satisfy the marker requirement (non-empty required)", () => {
    const close = { ...completeCriticalClose, user_answer_marker: "" };
    expect(attemptResolvedClose(criticalDimension, close).state).toBe("unevaluated");
  });
});

// ---------------------------------------------------------------------------
// Clause 2 — three-value gate: missing markers leave the dimension unevaluated
// ---------------------------------------------------------------------------

describe("ac-26 clause 2 — three-value gate (prism port): missing markers yield unevaluated", () => {
  for (const field of THREE_MARKER_FIELDS) {
    test(`omitting '${field}' alone yields unevaluated — no exception, no silent close`, () => {
      const close = withoutField(completeCriticalClose, field);
      expect(() => attemptResolvedClose(criticalDimension, close)).not.toThrow();
      expect(attemptResolvedClose(criticalDimension, close).state).toBe("unevaluated");
    });
  }

  test("omitting all three markers yields unevaluated — no exception, no silent close", () => {
    const close = THREE_MARKER_FIELDS.reduce<Record<string, unknown>>(
      (record, field) => withoutField(record, field),
      completeCriticalClose,
    );
    expect(() => attemptResolvedClose(criticalDimension, close)).not.toThrow();
    expect(attemptResolvedClose(criticalDimension, close).state).toBe("unevaluated");
  });

  test("resolved, unevaluated, and open are three distinct dimensionState enum values", () => {
    expect(DIMENSION_STATES).toContain("resolved");
    expect(DIMENSION_STATES).toContain("unevaluated");
    expect(DIMENSION_STATES).toContain("open");
    expect(new Set(DIMENSION_STATES).size).toBe(DIMENSION_STATES.length);
  });
});

// ---------------------------------------------------------------------------
// Clause 3 — unevaluated is not closed
// ---------------------------------------------------------------------------

describe("ac-26 clause 3 — unevaluated dimensions are never counted as closed", () => {
  test("an all-resolved dimension set passes the all-dimensions-closed verdict (baseline)", () => {
    expect(
      allDimensionsClosed([dimension("dim-a", "resolved"), dimension("dim-b", "resolved")]),
    ).toBe(true);
  });

  test("one remaining unevaluated dimension defeats the all-dimensions-closed verdict", () => {
    expect(
      allDimensionsClosed([dimension("dim-a", "resolved"), dimension("dim-b", "unevaluated")]),
    ).toBe(false);
  });

  test("the closed count excludes unevaluated and open dimensions", () => {
    const dimensions = [
      dimension("dim-a", "resolved"),
      dimension("dim-b", "unevaluated"),
      dimension("dim-c", "open"),
    ];
    expect(closedDimensionCount(dimensions)).toBe(1);
  });

  test("a shell-rejected critical close flows into aggregation as not closed (end to end)", () => {
    const rejected = attemptResolvedClose(
      criticalDimension,
      withoutField(completeCriticalClose, "refutation_attempted"),
    );
    expect(rejected.state).toBe("unevaluated");
    const dimensions = [
      dimension("dim-other", "resolved"),
      { id: criticalDimension.id, state: rejected.state },
    ];
    expect(allDimensionsClosed(dimensions)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Clause 4 — dimensionState enum extension is additive; matcher is exhaustive
// ---------------------------------------------------------------------------

describe("ac-26 clause 4 — additive dimensionState enum extension", () => {
  test("unevaluated exists as a dimensionState enum value, not a side-channel field", () => {
    expect(DIMENSION_STATES).toContain("unevaluated");
  });

  test("every legacy enum value is preserved; unevaluated is the addition (no removal, no rename)", () => {
    expect(LEGACY_DIMENSION_STATES.length).toBeGreaterThan(0);
    for (const legacyValue of LEGACY_DIMENSION_STATES) {
      expect(DIMENSION_STATES).toContain(legacyValue);
    }
    expect(LEGACY_DIMENSION_STATES).toContain("open");
    expect(LEGACY_DIMENSION_STATES).toContain("resolved");
    expect(LEGACY_DIMENSION_STATES).not.toContain("unevaluated");
  });

  test("the extended enum is built from the legacy list, not re-typed beside it", () => {
    // Structural anchor: DIMENSION_STATES must be derived from
    // LEGACY_DIMENSION_STATES, so no legacy value can be dropped or renamed
    // while the legacy list still claims it. The runtime consequence is that
    // the legacy values keep their positions as a prefix of the new enum.
    const stateSource = stripComments(readFileSync(`${STATE_MODULE_PATH}.ts`, "utf8"));
    expect(
      /\.\.\.\s*LEGACY_DIMENSION_STATES|LEGACY_DIMENSION_STATES\s*\.\s*concat/.test(stateSource),
    ).toBe(true);
    expect(DIMENSION_STATES.slice(0, LEGACY_DIMENSION_STATES.length)).toEqual([
      ...LEGACY_DIMENSION_STATES,
    ]);
  });

  test("each legacy value keeps its aggregation meaning (behavioral anchor, not a bare list)", () => {
    expect(allDimensionsClosed([dimension("dim-legacy", "resolved")])).toBe(true);
    expect(allDimensionsClosed([dimension("dim-legacy", "open")])).toBe(false);
    expect(
      closedDimensionCount([dimension("dim-open", "open"), dimension("dim-res", "resolved")]),
    ).toBe(1);
    const blockers = readinessBlockers([
      dimension("dim-open", "open"),
      dimension("dim-res", "resolved"),
    ]);
    expect(blockers).toContain("dim-open");
    expect(blockers).not.toContain("dim-res");
  });

  test("the exhaustive matcher dispatches a handler for every enum value", () => {
    const handlers = Object.fromEntries(
      DIMENSION_STATES.map((value: DimensionState) => [value, () => `handled:${value}`]),
    );
    for (const value of DIMENSION_STATES) {
      expect(matchDimensionState(value, handlers)).toBe(`handled:${value}`);
    }
  });

  test("the matcher refuses a handler map that is missing an enum value (runtime)", () => {
    const partial = Object.fromEntries(
      DIMENSION_STATES.filter((value: DimensionState) => value !== "unevaluated").map(
        (value: DimensionState) => [value, () => `handled:${value}`],
      ),
    );
    expect(() => matchDimensionState("unevaluated" as DimensionState, partial)).toThrow();
  });

  test("the matcher refuses a state value unknown to the enum (runtime)", () => {
    const handlers = Object.fromEntries(
      DIMENSION_STATES.map((value: DimensionState) => [value, () => `handled:${value}`]),
    );
    expect(() => matchDimensionState(OFF_ENUM_STATE as DimensionState, handlers)).toThrow();
  });
});

describe("ac-26 clause 4 — the matcher is type-enforced, which is what licenses the scan exemption", () => {
  test("a handler map covering every enum value compiles (control)", () => {
    const probe = typecheckProbe(
      `const handlers = {\n${handlerEntries(DIMENSION_STATES)}\n};\nmatchDimensionState(${JSON.stringify(
        DIMENSION_STATES[0],
      )}, handlers);`,
    );
    expect(probe.output.includes("error TS")).toBe(false);
    expect(probe.exitCode).toBe(0);
  }, 120000);

  test("a handler map missing the unevaluated value fails to compile", () => {
    const probe = typecheckProbe(
      `const handlers = {\n${handlerEntries(
        DIMENSION_STATES.filter((value: DimensionState) => value !== "unevaluated"),
      )}\n};\nmatchDimensionState("unevaluated", handlers);`,
    );
    expect(probe.output.includes("error TS")).toBe(true);
    expect(probe.exitCode).not.toBe(0);
  }, 120000);

  test("an off-enum state value fails to compile at the matcher call site", () => {
    const probe = typecheckProbe(
      `const handlers = {\n${handlerEntries(
        DIMENSION_STATES,
      )}\n};\nmatchDimensionState(${JSON.stringify(OFF_ENUM_STATE)}, handlers);`,
    );
    expect(probe.output.includes("error TS")).toBe(true);
    expect(probe.exitCode).not.toBe(0);
  }, 120000);
});

describe("ac-26 clause 4a — src/ scan: every dimensionState consumption point handles unevaluated", () => {
  test("the scan enumerates the closure-aggregation consumer and is non-empty (no vacuous pass)", () => {
    const { points } = scanDimensionStateConsumers();
    expect(points.length).toBeGreaterThan(0);
    expect(points.map((point) => point.file)).toContain(CLOSE_MODULE_RELATIVE);
  });

  test("zero consumption points swallow unevaluated via default-fallthrough", () => {
    const { violations } = scanDimensionStateConsumers();
    expect(violations).toEqual([]);
  });

  test("comments cannot stand in for a real unevaluated arm (scan rule check)", () => {
    const commentOnly = stripComments(
      ["// unevaluated: 닫힘 아님", '/* case "unevaluated": */', "const x = 1;"].join("\n"),
    );
    expect(branchesOnLiteral(commentOnly, "unevaluated")).toBe(false);
    expect(MATCHER_CALL.test(commentOnly)).toBe(false);
    const realArm = stripComments('switch (s) {\n  case "unevaluated":\n    return false;\n}');
    expect(branchesOnLiteral(realArm, "unevaluated")).toBe(true);
  });
});

describe("ac-26 clause 4b — new-surface consumers branch explicitly on unevaluated", () => {
  test("readiness aggregation reports an unevaluated dimension as a blocker", () => {
    const blockers = readinessBlockers([
      dimension("dim-a", "resolved"),
      dimension("dim-b", "unevaluated"),
    ]);
    expect(blockers).toContain("dim-b");
    expect(blockers).not.toContain("dim-a");
  });

  test("a state value unknown to the enum never falls through to closed", () => {
    const bogus = [dimension("dim-x", OFF_ENUM_STATE)];

    let closedOutcome: number | "refused";
    try {
      closedOutcome = closedDimensionCount(bogus);
    } catch {
      closedOutcome = "refused";
    }
    expect(closedOutcome === 0 || closedOutcome === "refused").toBe(true);

    let verdictOutcome: boolean | "refused";
    try {
      verdictOutcome = allDimensionsClosed(bogus);
    } catch {
      verdictOutcome = "refused";
    }
    expect(verdictOutcome === false || verdictOutcome === "refused").toBe(true);

    let readinessOutcome: boolean | "refused";
    try {
      readinessOutcome = readinessBlockers(bogus).includes("dim-x");
    } catch {
      readinessOutcome = "refused";
    }
    expect(readinessOutcome === true || readinessOutcome === "refused").toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Clause 5 — backward compatibility
// ---------------------------------------------------------------------------

type ParsedClose = { success: boolean; data?: Record<string, unknown> };

const parseClose = (record: unknown): ParsedClose =>
  closeRecordSchema.safeParse(record) as ParsedClose;

describe("ac-26 clause 5 — backward compatibility", () => {
  test("a non-critical resolved close closes without the three markers (shell fires only on critical)", () => {
    const result = attemptResolvedClose(nonCriticalDimension, legacyShapeClose);
    expect(result.state).toBe("resolved");
  });

  test("an existing-shape close record parses and the three new fields stay absent (optional, not defaulted)", () => {
    const parsed = parseClose(legacyShapeClose);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.dimension_id).toBe("dim-log-format");
    expect(parsed.data?.target_state).toBe("resolved");
    for (const field of THREE_MARKER_FIELDS) {
      expect(parsed.data?.[field]).toBeUndefined();
    }
  });

  test("a close record carrying the three new fields parses and preserves them verbatim", () => {
    const parsed = parseClose(completeCriticalClose);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.dimension_id).toBe("dim-retry-policy");
    expect(parsed.data?.target_state).toBe("resolved");
    expect(parsed.data?.justifying_reason).toBe(JUSTIFYING_REASON);
    expect(parsed.data?.user_answer_marker).toBe("turn-3");
    expect(parsed.data?.refutation_attempted).toBe(true);
  });

  // Optional-at-schema-level must not degrade into "the schema accepts
  // anything": each malformed record below must be rejected.
  const REJECTED_RECORDS: Array<[string, unknown]> = [
    ["a record missing dimension_id", withoutField(completeCriticalClose, "dimension_id")],
    [
      "a record whose target_state is not a dimensionState value",
      { ...completeCriticalClose, target_state: OFF_ENUM_STATE },
    ],
    [
      "a record whose refutation_attempted is a string instead of a boolean",
      { ...completeCriticalClose, refutation_attempted: "yes" },
    ],
    [
      "a record whose justifying_reason is a number instead of a string",
      { ...completeCriticalClose, justifying_reason: 42 },
    ],
    [
      "a record whose user_answer_marker is null instead of a string",
      { ...completeCriticalClose, user_answer_marker: null },
    ],
    ["a non-object payload", "resolved"],
  ];

  for (const [label, record] of REJECTED_RECORDS) {
    test(`the close-record schema rejects ${label}`, () => {
      expect(parseClose(record).success).toBe(false);
    });
  }
});
