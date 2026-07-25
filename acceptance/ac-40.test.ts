import { describe, expect, test } from "bun:test";
/**
 * ac-40 acceptance — C4 calibration loop + synthetic-user regression harness
 * (DESIGN node). One run checks the three predicate bundles of the oracle
 * (gate-a/rows/ac-40.json):
 *
 *  (1) Spec document rescan (doc→file evidence, embedded here): the design
 *      spec at the fixed path src/interview/calibration/c4-spec.md is
 *      rescanned from disk; sections covering every clause of goal (a) —
 *      the 3-value confidence enum (likely/unsure/guess) on logged
 *      assumptions, the retro settlement stage, Brier-based VoI threshold
 *      feedback — and of goal (b) — synthetic-user regression testing of
 *      interview skill changes, the issue #72 efficacy-harness reuse
 *      decision (plugin, NOT a new harness) — must all exist with
 *      non-empty bodies. Missing doc / missing section / empty body fails.
 *
 *  (2) Completion criterion (a) red test: interviewAssumption.confidence
 *      parses only as the frozen 3-value enum {likely, unsure, guess}
 *      (anything else is refused at parse time, missing confidence is
 *      refused fail-closed); the settlement stage leaves one hit/miss
 *      settlement record per logged assumption (an assumption without a
 *      verdict refuses settlement fail-closed); the VoI threshold input is
 *      the per-class settled hit rate actually read off the records — the
 *      headline fixture (10 'likely' assumptions settled as 7 hits) feeds
 *      back 0.7 ("likely 70% settled → 0.7 feedback"), a second fixture of
 *      the same size and class settled as 3 hits feeds back 0.3, a class
 *      with zero hits feeds back 0 (present, not absent), and a class with
 *      no settlement records at all yields no value (fail-closed: absent,
 *      never invented).
 *
 *  (3) Completion criterion (b) red test: the regression module implements
 *      the issue #72 harness plugin seam — declares issue-72-efficacy as
 *      its host, registers through the host registry seam, and no
 *      standalone harness runner is introduced (repo-wide recursive
 *      structural check: no runner/cli/main-shaped harness file or
 *      directory anywhere outside the plugin module, no import.meta.main /
 *      argv entry point, no runner export); the regression baseline
 *      artifact (recall metric reference value) exists at the fixed
 *      exported path AND is the reference recall of the unchanged skill on
 *      the frozen fixture, so every shift assertion is derived from
 *      loadRecallBaseline() rather than a literal; on the deterministic
 *      fixture (before/after synthetic-user transcript pair simulating an
 *      interview skill change) the recall metric shift against that loaded
 *      baseline is detected (and NOT falsely detected when the skill is
 *      unchanged), including through the plugin hook when the caller omits
 *      an explicit baseline.
 *
 * Frozen red: every module under module_plan is new — this file fails at
 * import until the piece-3 implementation turns it green without editing
 * this file.
 *
 * Residual (NOT tested here, per row residual):
 *  - Correlation blind spot (shared with B5/C6): synthetic users share the
 *    same model prior; a shared misreading is undetectable by this harness.
 *  - Representativeness of synthetic users for real interview efficacy —
 *    human-judged; only deterministic fixture arithmetic is closed here.
 *  - Substance of settlement labels: whether an assumption actually held is
 *    human/LLM retro judgment; verdicts enter these tests as fixture inputs
 *    and only the post-verdict feedback arithmetic is closed.
 *  - Substance of the issue #72 reuse coordination: #72 is an external
 *    dependency; only plugin-seam conformance and absence of an independent
 *    runner are closed, not actual dedup/coordination with the real harness.
 *  - Design quality of the spec document: section presence and non-empty
 *    bodies only; design validity is human judgment (decision 0001).
 *  - Ordinality of the numbers: statistical validity of Brier/recall values
 *    is out of scope; only the arithmetic wiring is checked.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";
import * as baselineModule from "../src/harness/synthetic-user/baseline";
import { RECALL_BASELINE_PATH, loadRecallBaseline } from "../src/harness/synthetic-user/baseline";
import * as pluginModule from "../src/harness/synthetic-user/plugin";
import {
  interviewSkillRegressionPlugin,
  registerInterviewSkillRegressionPlugin,
} from "../src/harness/synthetic-user/plugin";
import * as recallModule from "../src/harness/synthetic-user/recall-metric";
import { computeRecall, detectRecallShift } from "../src/harness/synthetic-user/recall-metric";
import {
  CONFIDENCE_VALUES,
  interviewAssumptionSchema,
} from "../src/interview/calibration/confidence";
import { computeVoiThresholdInput } from "../src/interview/calibration/voi-feedback";
import { settleAssumptions } from "../src/ledger/retro-settlement";

// --- local fixture types (self-contained, no shared helpers) -----------------

type Confidence = "likely" | "unsure" | "guess";

type LoggedAssumption = {
  id: string;
  statement: string;
  confidence: Confidence;
};

type SettlementVerdict = "hit" | "miss";

type SettlementRecord = {
  assumption_id: string;
  confidence: Confidence;
  outcome: SettlementVerdict;
};

type SyntheticTranscript = {
  skill_version: string;
  ground_truth_fact_ids: string[];
  elicited_fact_ids: string[];
};

/** Per-confidence-class settled hit rate handed to the VoI threshold. */
type VoiThresholdInput = Partial<Record<Confidence, number>>;

