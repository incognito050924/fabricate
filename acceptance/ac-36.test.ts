/**
 * ac-36 acceptance — C1 frontier (DESIGN node). The judged object is not the
 * runtime frontier behavior but the three design deliverables the locked
 * statement declares as the completion bar: a frontier computation spec (on
 * top of the orderPendingBranchWork seam), the frontier-empty ⇒ dry mapping
 * that reuses the existing `diminishing_returns` member (no new enum), and a
 * design-produced frozen red test with its pre-implementation red run record.
 *
 * Oracle (gate-a/rows/ac-36.json), covered clauses:
 *  (1) spec existence — src/interview/schedule/frontier-spec.md exists and is
 *      non-empty (the file itself is submitted as the doc→file evidence).
 *  (2) scheduling by dependency frontier, on top of orderPendingBranchWork —
 *      the spec's machine-readable declaration block (convention fixed here:
 *      the unique ```json fence whose object carries a "seam" key) passes zod
 *      parsing; its seam field is exactly "orderPendingBranchWork" and ties to
 *      the real seam export of src/interview/schedule/order-pending-branch-work.ts,
 *      which must be an input-taking function (arity >= 1) whose module really
 *      consumes ac-29's src/interview/graph/branch-edge.ts surface — a named
 *      binding imported from that module and used in the module body, not a
 *      dangling import over a constant-returning shell; a frontier-definition
 *      clause exists, references ac-29's branch-edge premise graph as input,
 *      and defines frontier membership with the verbatim phrase
 *      "미해소 선행이 없는 pending 노드 집합".
 *  (3) frontier-empty is the dry signal, reusing diminishing_returns — the
 *      declaration's dry_signal is exactly "diminishing_returns" and
 *      introduces_new_enum is exactly false; a frontier-empty ⇒ dry mapping
 *      clause exists and names diminishing_returns; a deterministic body scan
 *      (dry_signal assignments, quoted snake_case tokens on termination-context
 *      lines and inside termination-context code fences) detects no new
 *      termination enum member declaration — any new name fails.
 *  (4) scoring demotion — the declaration's scoring_scope is exactly
 *      "frontier-internal"; a demotion clause exists stating scores never
 *      schedule candidates outside the frontier ("frontier 밖") and are used
 *      only for selection within it ("frontier 내 선택").
 *  (5) red test deliverable — src/interview/schedule/frontier.redtest.ts
 *      exists with a name outside bun's default test glob (asserted against the
 *      glob's own pattern, so the green suite is provably not polluted) and,
 *      with comments stripped so nothing can be satisfied by prose, is a real
 *      executable red test: it imports bun:test, imports named bindings from
 *      the exact implementation target src/interview/schedule/frontier.ts,
 *      declares at least three test cases whose titles cover the three
 *      behaviors the design hands to the future implementation (frontier
 *      scheduling · frontier-empty ⇒ dry · scoring demotion) under distinct
 *      cases, and carries at least three assertion statements of which at
 *      least two assert on a frontier binding and at least one names
 *      diminishing_returns — an always-pass constant shell fails all of this.
 *      The red itself is *observed here, not reported*: this test spawns
 *      `bun test <frontier.redtest.ts>` and requires a non-zero exit from a
 *      run that actually loaded the file (runner summary present, no
 *      "no matches" filter miss, a non-zero fail/error count). That live run
 *      also observes the module_plan's "frontier.ts stays unimplemented within
 *      ac-36 so the red is sustained": a frontier.ts that turned the red test
 *      green would flip the exit code to 0 and fail this assertion. The
 *      pre-implementation red observation record (convention fixed here:
 *      src/interview/schedule/frontier.red-run.json with test_path +
 *      observed_red_exit_code + frozen_hash, the ac-33 freeze convention)
 *      must point at the red test, record the same non-zero exit code the
 *      live run just produced, and carry a frozen_hash equal to the sha256 of
 *      the current red test body — so the record cannot outlive an edit.
 *
 * Residual (NOT tested here, per the row's residual declaration):
 *  - Design adequacy of the spec content — whether the frontier definition
 *    captures the dependency structure well enough to actually govern question
 *    scheduling is a human judgment (decision 0001 separates document-quality
 *    judgment from evidence-kind relaxation; ac-36's contract vocabulary has
 *    no human-evidence kind, so this test cannot and does not close it).
 *  - Actual execution behavior of frontier scheduling, frontier-empty ⇒ dry,
 *    and scoring demotion — the DESIGN node's completion bar stops at spec +
 *    red test; the behavior closes when frontier.redtest.ts goes green under
 *    the future C1 implementation, outside this criterion. This file therefore
 *    asserts that the red test *is red now*, never that it passes.
 *  - Semantic sufficiency of the ac-29 branch-edge seam for frontier
 *    computation — only the structural consumption of the seam is checked
 *    here; what orderPendingBranchWork computes is not pinned, because the
 *    oracle keeps clause 2 to "seam 참조 문자열 … 결정적 검사" and the seam's
 *    semantic fitness is explicitly this row's residual.
 */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { orderPendingBranchWork } from "../src/interview/schedule/order-pending-branch-work";

