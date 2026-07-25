/**
 * ac-39 acceptance — C3 fidelity ladder (DESIGN node): a dimension stuck for
 * N rounds escalates to a prototype or three structurally-different
 * alternatives instead of more questions. The judged object is the design
 * output the statement declares as the completion bar: an inspectable spec,
 * a frozen red test for the stuck detector, the "three structurally distinct
 * alternatives (label-only variants forbidden)" gate, and the
 * silent-continued-questioning block. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-39.json), covered clauses:
 *  (1) spec rescan (doc evidence): the C3 spec document exists at the fixed
 *      path src/interview/escalation/fidelity-ladder.spec.md, is non-empty,
 *      and contains the four design-decision sections the draft declared as
 *      "cannot be written up front", each present and non-empty — anchored
 *      by deterministic heading tokens: (a) stuck-threshold-n, (b)
 *      stuck-verdict-rule, (c) prototype-feedback-channel, (d)
 *      escalation-channel. The stuck-verdict-rule section must declare reuse
 *      of the existing dry/novelty machinery — on the rebuilt surface, the
 *      ac-36 dry signal "diminishing_returns", declared as REUSE (the section
 *      body says 재사용) and defining no novelty computation of its own (the
 *      same deterministic no-own-novelty-definition scan applied to the
 *      detector source is applied to this section body, so a section that
 *      declares reuse and then also specifies its own novelty formula in a
 *      code block fails). Checks stop at existence + completeness; prose
 *      quality is not graded.
 *  (2) stuck-detector red test: src/interview/escalation/
 *      stuck-detector.redtest.ts exists (named *.redtest.ts so the default
 *      *.test.ts glob never runs it — same convention as ac-33) and is a real
 *      test that targets the stuck-detector module: it imports from
 *      "bun:test", calls describe/test/it, asserts with expect, and imports
 *      named bindings from the stuck-detector module under judgement (the
 *      ac-33/ac-36 redtest-artifact convention — a placeholder file whose
 *      whole content is a comment must not close this clause). Its red-first
 *      freeze record exists at design/c3-fidelity-ladder.red-run.json
 *      (mirroring ac-33's design/c6-prediction-probe.red-run.json convention),
 *      names the frozen redtest by its repo-relative path (under either the
 *      ac-33 key red_test_path or the ac-36 key test_path — at least one must
 *      be present, and every present one must name THIS redtest, so a record
 *      borrowed from another node fails), records the authoring party, and
 *      carries a non-null, non-zero observed_red_exit_code plus a frozen_hash
 *      that is a 64-hex sha256 equal to the hash of the current redtest
 *      content. The freeze is validated through the checkRedFirst convention
 *      (src/gate/red-first.ts) fed with the record's OWN author field — so the
 *      convention call carries force (a record that never records an external
 *      author is rejected by it) — and the convention is shown to
 *      discriminate: the same record with tampered content is rejected.
 *      This asserts that RED was observed and frozen, not that the redtest
 *      fails right now (the implementation node opens only after the spec
 *      locks). The stuck-detector module itself must consume the dry/novelty
 *      machine's signal vocabulary: it imports the signal from the ac-36 dry
 *      seam (a module specifier naming "frontier") and carries
 *      "diminishing_returns" as a quoted literal in COMMENT-STRIPPED source
 *      (mentioning it in a comment is not consuming it), exports a function,
 *      and must not define its own novelty computation (deterministic proxy:
 *      no function/const definition whose name contains "novelty").
 *  (3) structural-distinctness gate: a pure function accepts exactly three
 *      alternatives each carrying a structure-description field separate
 *      from its label; it rejects fixtures where any two structure
 *      descriptions are identical up to the label (label-only variants),
 *      rejects fewer than three, more than three (the oracle says "exactly
 *      three"), a missing structure field, and an empty structure
 *      description (fail-closed reading of "missing"); it passes the fixture
 *      whose three structure descriptions all differ.
 *  (4) silent continued questioning is blocked: on a fixture dimension
 *      already judged stuck after N rounds without progress (the stuck
 *      verdict enters as fixture input — detection itself is judged by the
 *      frozen redtest), emitting another question turn without an
 *      escalation record is rejected WITH a blocking reason that names the
 *      missing escalation record; with an escalation record
 *      ({type: "prototype" | "three_alternatives"}) the escalation turn is
 *      allowed, where three_alternatives additionally must pass gate (3).
 *      A non-stuck dimension keeps its question turns — without this the
 *      clause "a dimension judged stuck" would have no discriminating force.
 *  (5) determinism: gates (3) and (4) are pure — identical input always
 *      yields the identical decision.
 *
 * Residual (NOT tested here, per row residual):
 *  - Whether the three alternatives are REALLY structurally different in
 *    content — the gate closes only the deterministic label-excluded
 *    comparison of structure-description fields; detecting semantic evasion
 *    (same structure reworded) is a human-judged predicate and the contract
 *    evidence vocabulary (doc, test) has no human evidence kind.
 *  - The adequacy of the N value and of the stuck-verdict rule — the spec
 *    must define them (section existence), but whether they are good design
 *    is left open (the statement itself declares them undecidable up front).
 *  - The substance of prototype escalation — the prototype skill is external
 *    and real user feedback is required; machine judgment closes only the
 *    escalation-record schema and the feedback-channel design's existence.
 *  - Spec content coherence (design quality) — only existence/completeness
 *    is enforced deterministically (draft §3 governing principle).
 *  - Orchestration that opens downstream implementation nodes after the spec
 *    locks — autopilot completion-stage concern, outside this criterion.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkRedFirst, hashTestContent } from "../src/gate/red-first";
import {
  escalationRecordSchema,
  gateStuckDimensionTurn,
} from "../src/interview/escalation/escalation-gate";
import { gateStructuralDistinctness } from "../src/interview/escalation/structural-distinctness";

// --- Fixed paths (the oracle's rescan anchors) -------------------------------
const ROOT = join(import.meta.dir, "..");
const SPEC_RELATIVE_PATH = "src/interview/escalation/fidelity-ladder.spec.md";
const STUCK_DETECTOR_RELATIVE_PATH = "src/interview/escalation/stuck-detector.ts";
const REDTEST_RELATIVE_PATH = "src/interview/escalation/stuck-detector.redtest.ts";
const RED_RUN_RECORD_RELATIVE_PATH = "design/c3-fidelity-ladder.red-run.json";
const SPEC_PATH = join(ROOT, SPEC_RELATIVE_PATH);
const STUCK_DETECTOR_PATH = join(ROOT, STUCK_DETECTOR_RELATIVE_PATH);
const REDTEST_PATH = join(ROOT, REDTEST_RELATIVE_PATH);
const RED_RUN_RECORD_PATH = join(ROOT, RED_RUN_RECORD_RELATIVE_PATH);

const readIfExists = (path: string): string | null =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

const specDoc = readIfExists(SPEC_PATH);
const detectorSource = readIfExists(STUCK_DETECTOR_PATH);
const redtestContent = readIfExists(REDTEST_PATH);
const redRunRaw = readIfExists(RED_RUN_RECORD_PATH);
const redRunRecord: Record<string, unknown> | null = (() => {
  if (redRunRaw === null) return null;
  try {
    return JSON.parse(redRunRaw) as Record<string, unknown>;
  } catch {
    return null;
  }
})();

/**
 * Body of the first markdown section whose heading line contains the anchor
 * token, up to the next heading of any level (or EOF). Null when absent.
 */