// --- fixed paths --------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dir, "..");
const SPEC_PATH = resolve(REPO_ROOT, "src/interview/calibration/c4-spec.md");
const SYNTHETIC_USER_DIR = resolve(REPO_ROOT, "src/harness/synthetic-user");
const ACCEPTANCE_DIR = resolve(REPO_ROOT, "acceptance");

// --- spec markdown section scanner (local, deterministic) ---------------------

type SpecSection = { heading: string; body: string };

function scanSections(markdown: string): SpecSection[] {
  const out: SpecSection[] = [];
  let current: SpecSection | null = null;
  for (const line of markdown.split("\n")) {
    const match = line.match(/^#{1,6}\s+(.+)$/);
    if (match) {
      current = { heading: match[1] ?? "", body: "" };
      out.push(current);
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  return out;
}

function findSection(markdown: string, headingPattern: RegExp): SpecSection {
  const found = scanSections(markdown).find((s) => headingPattern.test(s.heading));
  return found ?? { heading: "", body: "" };
}

// --- recursive repo scanner (local, deterministic) ----------------------------

const SKIPPED_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

// --- fixtures: settlement -----------------------------------------------------

function likelyAssumptions(prefix: string): LoggedAssumption[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    statement: `assumption ${i + 1} logged during the interview`,
    confidence: "likely" as const,
  }));
}

/** Headline fixture: 10 'likely' assumptions, 1..7 hit, 8..10 miss -> 0.7. */
const LIKELY_ASSUMPTIONS: LoggedAssumption[] = likelyAssumptions("as-likely");

const LIKELY_VERDICTS: Record<string, SettlementVerdict> = Object.fromEntries(
  LIKELY_ASSUMPTIONS.map((a, i) => [a.id, i < 7 ? "hit" : "miss"]),
);

/**
 * Discriminating twin of the headline fixture: same class, same record count,
 * a different number of hits (3 of 10) -> the feedback must be 0.3, not 0.7.
 */
const LIKELY_LOW_ASSUMPTIONS: LoggedAssumption[] = likelyAssumptions("as-likely-low");

const LIKELY_LOW_VERDICTS: Record<string, SettlementVerdict> = Object.fromEntries(
  LIKELY_LOW_ASSUMPTIONS.map((a, i) => [a.id, i < 3 ? "hit" : "miss"]),
);

const MIXED_ASSUMPTIONS: LoggedAssumption[] = [
  ...LIKELY_ASSUMPTIONS,
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `as-guess-${i + 1}`,
    statement: `guessed assumption ${i + 1}`,
    confidence: "guess" as const,
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `as-unsure-${i + 1}`,
    statement: `unsure assumption ${i + 1}`,
    confidence: "unsure" as const,
  })),
];