const PROJECT_ROOT = resolve(import.meta.dir, "..");
const SPEC_RELATIVE_PATH = "src/interview/schedule/frontier-spec.md";
const SEAM_RELATIVE_PATH = "src/interview/schedule/order-pending-branch-work.ts";
const BRANCH_EDGE_MODULE_PATH = "src/interview/graph/branch-edge";
const FRONTIER_MODULE_PATH = "src/interview/schedule/frontier";
const RED_TEST_RELATIVE_PATH = "src/interview/schedule/frontier.redtest.ts";
const RED_RUN_RECORD_RELATIVE_PATH = "src/interview/schedule/frontier.red-run.json";
const SPEC_PATH = join(PROJECT_ROOT, SPEC_RELATIVE_PATH);
const SEAM_PATH = join(PROJECT_ROOT, SEAM_RELATIVE_PATH);
const RED_TEST_PATH = join(PROJECT_ROOT, RED_TEST_RELATIVE_PATH);
const RED_RUN_RECORD_PATH = join(PROJECT_ROOT, RED_RUN_RECORD_RELATIVE_PATH);

const readSpec = (): string => readFileSync(SPEC_PATH, "utf8");
const readRedTest = (): string => readFileSync(RED_TEST_PATH, "utf8");
const sha256Hex = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

// ---------------------------------------------------------------------------
// Source scanning primitives. Every source-level predicate below runs on the
// comment-stripped text, so no requirement can be satisfied by a comment.
// ---------------------------------------------------------------------------

type ScanState = "code" | "line" | "block" | "single" | "double" | "template";

const stripComments = (source: string): string => {
  let state: ScanState = "code";
  let output = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (state === "code") {
      if (char === "/" && next === "/") {
        state = "line";
        output += " ";
        index += 1;
      } else if (char === "/" && next === "*") {
        state = "block";
        output += " ";
        index += 1;
      } else {
        if (char === "'") state = "single";
        else if (char === '"') state = "double";
        else if (char === "`") state = "template";
        output += char;
      }
      continue;
    }
    if (state === "line") {
      if (char === "\n") {
        state = "code";
        output += char;
      }
      continue;
    }
    if (state === "block") {
      if (char === "*" && next === "/") {
        state = "code";
        index += 1;
      } else if (char === "\n") {
        output += char;
      }
      continue;
    }
    // inside a string literal: copy verbatim, honour escapes
    output += char;
    if (char === "\\") {
      output += next;
      index += 1;
      continue;
    }
    if (
      (state === "single" && char === "'") ||
      (state === "double" && char === '"') ||
      (state === "template" && char === "`")
    ) {
      state = "code";
    }
  }
  return output;
};

type ImportStatement = { text: string; clause: string; specifier: string };

const IMPORT_STATEMENT = /import\s+([\s\S]*?)\s+from\s*["']([^"']+)["']/g;

const importStatements = (strippedSource: string): ImportStatement[] =>
  [...strippedSource.matchAll(IMPORT_STATEMENT)].map((match) => ({
    text: match[0],
    clause: match[1] ?? "",
    specifier: match[2] ?? "",
  }));

const withoutExtension = (path: string): string => path.replace(/\.(?:ts|tsx|js|mjs|cjs)$/, "");

const resolvedSpecifier = (fromFile: string, specifier: string): string =>
  withoutExtension(resolve(dirname(fromFile), specifier));

const importsOfModule = (
  strippedSource: string,
  fromFile: string,
  targetAbsolutePath: string,
): ImportStatement[] =>
  importStatements(strippedSource).filter(
    (statement) =>
      statement.specifier.startsWith(".") &&
      resolvedSpecifier(fromFile, statement.specifier) === targetAbsolutePath,
  );