const sectionBody = (doc: string, anchor: string): string | null => {
  const lines = doc.split("\n");
  const isHeading = (line: string): boolean => /^#{1,6}\s/.test(line);
  const start = lines.findIndex((line) => isHeading(line) && line.includes(anchor));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(isHeading);
  return rest.slice(0, end === -1 ? rest.length : end).join("\n");
};

// Deterministic proxy for "defines its own novelty computation": a function
// declaration or a const/let/var bound to a function/arrow whose identifier
// contains "novelty". Consuming an imported novelty/dry SIGNAL is fine;
// defining the computation locally is the forbidden invention.
const NOVELTY_DEFINITION_PATTERN =
  /function\s+[A-Za-z_$]*[Nn]ovelty[A-Za-z0-9_$]*\s*\(|(?:const|let|var)\s+[A-Za-z_$]*[Nn]ovelty[A-Za-z0-9_$]*\s*=\s*(?:async\b|function\b|\()/;

// --- Redtest-artifact patterns (the ac-33 / ac-36 redtest convention) --------
// A redtest artifact only counts as a red TEST when it is one: bun:test is
// imported, a test block is declared, an assertion is made, and the module
// under judgement is imported by name.
const BUN_TEST_IMPORT_PATTERN = /from\s+["']bun:test["']/;
const TEST_BLOCK_PATTERN = /\b(?:describe|test|it)\s*\(/;
const EXPECT_CALL_PATTERN = /\bexpect\s*\(/;
const STUCK_DETECTOR_IMPORT_PATTERN =
  /import\s+(?:type\s+)?\{[^}]*\}\s+from\s+["'][^"']*stuck-detector["']/;

// --- Detector-source patterns -------------------------------------------------
// "Consumes the dry/novelty machine's signal type" is proxied twice: the signal
// is imported from the ac-36 dry seam (specifier names "frontier"), and the
// signal token appears as a quoted literal in code — not merely in prose.
const DRY_SEAM_IMPORT_PATTERN = /from\s+["'][^"']*frontier["']/;
const DRY_SIGNAL_LITERAL_PATTERN = /["']diminishing_returns["']/;
const EXPORTED_FUNCTION_PATTERN =
  /export\s+(?:async\s+)?function\s+[A-Za-z_$]|export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*[:=]/;

/** Source with block comments and line comments removed (strings kept). */
const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/(^|[^:"'`\\])\/\/.*$/, "$1"))
    .join("\n");

/** Every repo-relative redtest path the red-run record names, under either key. */
const recordedRedTestPaths = (record: Record<string, unknown> | null): string[] =>
  ["red_test_path", "test_path"]
    .map((key) => record?.[key])
    .filter((value): value is string => typeof value === "string");

// --- Fixtures -----------------------------------------------------------------
// Three candidate alternatives whose structure descriptions all differ —
// the positive fixture for the structural-distinctness gate.
const structurallyDistinctAlternatives = [
  {
    label: "Option A — event queue",
    structure:
      "enqueue onto an event queue; a worker consumes asynchronously; failures quarantine to a dead-letter queue",
  },
  {
    label: "Option B — synchronous pipeline",
    structure: "run a staged pipeline on the request thread; roll back immediately on failure",
  },
  {
    label: "Option C — batch aggregation",
    structure: "a periodic batch aggregates snapshots and atomically swaps the result table",
  },
] as const;

// Negative fixture: label-only variants — one identical structure description
// under three different labels.
const labelOnlyAlternatives = [
  { label: "Option A", structure: "call the service and store the response" },
  { label: "Option B", structure: "call the service and store the response" },
  { label: "Option C", structure: "call the service and store the response" },
] as const;

// Negative fixture: ANY two identical up to the label must reject — here the
// third merely relabels the second's structure.
const twoIdenticalAlternatives = [
  structurallyDistinctAlternatives[0],
  structurallyDistinctAlternatives[1],
  {
    label: "Option C — pipeline, renamed",
    structure: structurallyDistinctAlternatives[1].structure,
  },
] as const;

const fewerThanThree = [
  structurallyDistinctAlternatives[0],
  structurallyDistinctAlternatives[1],
] as const;

const moreThanThree = [
  ...structurallyDistinctAlternatives,
  { label: "Option D — CRDT merge", structure: "replicas converge via CRDT merge" },
] as const;

const missingStructureField = [
  structurallyDistinctAlternatives[0],
  structurallyDistinctAlternatives[1],
  { label: "Option C — no structure given" },
] as const;

const emptyStructureField = [
  structurallyDistinctAlternatives[0],
  structurallyDistinctAlternatives[1],
  { label: "Option C — empty structure", structure: "" },
] as const;

// Dimension fixtures: the stuck verdict is fixed BY FIXTURE (whether it is
// really stuck is judged by the frozen stuck-detector redtest, not here).
const stuckDimension = {
  id: "dim-cancellation-policy",
  stuck: true,
  rounds_without_progress: 3,
} as const;

const progressingDimension = {
  id: "dim-refund-flow",
  stuck: false,
  rounds_without_progress: 1,
} as const;

const questionTurn = { kind: "question" } as const;
const escalationTurn = { kind: "escalation" } as const;

const prototypeRecord = { type: "prototype" } as const;
const threeAlternativesRecord = {
  type: "three_alternatives",
  alternatives: structurallyDistinctAlternatives,
} as const;
const labelOnlyEscalationRecord = {
  type: "three_alternatives",
  alternatives: labelOnlyAlternatives,
} as const;

describe("ac-39 clause 1 — C3 spec exists at the fixed path with the four design-decision sections", () => {
  test("spec document exists and is non-empty", () => {
    expect(specDoc).not.toBeNull();
    expect((specDoc ?? "").trim().length).toBeGreaterThan(0);
  });

  test("section (a) stuck-threshold-n — definition of the stuck threshold N — exists and is non-empty", () => {
    const body = sectionBody(specDoc ?? "", "stuck-threshold-n");
    expect(body).not.toBeNull();
    expect((body ?? "").trim().length).toBeGreaterThan(0);
  });

  test("section (b) stuck-verdict-rule — the stuck verdict rule — exists and is non-empty", () => {
    const body = sectionBody(specDoc ?? "", "stuck-verdict-rule");
    expect(body).not.toBeNull();
    expect((body ?? "").trim().length).toBeGreaterThan(0);
  });

  test("section (b) declares reuse of the existing dry/novelty machinery (ac-36 dry signal), not a new invention", () => {
    const body = sectionBody(specDoc ?? "", "stuck-verdict-rule") ?? "";
    expect(body).toContain("diminishing_returns");
    // The oracle's clause is a DECLARATION of reuse, not a passing mention.
    expect(body).toContain("재사용");
  });

  test("section (b) invents no novelty calculation of its own (the oracle's failing condition)", () => {
    const body = sectionBody(specDoc ?? "", "stuck-verdict-rule") ?? "";
    // Same scan as the detector source: a section that declares reuse and then
    // also specifies its own novelty computation fails the clause.
    expect(body).not.toMatch(NOVELTY_DEFINITION_PATTERN);
  });

  test("section (c) prototype-feedback-channel — exists and is non-empty", () => {
    const body = sectionBody(specDoc ?? "", "prototype-feedback-channel");
    expect(body).not.toBeNull();
    expect((body ?? "").trim().length).toBeGreaterThan(0);
  });

  test("section (d) escalation-channel — prototype / three structurally-different alternatives instead of questions — exists and is non-empty", () => {
    const body = sectionBody(specDoc ?? "", "escalation-channel");
    expect(body).not.toBeNull();
    expect((body ?? "").trim().length).toBeGreaterThan(0);
  });
});

describe("ac-39 clause 2 — stuck-detector red test is authored, red was observed, and the freeze holds", () => {
  test("stuck-detector.redtest.ts exists and is a real bun test, not a placeholder file", () => {
    expect(redtestContent).not.toBeNull();
    const source = redtestContent ?? "";
    expect(source.trim().length).toBeGreaterThan(0);
    expect(BUN_TEST_IMPORT_PATTERN.test(source)).toBe(true);
    expect(TEST_BLOCK_PATTERN.test(source)).toBe(true);
    expect(EXPECT_CALL_PATTERN.test(source)).toBe(true);
  });

  test("the redtest imports named bindings from the stuck-detector module under judgement", () => {
    const source = redtestContent ?? "";
    expect(STUCK_DETECTOR_IMPORT_PATTERN.test(source)).toBe(true);
  });

  test("red-run record exists with a non-null, non-zero observed red exit code", () => {
    expect(redRunRecord).not.toBeNull();
    const exitCode = redRunRecord?.observed_red_exit_code;
    expect(exitCode).not.toBeNull();
    expect(typeof exitCode).toBe("number");
    expect(exitCode).not.toBe(0);
  });

  test("the red-run record names THIS redtest by its repo-relative path", () => {
    const named = recordedRedTestPaths(redRunRecord);
    expect(named.length).toBeGreaterThan(0);
    for (const path of named) {
      expect(path).toBe(REDTEST_RELATIVE_PATH);
    }
  });

  test("the frozen hash is a sha256 hex digest of the current redtest content", () => {
    const frozenHash =
      typeof redRunRecord?.frozen_hash === "string" ? redRunRecord.frozen_hash : "";
    expect(/^[0-9a-f]{64}$/.test(frozenHash)).toBe(true);
    expect(frozenHash).toBe(hashTestContent(redtestContent ?? ""));
  });

  test("the freeze passes the checkRedFirst convention fed with the record's own author", () => {
    const record = redRunRecord ?? {};
    const frozenHash = typeof record.frozen_hash === "string" ? record.frozen_hash : "";
    const exitCode =
      typeof record.observed_red_exit_code === "number" ? record.observed_red_exit_code : null;
    // The author is taken FROM the record — the convention call must be able to
    // fail on its own (a record that never records an external author is
    // rejected here), not merely echo the assertions above.
    const decision = checkRedFirst({
      author: record.author as "external" | "loop",
      observed_red_exit_code: exitCode,
      frozen_hash: frozenHash,
      current_content: redtestContent,
    });
    expect(decision.reasons).toEqual([]);
    expect(decision.accepted).toBe(true);
  });

  test("the same freeze rejects tampered redtest content (the convention discriminates)", () => {
    const record = redRunRecord ?? {};
    const frozenHash = typeof record.frozen_hash === "string" ? record.frozen_hash : "";
    const exitCode =
      typeof record.observed_red_exit_code === "number" ? record.observed_red_exit_code : null;
    const tampered = checkRedFirst({
      author: record.author as "external" | "loop",
      observed_red_exit_code: exitCode,
      frozen_hash: frozenHash,
      current_content: `${redtestContent ?? ""}\n// weakened after the freeze`,
    });
    expect(tampered.accepted).toBe(false);
    expect(tampered.reasons.join(" ")).toContain("동결된 빨간 테스트 내용이 바뀌었다");
  });

  test("stuck-detector module imports the dry/novelty signal from the ac-36 dry seam", () => {
    expect(detectorSource).not.toBeNull();
    const source = detectorSource ?? "";
    expect(source.trim().length).toBeGreaterThan(0);
    expect(DRY_SEAM_IMPORT_PATTERN.test(source)).toBe(true);
    expect(EXPORTED_FUNCTION_PATTERN.test(source)).toBe(true);
  });

  test("stuck-detector consumes the signal in code (not in a comment) and defines no novelty computation of its own", () => {
    const code = stripComments(detectorSource ?? "");
    expect(DRY_SIGNAL_LITERAL_PATTERN.test(code)).toBe(true);
    expect(code).not.toMatch(NOVELTY_DEFINITION_PATTERN);
  });
});

describe("ac-39 clause 3 — three structurally distinct alternatives gate (label-only variants forbidden)", () => {
  test("three alternatives whose structure descriptions all differ pass", () => {
    const decision = gateStructuralDistinctness(structurallyDistinctAlternatives);
    expect(decision.accepted).toBe(true);
  });

  test("label-only variants (identical structure under three labels) are rejected with a reason", () => {
    const decision = gateStructuralDistinctness(labelOnlyAlternatives);
    expect(decision.accepted).toBe(false);
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  test("ANY two alternatives identical up to the label are rejected", () => {
    const decision = gateStructuralDistinctness(twoIdenticalAlternatives);
    expect(decision.accepted).toBe(false);
  });

  test("fewer than three alternatives are rejected", () => {
    const decision = gateStructuralDistinctness(fewerThanThree);
    expect(decision.accepted).toBe(false);
  });

  test("more than three alternatives are rejected (the gate demands exactly three)", () => {
    const decision = gateStructuralDistinctness(moreThanThree);
    expect(decision.accepted).toBe(false);
  });

  test("a missing structure-description field is rejected", () => {
    const decision = gateStructuralDistinctness(missingStructureField);
    expect(decision.accepted).toBe(false);
  });

  test("an empty structure description is rejected (fail-closed: it describes nothing)", () => {
    const decision = gateStructuralDistinctness(emptyStructureField);
    expect(decision.accepted).toBe(false);
  });
});

describe("ac-39 clause 4 — silent continued questioning on a stuck dimension is blocked; escalation is the way out", () => {
  test("a question turn on a stuck dimension without an escalation record is rejected with a blocking reason", () => {
    const decision = gateStuckDimensionTurn({
      dimension: stuckDimension,
      turn: questionTurn,
      escalation_record: null,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.length).toBeGreaterThan(0);
    // The blocking reason must name what is missing: the escalation record.
    expect(decision.reasons.join(" ")).toContain("에스컬레이션");
  });

  test("a prototype escalation record allows the escalation turn", () => {
    const decision = gateStuckDimensionTurn({
      dimension: stuckDimension,
      turn: escalationTurn,
      escalation_record: prototypeRecord,
    });
    expect(decision.allowed).toBe(true);
  });

  test("a three_alternatives escalation record passing the structural gate allows the escalation turn", () => {
    const decision = gateStuckDimensionTurn({
      dimension: stuckDimension,
      turn: escalationTurn,
      escalation_record: threeAlternativesRecord,
    });
    expect(decision.allowed).toBe(true);
  });

  test("a three_alternatives escalation record failing the structural gate (label-only) is rejected", () => {
    const decision = gateStuckDimensionTurn({
      dimension: stuckDimension,
      turn: escalationTurn,
      escalation_record: labelOnlyEscalationRecord,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  test("a non-stuck dimension keeps its question turns (the gate discriminates on stuckness)", () => {
    const decision = gateStuckDimensionTurn({
      dimension: progressingDimension,
      turn: questionTurn,
      escalation_record: null,
    });
    expect(decision.allowed).toBe(true);
  });

  test("escalation record schema accepts exactly the two escalation types", () => {
    expect(escalationRecordSchema.safeParse(prototypeRecord).success).toBe(true);
    expect(escalationRecordSchema.safeParse(threeAlternativesRecord).success).toBe(true);
  });

  test("an unknown escalation type is refused (enum: prototype | three_alternatives)", () => {
    expect(escalationRecordSchema.safeParse({ type: "silent_question" }).success).toBe(false);
  });

  test("a record without a type is refused", () => {
    expect(escalationRecordSchema.safeParse({}).success).toBe(false);
  });

  test("a three_alternatives record without its alternatives is refused (nothing for gate (3) to check)", () => {
    expect(escalationRecordSchema.safeParse({ type: "three_alternatives" }).success).toBe(false);
  });
});

describe("ac-39 clause 5 — both gates are pure functions (same input, same decision)", () => {
  test("structural-distinctness gate is deterministic on the accepting input", () => {
    const first = gateStructuralDistinctness(structurallyDistinctAlternatives);
    const second = gateStructuralDistinctness(structurallyDistinctAlternatives);
    expect(first.accepted).toBe(true);
    expect(second).toEqual(first);
  });

  test("structural-distinctness gate is deterministic on the rejecting input", () => {
    const first = gateStructuralDistinctness(labelOnlyAlternatives);
    const second = gateStructuralDistinctness(labelOnlyAlternatives);
    expect(first.accepted).toBe(false);
    expect(second).toEqual(first);
  });

  test("escalation gate is deterministic on the blocking input", () => {
    const input = {
      dimension: stuckDimension,
      turn: questionTurn,
      escalation_record: null,
    };
    const first = gateStuckDimensionTurn(input);
    const second = gateStuckDimensionTurn(input);
    expect(first.allowed).toBe(false);
    expect(second).toEqual(first);
  });

  test("escalation gate is deterministic on the allowing input", () => {
    const input = {
      dimension: stuckDimension,
      turn: escalationTurn,
      escalation_record: threeAlternativesRecord,
    };
    const first = gateStuckDimensionTurn(input);
    const second = gateStuckDimensionTurn(input);
    expect(first.allowed).toBe(true);
    expect(second).toEqual(first);
  });
});