// guess: 1 hit of 4 -> 0.25; unsure: 2 hits of 2 -> 1.
const MIXED_VERDICTS: Record<string, SettlementVerdict> = {
  ...LIKELY_VERDICTS,
  "as-guess-1": "hit",
  "as-guess-2": "miss",
  "as-guess-3": "miss",
  "as-guess-4": "miss",
  "as-unsure-1": "hit",
  "as-unsure-2": "hit",
};

/** A class settled entirely as misses: rate 0, which is a value, not absence. */
const ALL_MISS_ASSUMPTIONS: LoggedAssumption[] = Array.from({ length: 4 }, (_, i) => ({
  id: `as-allmiss-${i + 1}`,
  statement: `guessed assumption ${i + 1} that never held`,
  confidence: "guess" as const,
}));

const ALL_MISS_VERDICTS: Record<string, SettlementVerdict> = Object.fromEntries(
  ALL_MISS_ASSUMPTIONS.map((a) => [a.id, "miss" as SettlementVerdict]),
);

function presentClasses(input: VoiThresholdInput): string[] {
  const rates = input as Record<string, number | undefined>;
  return Object.keys(rates)
    .filter((key) => rates[key] !== undefined)
    .sort();
}

// --- fixtures: synthetic-user transcript pair (skill change simulation) -------

const GROUND_TRUTH_FACTS = ["fact-1", "fact-2", "fact-3", "fact-4", "fact-5"];

// Before the skill change: 4 of 5 ground-truth facts elicited -> recall 0.8.
// This is the reference run the baseline artifact records.
const BEFORE_TRANSCRIPT: SyntheticTranscript = {
  skill_version: "skill-v1",
  ground_truth_fact_ids: GROUND_TRUTH_FACTS,
  elicited_fact_ids: ["fact-1", "fact-2", "fact-3", "fact-4"],
};

// After the skill change: 2 of 5 elicited -> recall 0.4 (a real shift).
const AFTER_TRANSCRIPT: SyntheticTranscript = {
  skill_version: "skill-v2",
  ground_truth_fact_ids: GROUND_TRUTH_FACTS,
  elicited_fact_ids: ["fact-1", "fact-2"],
};

// ==============================================================================
// (1) Spec document rescan — doc→file evidence embedded in the test
// ==============================================================================

describe("ac-40 (1) c4-spec.md rescan at the fixed path", () => {
  test("spec document exists at src/interview/calibration/c4-spec.md and is non-empty", () => {
    expect(existsSync(SPEC_PATH)).toBe(true);
    const spec = readFileSync(SPEC_PATH, "utf8");
    expect(spec.trim().length).toBeGreaterThan(0);
  });

  test("goal (a) section: 3-value confidence enum on logged assumptions", () => {
    const spec = readFileSync(SPEC_PATH, "utf8");
    const section = findSection(spec, /confidence|신뢰도/i);
    expect(section.heading.length).toBeGreaterThan(0);
    expect(section.body.trim().length).toBeGreaterThan(0);
    expect(section.body).toContain("likely");
    expect(section.body).toContain("unsure");
    expect(section.body).toContain("guess");
  });

  test("goal (a) section: retro settlement stage with hit/miss settlement", () => {
    const spec = readFileSync(SPEC_PATH, "utf8");
    const section = findSection(spec, /정산|settlement/i);
    expect(section.heading.length).toBeGreaterThan(0);
    expect(section.body.trim().length).toBeGreaterThan(0);
    expect(section.body).toMatch(/적중|hit/i);
    expect(section.body).toMatch(/불발|miss/i);
  });

  test("goal (a) section: Brier-based VoI threshold feedback", () => {
    const spec = readFileSync(SPEC_PATH, "utf8");
    const section = findSection(spec, /voi|되먹임/i);
    expect(section.heading.length).toBeGreaterThan(0);
    expect(section.body.trim().length).toBeGreaterThan(0);
    expect(section.body).toMatch(/brier/i);
    expect(section.body).toMatch(/임계|threshold/i);
  });

  test("goal (b) section: synthetic-user regression of interview skill changes", () => {
    const spec = readFileSync(SPEC_PATH, "utf8");
    const section = findSection(spec, /합성|synthetic/i);
    expect(section.heading.length).toBeGreaterThan(0);
    expect(section.body.trim().length).toBeGreaterThan(0);
    expect(section.body).toMatch(/회귀|regression/i);
    expect(section.body).toMatch(/스킬|skill/i);
  });

  test("goal (b) section: issue #72 harness reuse decision — plugin, not a new harness", () => {
    const spec = readFileSync(SPEC_PATH, "utf8");
    const section = findSection(spec, /72/);
    expect(section.heading.length).toBeGreaterThan(0);
    expect(section.body.trim().length).toBeGreaterThan(0);
    expect(section.body).toMatch(/플러그인|plugin/i);
    expect(section.body).toMatch(/재사용|reuse/i);
  });
});