/** Local names bound by an import clause: named, default and namespace forms. */
const boundNames = (clause: string): string[] => {
  const names: string[] = [];
  const braces = /\{([\s\S]*?)\}/.exec(clause);
  if (braces) {
    for (const entry of (braces[1] ?? "").split(",")) {
      const parts = entry.trim().split(/\s+as\s+/);
      const local = (parts[parts.length - 1] ?? "").trim().replace(/^type\s+/, "");
      if (/^[A-Za-z_$][\w$]*$/.test(local)) names.push(local);
    }
  }
  const namespace = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(clause);
  if (namespace?.[1]) names.push(namespace[1]);
  const head = clause.replace(/\{[\s\S]*?\}/g, "").replace(/\*\s+as\s+[A-Za-z_$][\w$]*/g, "");
  const defaultName = /^\s*([A-Za-z_$][\w$]*)\s*,?\s*$/.exec(head);
  if (defaultName?.[1] && defaultName[1] !== "type") names.push(defaultName[1]);
  return names;
};

const usedOutsideImports = (
  strippedSource: string,
  imports: ImportStatement[],
  name: string,
): boolean => {
  let body = strippedSource;
  for (const statement of imports) body = body.split(statement.text).join(" ");
  return new RegExp(`\\b${name}\\b`).test(body);
};

/**
 * Assertion statements: from each `expect(` token to the statement terminator
 * at paren depth 0, so the whole matcher chain is captured.
 */
const assertionStatements = (strippedSource: string): string[] => {
  const statements: string[] = [];
  for (const match of strippedSource.matchAll(/\bexpect\s*\(/g)) {
    const start = match.index ?? 0;
    let depth = 0;
    let quote = "";
    let end = strippedSource.length;
    for (let index = start; index < strippedSource.length; index += 1) {
      const char = strippedSource[index] ?? "";
      if (quote !== "") {
        if (char === "\\") index += 1;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === "'" || char === '"' || char === "`") {
        quote = char;
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      else if ((char === ";" || char === "\n") && depth <= 0) {
        end = index;
        break;
      }
    }
    statements.push(strippedSource.slice(start, end));
  }
  return statements;
};

const testTitles = (strippedSource: string): string[] =>
  [...strippedSource.matchAll(/\b(?:test|it)\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map(
    (match) => match[2] ?? "",
  );

/** Does a system of distinct representatives exist for the matched index sets? */
const hasDistinctRepresentatives = (candidateSets: number[][], taken: number[] = []): boolean => {
  const [head, ...rest] = candidateSets;
  if (head === undefined) return true;
  return head.some(
    (candidate) =>
      !taken.includes(candidate) && hasDistinctRepresentatives(rest, [...taken, candidate]),
  );
};

// ---------------------------------------------------------------------------
// Machine-readable declaration block: the unique ```json fence whose parsed
// object carries a "seam" key. Extra fields are tolerated (passthrough); the
// four oracle-named fields are required.
// ---------------------------------------------------------------------------

const JSON_FENCE = /```json\s*\n([\s\S]*?)```/g;

const declarationSchema = z
  .object({
    seam: z.string().min(1),
    dry_signal: z.string().min(1),
    introduces_new_enum: z.boolean(),
    scoring_scope: z.string().min(1),
  })
  .passthrough();

type FrontierDeclaration = z.infer<typeof declarationSchema>;

const declarationCandidates = (markdown: string): unknown[] => {
  const candidates: unknown[] = [];
  for (const fence of markdown.matchAll(JSON_FENCE)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fence[1] ?? "");
    } catch {
      continue; // a json fence that is not strict JSON is not the declaration block
    }
    if (typeof parsed === "object" && parsed !== null && "seam" in parsed) {
      candidates.push(parsed);
    }
  }
  return candidates;
};

const loadDeclaration = (): FrontierDeclaration => {
  const candidates = declarationCandidates(readSpec());
  if (candidates.length !== 1) {
    throw new Error(
      `expected exactly one machine-readable declaration block, found ${candidates.length}`,
    );
  }
  return declarationSchema.parse(candidates[0]);
};

// ---------------------------------------------------------------------------
// Markdown section extraction: a section runs from its heading to the next
// heading of the same or higher level.
// ---------------------------------------------------------------------------

type MarkdownSection = { heading: string; text: string };

const markdownSections = (markdown: string): MarkdownSection[] => {
  const lines = markdown.split("\n");
  const headings: { title: string; level: number; line: number }[] = [];
  for (const [index, line] of lines.entries()) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      headings.push({ title: match[2] ?? "", level: (match[1] ?? "").length, line: index });
    }
  }
  return headings.map((heading, order) => {
    let end = lines.length;
    for (let next = order + 1; next < headings.length; next += 1) {
      const candidate = headings[next];
      if (candidate && candidate.level <= heading.level) {
        end = candidate.line;
        break;
      }
    }
    return { heading: heading.title, text: lines.slice(heading.line, end).join("\n") };
  });
};