// ==============================================================================
// (2) Completion criterion (a) — confidence enum → settlement → VoI feedback
// ==============================================================================

describe("ac-40 (2a) interviewAssumption.confidence 3-value enum", () => {
  test("CONFIDENCE_VALUES is exactly the frozen set likely/unsure/guess", () => {
    expect([...CONFIDENCE_VALUES]).toEqual(["likely", "unsure", "guess"]);
    expect(CONFIDENCE_VALUES.length).toBe(3);
  });

  test("parses each of the three values and preserves them verbatim", () => {
    for (const value of ["likely", "unsure", "guess"] as const) {
      const parsed = interviewAssumptionSchema.parse({
        id: `as-${value}`,
        statement: "the user wants nightly log rotation",
        confidence: value,
      });
      expect(parsed.confidence).toBe(value);
    }
  });

  test("rejects any value outside the enum at parse time", () => {
    for (const bad of ["certain", "high", "LIKELY", "maybe", ""]) {
      const result = interviewAssumptionSchema.safeParse({
        id: "as-bad",
        statement: "an assumption with an out-of-enum confidence",
        confidence: bad,
      });
      expect(result.success).toBe(false);
    }
  });

  test("rejects a logged assumption missing confidence (fail-closed)", () => {
    const result = interviewAssumptionSchema.safeParse({
      id: "as-missing",
      statement: "an assumption logged without any confidence",
    });
    expect(result.success).toBe(false);
  });
});

describe("ac-40 (2b) retro settlement stage leaves hit/miss records", () => {
  test("one settlement record per logged assumption, outcome matching the verdict", () => {
    const records: SettlementRecord[] = settleAssumptions(LIKELY_ASSUMPTIONS, LIKELY_VERDICTS);
    expect(records).toHaveLength(10);
    for (const assumption of LIKELY_ASSUMPTIONS) {
      const record = records.find((r) => r.assumption_id === assumption.id);
      expect(record?.outcome).toBe(LIKELY_VERDICTS[assumption.id] as SettlementVerdict);
      expect(record?.confidence).toBe("likely");
    }
    expect(records.filter((r) => r.outcome === "hit")).toHaveLength(7);
    expect(records.filter((r) => r.outcome === "miss")).toHaveLength(3);
  });

  test("refuses settlement fail-closed when a logged assumption has no verdict", () => {
    const incomplete: Record<string, SettlementVerdict> = Object.fromEntries(
      Object.entries(LIKELY_VERDICTS).filter(([id]) => id !== "as-likely-10"),
    );
    expect(() => settleAssumptions(LIKELY_ASSUMPTIONS, incomplete)).toThrow();
  });
});

describe("ac-40 (2c) VoI threshold feedback — likely 70% settled → 0.7", () => {
  test("10 likely assumptions settled as 7 hits feed 0.7 back as the VoI threshold input", () => {
    const records = settleAssumptions(LIKELY_ASSUMPTIONS, LIKELY_VERDICTS);
    const input: VoiThresholdInput = computeVoiThresholdInput(records);
    expect(input.likely).toBe(0.7);
    // Classes with no settlement record get no invented rate (fail-closed).
    expect(input.guess).toBeUndefined();
    expect(input.unsure).toBeUndefined();
    expect(presentClasses(input)).toEqual(["likely"]);
  });

  test("the same class settled as 3 of 10 hits feeds 0.3 back, not 0.7", () => {
    const records = settleAssumptions(LIKELY_LOW_ASSUMPTIONS, LIKELY_LOW_VERDICTS);
    const input: VoiThresholdInput = computeVoiThresholdInput(records);
    expect(input.likely).toBe(0.3);
    expect(presentClasses(input)).toEqual(["likely"]);
  });

  test("a class settled entirely as misses feeds back 0 — a value, not absence", () => {
    const records = settleAssumptions(ALL_MISS_ASSUMPTIONS, ALL_MISS_VERDICTS);
    const input: VoiThresholdInput = computeVoiThresholdInput(records);
    expect(input.guess).toBe(0);
    expect(presentClasses(input)).toEqual(["guess"]);
  });

  test("hit rates are computed per confidence class without cross-contamination", () => {
    const records = settleAssumptions(MIXED_ASSUMPTIONS, MIXED_VERDICTS);
    const input: VoiThresholdInput = computeVoiThresholdInput(records);
    expect(input.likely).toBe(0.7);
    expect(input.guess).toBe(0.25);
    expect(input.unsure).toBe(1);
    expect(presentClasses(input)).toEqual(["guess", "likely", "unsure"]);
  });
});

// ==============================================================================
// (3) Completion criterion (b) — #72 plugin seam, baseline, recall shift
// ==============================================================================