const sectionWithHeading = (markdown: string, headingPattern: RegExp): MarkdownSection | null =>
  markdownSections(markdown).find((section) => headingPattern.test(section.heading)) ?? null;

// ---------------------------------------------------------------------------
// Clause 3 deterministic body scan: a new termination enum member declaration
// is (a) any dry_signal assignment whose value is not diminishing_returns, or
// (b) any quoted/backticked snake_case token outside the allowlist appearing
// on a termination-context line or inside a termination-context code fence.
// Enum members in this codebase are snake_case, so a quoted snake_case name in
// termination context that is not the reused member reads as a new member.
// ---------------------------------------------------------------------------

const ALLOWED_TERMINATION_TOKENS = new Set([
  "diminishing_returns", // the reused existing member — the only allowed termination enum name
  "dry_signal",
  "introduces_new_enum",
  "scoring_scope",
  "branch_edges",
]);

const TERMINATION_CONTEXT = /dry|종결|termination/i;
const QUOTED_SNAKE_TOKEN = /[`"']([a-z][a-z0-9]*(?:_[a-z0-9]+)+)[`"']/g;
const DRY_SIGNAL_ASSIGNMENT = /dry_signal\W{0,3}["'`]([^"'`]+)["'`]/g;
const ANY_FENCE = /```[^\n]*\n([\s\S]*?)```/g;

const snakeTokenViolations = (text: string, label: string): string[] => {
  const violations: string[] = [];
  for (const token of text.matchAll(QUOTED_SNAKE_TOKEN)) {
    const name = token[1] ?? "";
    if (!ALLOWED_TERMINATION_TOKENS.has(name)) violations.push(`${label}:${name}`);
  }
  return violations;
};

const newTerminationEnumViolations = (markdown: string): string[] => {
  const violations: string[] = [];
  for (const assignment of markdown.matchAll(DRY_SIGNAL_ASSIGNMENT)) {
    const value = assignment[1] ?? "";
    if (value !== "diminishing_returns") violations.push(`dry_signal=${value}`);
  }
  for (const line of markdown.split("\n")) {
    if (TERMINATION_CONTEXT.test(line)) violations.push(...snakeTokenViolations(line, "line"));
  }
  for (const fence of markdown.matchAll(ANY_FENCE)) {
    const block = fence[1] ?? "";
    if (TERMINATION_CONTEXT.test(block)) violations.push(...snakeTokenViolations(block, "fence"));
  }
  return violations;
};

// ---------------------------------------------------------------------------
// Clause 5: red run record shape (ac-33's freeze convention, adopted here).
// ---------------------------------------------------------------------------

const redRunRecordSchema = z
  .object({
    test_path: z.string().min(1),
    observed_red_exit_code: z.number().int(),
    frozen_hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .passthrough();

/** bun's default test glob — a deliverable named outside it cannot pollute the green suite. */
const DEFAULT_TEST_GLOB = /(?:^|[./_-])(?:test|spec)[._]|[._](?:test|spec)\.[cm]?[jt]sx?$/;

type RedRun = { exitCode: number; output: string };

const runRedTestOnce = (): RedRun => {
  const spawned = Bun.spawnSync({
    cmd: ["bun", "test", RED_TEST_PATH],
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const decoder = new TextDecoder();
  return {
    exitCode: spawned.exitCode ?? -1,
    output: `${decoder.decode(spawned.stdout)}\n${decoder.decode(spawned.stderr)}`,
  };
};

// ---------------------------------------------------------------------------
// Clause 1 — the frontier computation spec exists and is non-empty
// ---------------------------------------------------------------------------

describe("ac-36 clause 1 — frontier spec document", () => {
  test("the frontier computation spec exists at the planned path and is non-empty", () => {
    expect(existsSync(SPEC_PATH)).toBe(true);
    expect(readSpec().trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Clause 2 — declaration block, seam anchoring, frontier definition clause
// ---------------------------------------------------------------------------

describe("ac-36 clause 2 — dependency-frontier scheduling on top of orderPendingBranchWork", () => {
  test("the spec carries exactly one machine-readable declaration block that passes zod parsing", () => {
    const candidates = declarationCandidates(readSpec());
    expect(candidates.length).toBe(1);
    expect(declarationSchema.safeParse(candidates[0]).success).toBe(true);
  });

  test("the declaration seam field points at the real orderPendingBranchWork seam export, which takes input", () => {
    const declaration = loadDeclaration();
    expect(declaration.seam).toBe("orderPendingBranchWork");
    expect(typeof orderPendingBranchWork).toBe("function");
    expect(orderPendingBranchWork.name).toBe("orderPendingBranchWork");
    // a zero-argument seam cannot order anything it is handed — `() => []` fails here
    expect(orderPendingBranchWork.length).toBeGreaterThanOrEqual(1);
  });

  test("the seam module really consumes ac-29's branch-edge surface, not a dangling import", () => {
    expect(existsSync(SEAM_PATH)).toBe(true);
    const seamSource = stripComments(readFileSync(SEAM_PATH, "utf8"));
    const branchEdgeImports = importsOfModule(
      seamSource,
      SEAM_PATH,
      join(PROJECT_ROOT, BRANCH_EDGE_MODULE_PATH),
    );
    expect(branchEdgeImports.length).toBeGreaterThanOrEqual(1);
    const bindings = branchEdgeImports.flatMap((statement) => boundNames(statement.clause));
    expect(bindings.length).toBeGreaterThanOrEqual(1);
    const consumed = bindings.filter((name) =>
      usedOutsideImports(seamSource, branchEdgeImports, name),
    );
    expect(consumed.length).toBeGreaterThanOrEqual(1);
  });

  test("a frontier definition clause exists, takes the branch-edge premise graph as input, and defines membership verbatim", () => {
    const section = sectionWithHeading(readSpec(), /frontier 정의/i);
    expect(section).not.toBeNull();
    if (section === null) throw new Error("unreachable");
    expect(section.text).toContain("branch-edge");
    expect(section.text).toContain("전제 그래프");
    expect(section.text).toContain("미해소 선행이 없는 pending 노드 집합");
  });
});

// ---------------------------------------------------------------------------
// Clause 3 — frontier-empty ⇒ dry reuses diminishing_returns, no new enum
// ---------------------------------------------------------------------------

describe("ac-36 clause 3 — frontier-empty maps to the existing diminishing_returns dry signal", () => {
  test("dry_signal is exactly diminishing_returns and introduces_new_enum is exactly false", () => {
    const declaration = loadDeclaration();
    expect(declaration.dry_signal).toBe("diminishing_returns");
    expect(declaration.introduces_new_enum).toBe(false);
  });

  test("a frontier-empty to dry mapping clause exists and names diminishing_returns", () => {
    const section = sectionWithHeading(readSpec(), /frontier-empty/i);
    expect(section).not.toBeNull();
    if (section === null) throw new Error("unreachable");
    expect(section.text).toContain("diminishing_returns");
    expect(/dry|종결/.test(section.text)).toBe(true);
  });

  test("the spec body scan detects no new termination enum member declaration", () => {
    expect(newTerminationEnumViolations(readSpec())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Clause 4 — scoring demoted to frontier-internal selection
// ---------------------------------------------------------------------------

describe("ac-36 clause 4 — scoring is demoted to selection within the frontier", () => {
  test("scoring_scope is exactly frontier-internal", () => {
    expect(loadDeclaration().scoring_scope).toBe("frontier-internal");
  });

  test("a demotion clause exists: scores never schedule outside the frontier, only select within it", () => {
    const section = sectionWithHeading(readSpec(), /강등/);
    expect(section).not.toBeNull();
    if (section === null) throw new Error("unreachable");
    expect(section.text).toContain("점수");
    expect(section.text).toContain("frontier 밖");
    expect(section.text).toContain("frontier 내 선택");
  });
});

// ---------------------------------------------------------------------------
// Clause 5 — design-produced frozen red test, observed red, frozen record
// ---------------------------------------------------------------------------

describe("ac-36 clause 5 — design-produced red test artifact", () => {
  test("the red test is named outside bun's default test glob so the green suite stays clean", () => {
    expect(existsSync(RED_TEST_PATH)).toBe(true);
    expect(readRedTest().trim().length).toBeGreaterThan(0);
    expect(DEFAULT_TEST_GLOB.test(RED_TEST_RELATIVE_PATH)).toBe(false);
  });

  test("the red test imports named bindings from the exact frontier implementation target and uses them", () => {
    const source = stripComments(readRedTest());
    expect(/from\s*["']bun:test["']/.test(source)).toBe(true);
    const frontierImports = importsOfModule(
      source,
      RED_TEST_PATH,
      join(PROJECT_ROOT, FRONTIER_MODULE_PATH),
    );
    expect(frontierImports.length).toBeGreaterThanOrEqual(1);
    const bindings = frontierImports.flatMap((statement) => boundNames(statement.clause));
    expect(bindings.length).toBeGreaterThanOrEqual(1);
    const used = bindings.filter((name) => usedOutsideImports(source, frontierImports, name));
    expect(used.length).toBeGreaterThanOrEqual(1);
  });

  test("the red test judges frontier scheduling, frontier-empty to dry, and scoring demotion under distinct cases", () => {
    const source = stripComments(readRedTest());
    const titles = testTitles(source);
    expect(titles.length).toBeGreaterThanOrEqual(3);
    const behaviorPatterns: RegExp[] = [
      /schedul|스케줄|순서|order/i,
      /(?:empty|비어|빈)[\s\S]*(?:dry|diminish|종결)|(?:dry|diminish|종결)[\s\S]*(?:empty|비어|빈)/i,
      /score|scoring|점수|강등|동률|tie/i,
    ];
    const matchedIndices = behaviorPatterns.map((pattern) =>
      titles.flatMap((title, index) => (pattern.test(title) ? [index] : [])),
    );
    for (const indices of matchedIndices) expect(indices.length).toBeGreaterThanOrEqual(1);
    expect(hasDistinctRepresentatives(matchedIndices)).toBe(true);
  });

  test("the red test carries real assertions on the frontier surface, not constant tautologies", () => {
    const source = stripComments(readRedTest());
    const frontierImports = importsOfModule(
      source,
      RED_TEST_PATH,
      join(PROJECT_ROOT, FRONTIER_MODULE_PATH),
    );
    const bindings = frontierImports.flatMap((statement) => boundNames(statement.clause));
    const statements = assertionStatements(source);
    expect(statements.length).toBeGreaterThanOrEqual(3);
    const onFrontier = statements.filter((statement) =>
      bindings.some((name) => new RegExp(`\\b${name}\\b`).test(statement)),
    );
    expect(onFrontier.length).toBeGreaterThanOrEqual(2);
    const onDrySignal = statements.filter((statement) => statement.includes("diminishing_returns"));
    expect(onDrySignal.length).toBeGreaterThanOrEqual(1);
  });

  test("running the red test right now actually exits non-zero — red observed, not reported", () => {
    const run = runRedTestOnce();
    // the runner really loaded the target file (not a filter miss reported as failure)
    expect(/no matches|did not match any test files/i.test(run.output)).toBe(false);
    expect(/Ran\s+\d+\s+tests?\s+across\s+\d+\s+files?/.test(run.output)).toBe(true);
    expect(/\b[1-9]\d*\s+(?:fail|error)/.test(run.output)).toBe(true);
    expect(run.exitCode).not.toBe(0);
  }, 120_000);

  test("the red run record matches the exit code just observed and is hash-frozen to the current red test", () => {
    expect(existsSync(RED_RUN_RECORD_PATH)).toBe(true);
    const parsed = redRunRecordSchema.safeParse(
      JSON.parse(readFileSync(RED_RUN_RECORD_PATH, "utf8")),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("unreachable");
    expect(parsed.data.test_path).toBe(RED_TEST_RELATIVE_PATH);
    expect(parsed.data.observed_red_exit_code).not.toBe(0);
    expect(parsed.data.observed_red_exit_code).toBe(runRedTestOnce().exitCode);
    expect(parsed.data.frozen_hash).toBe(sha256Hex(readRedTest()));
  }, 120_000);
});