describe("ac-40 (3a) issue #72 plugin seam — plugin, not a new harness", () => {
  test("plugin declares the issue-72 efficacy harness as its host", () => {
    expect(interviewSkillRegressionPlugin.host_harness).toBe("issue-72-efficacy");
    expect(typeof interviewSkillRegressionPlugin.plugin_id).toBe("string");
    expect(interviewSkillRegressionPlugin.plugin_id.length).toBeGreaterThan(0);
  });

  test("registers itself through the host registry seam, exactly once", () => {
    const registered: unknown[] = [];
    const fakeHostRegistry = {
      register: (plugin: unknown) => {
        registered.push(plugin);
      },
    };
    registerInterviewSkillRegressionPlugin(fakeHostRegistry);
    expect(registered).toHaveLength(1);
    expect(registered[0]).toBe(interviewSkillRegressionPlugin);
  });

  test("no standalone harness runner exists anywhere in the repo (recursive)", () => {
    const repoTsFiles = collectTsFiles(REPO_ROOT).filter(
      (file) => !file.startsWith(`${ACCEPTANCE_DIR}/`),
    );
    const harnessFiles = repoTsFiles.filter(
      (file) => file.includes("/harness/") || /harness/i.test(basename(file)),
    );
    // The plugin modules themselves must exist...
    expect(harnessFiles.length).toBeGreaterThan(0);
    for (const file of harnessFiles) {
      // ...and all harness code lives inside the plugin module directory:
      // a sibling src/harness/runner.ts is a new harness, which is banned.
      expect(file.startsWith(`${SYNTHETIC_USER_DIR}/`)).toBe(true);
      // No runner-shaped file or directory on the path (subdirs included).
      for (const segment of relative(REPO_ROOT, file).split("/")) {
        expect(segment).not.toMatch(/^(cli|bin|runner|server|daemon|standalone|main)(\.ts)?$/i);
      }
      expect(basename(file)).not.toMatch(/runner|standalone|daemon/i);
      // No executable entry point of its own.
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("import.meta.main");
      expect(source).not.toContain("#!/usr/bin/env");
      expect(source).not.toContain("process.argv");
      expect(source).not.toMatch(/from\s+["']citty["']/);
    }
    for (const mod of [pluginModule, baselineModule, recallModule]) {
      const exportNames = Object.keys(mod);
      for (const banned of ["main", "runHarness", "createHarnessRunner", "harnessMain", "cli"]) {
        expect(exportNames).not.toContain(banned);
      }
    }
  });
});

describe("ac-40 (3b) regression baseline artifact at a fixed path", () => {
  test("baseline artifact exists at the exported fixed path and carries a recall value", () => {
    expect(typeof RECALL_BASELINE_PATH).toBe("string");
    expect(RECALL_BASELINE_PATH.length).toBeGreaterThan(0);
    const baselinePath = isAbsolute(RECALL_BASELINE_PATH)
      ? RECALL_BASELINE_PATH
      : resolve(REPO_ROOT, RECALL_BASELINE_PATH);
    expect(existsSync(baselinePath)).toBe(true);
    const baseline = loadRecallBaseline();
    expect(Number.isFinite(baseline.recall)).toBe(true);
    expect(baseline.recall).toBeGreaterThanOrEqual(0);
    expect(baseline.recall).toBeLessThanOrEqual(1);
    const raw = JSON.parse(readFileSync(baselinePath, "utf8")) as { recall: number };
    expect(raw.recall).toBe(baseline.recall);
  });

  test("the baseline value is the reference recall of the unchanged skill, not an arbitrary number", () => {
    const baseline = loadRecallBaseline();
    expect(baseline.recall).toBe(computeRecall(BEFORE_TRANSCRIPT));
  });
});

describe("ac-40 (3c) interview skill change moves the recall metric vs baseline", () => {
  test("computes deterministic recall for the before/after transcript pair", () => {
    expect(computeRecall(BEFORE_TRANSCRIPT)).toBe(0.8);
    expect(computeRecall(AFTER_TRANSCRIPT)).toBe(0.4);
  });

  test("does not count hallucinated or duplicate elicited facts", () => {
    const hallucinated: SyntheticTranscript = {
      ...AFTER_TRANSCRIPT,
      elicited_fact_ids: [...AFTER_TRANSCRIPT.elicited_fact_ids, "fact-99"],
    };
    expect(computeRecall(hallucinated)).toBe(0.4);
    const duplicated: SyntheticTranscript = {
      skill_version: "skill-v2",
      ground_truth_fact_ids: GROUND_TRUTH_FACTS,
      elicited_fact_ids: ["fact-1", "fact-1"],
    };
    expect(computeRecall(duplicated)).toBe(0.2);
  });

  test("detects the shift against the loaded baseline and stays silent when unchanged", () => {
    const baselineRecall = loadRecallBaseline().recall;
    const steady = detectRecallShift(baselineRecall, computeRecall(BEFORE_TRANSCRIPT));
    expect(steady.shifted).toBe(false);
    expect(steady.delta).toBe(0);
    const afterRecall = computeRecall(AFTER_TRANSCRIPT);
    const moved = detectRecallShift(baselineRecall, afterRecall);
    expect(moved.shifted).toBe(true);
    expect(moved.delta).toBeCloseTo(afterRecall - baselineRecall, 10);
    expect(moved.delta).toBeCloseTo(-0.4, 10);
  });

  test("plugin hook defaults to the baseline artifact and honours an explicit baseline", () => {
    const baselineRecall = loadRecallBaseline().recall;
    // Baseline omitted: the hook must read the baseline artifact itself.
    const defaulted = interviewSkillRegressionPlugin.hooks.runRegression({
      transcript: AFTER_TRANSCRIPT,
    });
    expect(defaulted.baseline_recall).toBe(baselineRecall);
    expect(defaulted.recall).toBe(0.4);
    expect(defaulted.shifted).toBe(true);
    expect(defaulted.delta).toBeCloseTo(0.4 - baselineRecall, 10);
    // Unchanged skill against the same loaded baseline: no false detection.
    const steady = interviewSkillRegressionPlugin.hooks.runRegression({
      transcript: BEFORE_TRANSCRIPT,
    });
    expect(steady.baseline_recall).toBe(baselineRecall);
    expect(steady.recall).toBe(0.8);
    expect(steady.shifted).toBe(false);
    // An explicit baseline overrides the artifact: same transcript, no shift.
    const explicit = interviewSkillRegressionPlugin.hooks.runRegression({
      baseline_recall: 0.4,
      transcript: AFTER_TRANSCRIPT,
    });
    expect(explicit.baseline_recall).toBe(0.4);
    expect(explicit.recall).toBe(0.4);
    expect(explicit.shifted).toBe(false);
    expect(explicit.delta).toBe(0);
  });
});
