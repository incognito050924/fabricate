import { describe, expect, test } from "bun:test";
/**
 * Acceptance test for ac-33 — C6 prediction probe (DESIGN node).
 *
 * The criterion's goal: for k counterfactuals the agent predicts the user's
 * answer BEFORE asking, and the hit rate becomes a lock gate that a bare
 * "네" (contentless affirmation) cannot pass. ac-33 is a DESIGN node, so the
 * judged object is not the running gate but the existence and deterministic
 * shape of the four declared design deliverables.
 *
 * Frozen red: the modules under src/interview/prediction-probe/ and the
 * design documents under design/ do not exist yet. Slice 3 must produce them
 * so this file turns green; these assertions are the completion definition
 * of ac-33.
 *
 * Oracle clauses covered (gate-a/rows/ac-33.json oracle_statement):
 *  (1) schema — src/interview/prediction-probe/probe-record.ts exports a zod
 *      strict schema requiring exactly {counterfactual, predicted, actual,
 *      hit}: the three text fields non-empty, hit a real boolean; missing
 *      field, extra field and empty-value fixtures are rejected on parse.
 *  (2) "prediction-first / bare-yes cannot pass" gate spec — the spec doc at
 *      the plan-fixed path design/c6-prediction-probe.md is rescanned to
 *      assert both rules are declared as deterministic rule clauses
 *      (prediction-first: predicted recorded before the question is
 *      presented, post-hoc prediction invalid; bare-yes: an actual tagged as
 *      a bare '네' contentless affirmation alone earns no hit and cannot
 *      pass the lock gate), plus field-name reconciliation. The gate
 *      contract module (gate-contract.ts) declares the same two rules with a
 *      TYPED signature — input probe_records: ProbeRecord[] / risk_grade:
 *      RiskGrade, output lock_passed: boolean / reasons: string[] — each rule
 *      carrying the probe fields it reads and the Korean refusal reason it
 *      emits, and those reasons must appear verbatim in the spec doc. The
 *      module contains no implementation: a DEEP walk of the whole export
 *      namespace (nested objects/arrays included) must find no callable, so
 *      an implementation hidden as an object method is rejected too.
 *  (3) k / risk-grade policy — policy.ts exports a frozen constant mapping
 *      EVERY grade of the risk-grade enum to k (integer >= 1) and a hit-rate
 *      lock threshold, with full-coverage assertion AND real risk scaling:
 *      grades are ordered low..high, k and the threshold are monotonically
 *      non-decreasing along that order, the highest grade demands strictly
 *      more counterfactuals (k > 1) and a strictly higher threshold than the
 *      lowest, and every threshold is >= 0.5 so the lock cannot be opened by
 *      a coin-flip predictor. Doc-code drift is blocked by a HEADER-INDEXED
 *      spec-table comparison: the grade row is the row whose risk_grade cell
 *      equals the grade, and its k / hit_rate_lock_threshold cells must equal
 *      the code constants exactly (one row per grade, no strays).
 *  (4) red test artifact — the future-gate red test file
 *      src/interview/prediction-probe/prediction-gate.redtest.ts (named
 *      outside the default *.test.ts glob so it never pollutes the green
 *      suite) must actually judge the C6 gate: it imports the probe-record,
 *      gate-contract and policy modules, names both rule ids, exercises a
 *      bare '네' fixture, references the hit-rate lock threshold and the
 *      contract's lock_passed/reasons output, and holds several real test
 *      cases. Red is not self-reported: this file SPAWNS `bun test` on the
 *      red test and asserts the live run reports failures with a non-zero
 *      exit code, and that design/c6-prediction-probe.red-run.json records
 *      exactly that observed exit code plus a frozen sha256 equal to the
 *      current red test content (gate-4 red-first predicates: red observed,
 *      hash unchanged).
 *
 * Residual clauses NOT tested here (per gate-a/rows/ac-33.json residual):
 *  - Correlation blind spot (shared with B5/C4): counterfactual generation,
 *    pre-prediction and hit judgment all sit on the same model prior; a
 *    same-direction misreading yields a high hit rate that opens the gate.
 *    The probe is mitigation, not removal — not closable by this oracle.
 *  - DESIGN-node limit: the ACTUAL gate behaviour (k counterfactuals,
 *    predict-then-ask, hit rate really blocking the lock, bare "네" really
 *    failing) is closed only when the produced prediction-gate.redtest.ts
 *    turns green under the future implementation, not by this file. This
 *    file only fixes what that red test must bind to and that it is red now.
 *  - Bare-yes classification, counterfactual quality and prediction
 *    seriousness are LLM/human judgments; the machine only checks declared
 *    routing rules over tags and spec clause existence.
 *  - Spec prose quality is a human judgment and is not graded here.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as gateContractSurface from "../src/interview/prediction-probe/gate-contract";
import { PREDICTION_PROBE_POLICY, RISK_GRADES } from "../src/interview/prediction-probe/policy";
import { probeRecordSchema } from "../src/interview/prediction-probe/probe-record";

const { PREDICTION_GATE_CONTRACT } = gateContractSurface;

const REPO_ROOT = join(import.meta.dir, "..");
const RED_TEST_RELATIVE = "./src/interview/prediction-probe/prediction-gate.redtest.ts";
const SPEC_PATH = join(REPO_ROOT, "design", "c6-prediction-probe.md");
const RED_RUN_PATH = join(REPO_ROOT, "design", "c6-prediction-probe.red-run.json");
const RED_TEST_PATH = join(
  REPO_ROOT,
  "src",
  "interview",
  "prediction-probe",
  "prediction-gate.redtest.ts",
);

const readSpec = (): string => readFileSync(SPEC_PATH, "utf8");
const readRedTest = (): string => readFileSync(RED_TEST_PATH, "utf8");
const readRedRun = (): Record<string, unknown> =>
  JSON.parse(readFileSync(RED_RUN_PATH, "utf8")) as Record<string, unknown>;

/** Same digest as gate-4 red-first: sha256 hex over utf8 content. */
const sha256Hex = (content: string): string =>
  createHash("sha256").update(content, "utf8").digest("hex");

const PROBE_FIELDS = ["counterfactual", "predicted", "actual", "hit"] as const;
const TEXT_FIELDS = ["counterfactual", "predicted", "actual"] as const;
const RULE_IDS = ["bare-yes-cannot-pass", "prediction-first"] as const;

const validProbeRecord = {
  counterfactual: "보관 기준을 90일이 아니라 30일로 잡았다면 산출물이 어떻게 달라지는가",
  predicted: "사용자는 30일이면 감사 로그 요건을 지킬 수 없다고 답할 것이다",
  actual: "30일은 감사 요건 때문에 불가능하고 90일이 맞다는 답",
  hit: true,
};

const withoutField = (field: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(validProbeRecord).filter(([key]) => key !== field));

interface PolicyEntry {
  k: number;
  hit_rate_lock_threshold: number;
}

const grades = (): string[] => [...(RISK_GRADES as readonly string[])];
const policyOf = (grade: string): PolicyEntry =>
  (PREDICTION_PROBE_POLICY as Record<string, PolicyEntry>)[grade];

interface ContractRule {
  id: string;
  probe_fields: readonly string[];
  reason: string;
}

const ruleOf = (id: string): ContractRule =>
  (PREDICTION_GATE_CONTRACT as { rules: Record<string, ContractRule> }).rules[id];

/** Every callable reachable from the export namespace, at any nesting depth. */
const reachableCallables = (root: unknown): string[] => {
  const found: string[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown, path: string, depth: number): void => {
    if (depth > 6 || value === null || seen.has(value)) return;
    if (typeof value === "function") {
      found.push(path);
      return;
    }
    if (typeof value !== "object") return;
    seen.add(value);
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      walk(child, `${path}.${key}`, depth + 1);
    }
  };
  walk(root, "module", 0);
  return found;
};

/** Markdown pipe-table rows of the spec, as trimmed cell arrays. */
const specTableRows = (): string[][] =>
  readSpec()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|") && line.length > 1)
    .map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );

const isSeparatorRow = (cells: string[]): boolean =>
  cells.every((cell) => /^:?-{2,}:?$/.test(cell));

const countMatches = (content: string, pattern: RegExp): number =>
  [...content.matchAll(pattern)].length;

interface LiveRun {
  exitCode: number;
  output: string;
}

/**
 * Run the produced red test for real. Red must be observed, not declared:
 * the recorded exit code is cross-checked against this live run.
 */
const runRedTestLive = (): LiveRun => {
  const proc = Bun.spawnSync(["bun", "test", RED_TEST_RELATIVE], { cwd: REPO_ROOT });
  const decoder = new TextDecoder();
  return {
    exitCode: proc.exitCode,
    output: `${decoder.decode(proc.stdout)}\n${decoder.decode(proc.stderr)}`,
  };
};

describe("ac-33 clause 1 — probe record schema requires exactly {counterfactual, predicted, actual, hit}", () => {
  test("a fully populated record parses and round-trips verbatim", () => {
    expect(probeRecordSchema.safeParse(validProbeRecord).success).toBe(true);
    expect(probeRecordSchema.parse(validProbeRecord)).toEqual(validProbeRecord);
  });

  test("the schema declares exactly the four contract fields — no more, no fewer", () => {
    expect(Object.keys(probeRecordSchema.shape).sort()).toEqual([
      "actual",
      "counterfactual",
      "hit",
      "predicted",
    ]);
  });

  test("omitting any one of the four fields is rejected on parse", () => {
    for (const field of PROBE_FIELDS) {
      expect(probeRecordSchema.safeParse(withoutField(field)).success).toBe(false);
    }
  });

  test("an extra field beyond the four is rejected (zod strict)", () => {
    const withExtra = { ...validProbeRecord, confidence: 0.9 };
    expect(probeRecordSchema.safeParse(withExtra).success).toBe(false);
  });

  test("empty or whitespace-only counterfactual/predicted/actual values are rejected", () => {
    for (const field of TEXT_FIELDS) {
      expect(probeRecordSchema.safeParse({ ...validProbeRecord, [field]: "" }).success).toBe(false);
      expect(probeRecordSchema.safeParse({ ...validProbeRecord, [field]: "   " }).success).toBe(
        false,
      );
    }
  });

  test("hit must be a real boolean — string/number stand-ins rejected, both booleans accepted", () => {
    expect(probeRecordSchema.safeParse({ ...validProbeRecord, hit: "true" }).success).toBe(false);
    expect(probeRecordSchema.safeParse({ ...validProbeRecord, hit: 1 }).success).toBe(false);
    expect(probeRecordSchema.safeParse({ ...validProbeRecord, hit: true }).success).toBe(true);
    expect(probeRecordSchema.safeParse({ ...validProbeRecord, hit: false }).success).toBe(true);
  });
});

describe("ac-33 clause 2 — spec doc declares the two gate rules as deterministic rule clauses", () => {
  test("rule 1 'prediction-first' is a declared rule clause — predicted exists before the question is presented, post-hoc prediction invalid", () => {
    const spec = readSpec();
    expect(/^#{1,6}[^\n]*선예측 먼저/m.test(spec)).toBe(true);
    expect(spec).toContain("질문 제시 이전");
    expect(spec).toContain("사후 예측 무효");
  });

  test("rule 2 'bare-yes cannot pass' is a declared rule clause — a bare '네' contentless affirmation alone cannot pass the lock gate", () => {
    const spec = readSpec();
    expect(/^#{1,6}[^\n]*bare-yes 불통/m.test(spec)).toBe(true);
    expect(/['‘“"「]네['’”"」]/.test(spec)).toBe(true);
    expect(spec).toContain("무내용 긍정");
    expect(spec).toContain("잠금 게이트");
    expect(spec).toContain("통과 불가");
  });

  test("the spec cross-references all four probe record field names (field-name reconciliation)", () => {
    const spec = readSpec();
    for (const field of PROBE_FIELDS) {
      expect(spec).toContain(field);
    }
  });
});

describe("ac-33 clause 2 — gate contract module declares the typed rule signature without implementing it", () => {
  test("the contract names exactly the two spec rules, each keyed by its own id", () => {
    const rules = (PREDICTION_GATE_CONTRACT as { rules: Record<string, ContractRule> }).rules;
    expect(Object.keys(rules).sort()).toEqual([...RULE_IDS]);
    for (const id of RULE_IDS) {
      expect(ruleOf(id).id).toBe(id);
      expect(Object.keys(ruleOf(id)).sort()).toEqual(["id", "probe_fields", "reason"]);
    }
  });

  test("each rule declares which probe fields it reads — prediction-first reads 'predicted', bare-yes reads 'actual'", () => {
    for (const id of RULE_IDS) {
      const fields = [...ruleOf(id).probe_fields];
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(PROBE_FIELDS as readonly string[]).toContain(field);
      }
    }
    expect([...ruleOf("prediction-first").probe_fields]).toContain("predicted");
    expect([...ruleOf("bare-yes-cannot-pass").probe_fields]).toContain("actual");
  });

  test("each rule carries the Korean refusal reason it emits, and the spec doc states it verbatim", () => {
    const spec = readSpec();
    const predictionFirstReason = ruleOf("prediction-first").reason;
    const bareYesReason = ruleOf("bare-yes-cannot-pass").reason;
    expect(predictionFirstReason).toContain("사후 예측");
    expect(predictionFirstReason).toContain("무효");
    expect(bareYesReason).toContain("무내용 긍정");
    expect(bareYesReason).toContain("통과 불가");
    expect(spec).toContain(predictionFirstReason);
    expect(spec).toContain(bareYesReason);
  });

  test("the signature is typed, not just named — input probe_records: ProbeRecord[] + risk_grade: RiskGrade, output lock_passed: boolean + reasons: string[]", () => {
    const contract = PREDICTION_GATE_CONTRACT as {
      input_fields: Record<string, string>;
      output_fields: Record<string, string>;
    };
    expect(contract.input_fields).toEqual({
      probe_records: "ProbeRecord[]",
      risk_grade: "RiskGrade",
    });
    expect(contract.output_fields).toEqual({
      lock_passed: "boolean",
      reasons: "string[]",
    });
  });

  test("the contract is a frozen declaration — contract, rule map and every rule", () => {
    const contract = PREDICTION_GATE_CONTRACT as {
      rules: Record<string, ContractRule>;
      input_fields: Record<string, string>;
      output_fields: Record<string, string>;
    };
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.rules)).toBe(true);
    expect(Object.isFrozen(contract.input_fields)).toBe(true);
    expect(Object.isFrozen(contract.output_fields)).toBe(true);
    for (const id of RULE_IDS) {
      expect(Object.isFrozen(ruleOf(id))).toBe(true);
    }
  });

  test("declaration only — NO callable anywhere in the export namespace, including object methods and nested values", () => {
    expect(reachableCallables(gateContractSurface)).toEqual([]);
  });
});

describe("ac-33 clause 3 — k / risk-grade policy covers every grade, scales with risk, and matches the spec table", () => {
  test("the risk-grade enum is a real ordered scale — unique non-empty grades running from 'low' to 'high'", () => {
    const all = grades();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(new Set(all).size).toBe(all.length);
    for (const grade of all) {
      expect(typeof grade).toBe("string");
      expect(grade.length).toBeGreaterThan(0);
    }
    expect(all[0]).toBe("low");
    expect(all[all.length - 1]).toBe("high");
  });

  test("every grade maps to k (integer >= 1) and a hit-rate lock threshold in [0.5, 1] — full coverage, no strays", () => {
    expect(Object.keys(PREDICTION_PROBE_POLICY).sort()).toEqual(grades().sort());
    for (const grade of grades()) {
      const entry = policyOf(grade);
      expect(Object.keys(entry).sort()).toEqual(["hit_rate_lock_threshold", "k"]);
      expect(Number.isInteger(entry.k)).toBe(true);
      expect(entry.k).toBeGreaterThanOrEqual(1);
      expect(typeof entry.hit_rate_lock_threshold).toBe("number");
      // A threshold below 0.5 is a lock a coin-flip predictor always opens.
      expect(entry.hit_rate_lock_threshold).toBeGreaterThanOrEqual(0.5);
      expect(entry.hit_rate_lock_threshold).toBeLessThanOrEqual(1);
    }
  });

  test("k and the lock threshold are monotonically non-decreasing along the risk order", () => {
    const all = grades();
    for (let i = 1; i < all.length; i += 1) {
      const previous = policyOf(all[i - 1]);
      const current = policyOf(all[i]);
      expect(current.k).toBeGreaterThanOrEqual(previous.k);
      expect(current.hit_rate_lock_threshold).toBeGreaterThanOrEqual(
        previous.hit_rate_lock_threshold,
      );
    }
  });

  test("risk actually changes the policy — 'high' demands more than one counterfactual and a strictly harder lock than 'low'", () => {
    const low = policyOf("low");
    const high = policyOf("high");
    expect(high.k).toBeGreaterThan(1);
    expect(high.k).toBeGreaterThan(low.k);
    expect(high.hit_rate_lock_threshold).toBeGreaterThan(low.hit_rate_lock_threshold);
  });

  test("the policy is a frozen constant — enum, map and every entry", () => {
    expect(Object.isFrozen(RISK_GRADES)).toBe(true);
    expect(Object.isFrozen(PREDICTION_PROBE_POLICY)).toBe(true);
    for (const grade of grades()) {
      expect(Object.isFrozen(policyOf(grade))).toBe(true);
    }
  });

  test("the spec policy table agrees with the code constants cell by cell, one row per grade (doc-code drift blocked)", () => {
    const rows = specTableRows().filter((cells) => !isSeparatorRow(cells));
    const header =
      rows.find(
        (cells) =>
          cells.includes("risk_grade") &&
          cells.includes("k") &&
          cells.includes("hit_rate_lock_threshold"),
      ) ?? [];
    expect(header).toContain("risk_grade");
    expect(header).toContain("k");
    expect(header).toContain("hit_rate_lock_threshold");

    const gradeColumn = header.indexOf("risk_grade");
    const kColumn = header.indexOf("k");
    const thresholdColumn = header.indexOf("hit_rate_lock_threshold");
    const dataRows = rows.filter(
      (cells) => cells !== header && cells.length === header.length && cells[gradeColumn] !== "",
    );
    const policyRows = dataRows.filter((cells) => grades().includes(cells[gradeColumn]));
    // Exactly one table row per grade — no stray rows, no grade documented twice.
    expect(policyRows.length).toBe(grades().length);

    for (const grade of grades()) {
      const matching = policyRows.filter((cells) => cells[gradeColumn] === grade);
      expect(matching.length).toBe(1);
      const entry = policyOf(grade);
      expect(matching[0][kColumn]).toBe(String(entry.k));
      expect(matching[0][thresholdColumn]).toBe(String(entry.hit_rate_lock_threshold));
    }
  });
});

describe("ac-33 clause 4 — the produced red test really judges the C6 gate, and its red state is observed live", () => {
  test("the red test binds to the C6 contract surface — imports probe-record, gate-contract and policy", () => {
    const content = readRedTest();
    expect(content.trim().length).toBeGreaterThan(0);
    expect(/from\s+["']bun:test["']/.test(content)).toBe(true);
    expect(/from\s+["']\.\/probe-record(?:\.ts)?["']/.test(content)).toBe(true);
    expect(/from\s+["']\.\/gate-contract(?:\.ts)?["']/.test(content)).toBe(true);
    expect(/from\s+["']\.\/policy(?:\.ts)?["']/.test(content)).toBe(true);
  });

  test("the red test names both gate rules and exercises a bare '네' fixture against the lock output", () => {
    const content = readRedTest();
    for (const id of RULE_IDS) {
      expect(content).toContain(id);
    }
    // The bare-yes counterexample must appear as an actual literal answer.
    expect(/['"`「]\s*네[\s.!?]*['"`」]/.test(content)).toBe(true);
    expect(content).toContain("lock_passed");
    expect(content).toContain("reasons");
    for (const field of PROBE_FIELDS) {
      expect(content).toContain(field);
    }
  });

  test("the red test exercises the k / hit-rate lock threshold policy, not just the schema", () => {
    const content = readRedTest();
    expect(content).toContain("hit_rate_lock_threshold");
    expect(content).toContain("PREDICTION_PROBE_POLICY");
    expect(content).toContain("risk_grade");
  });

  test("the red test holds several real judging cases, not a single 'not implemented' stub", () => {
    const content = readRedTest();
    expect(countMatches(content, /\b(?:test|it)\s*\(/g)).toBeGreaterThanOrEqual(3);
    expect(countMatches(content, /\bexpect\s*\(/g)).toBeGreaterThanOrEqual(6);
  });

  test("running the red test right now really fails — red is observed here, not self-reported", () => {
    const live = runRedTestLive();
    expect(live.exitCode).not.toBe(0);
    // Distinguish a genuine failing run from "no test file matched".
    expect(/\b[1-9]\d*\s+fail/.test(live.output)).toBe(true);
    expect(/had no matches|did not match any test files/.test(live.output)).toBe(false);
  }, 120_000);

  test("the red observation record reports exactly the exit code the live run produces", () => {
    const redRun = readRedRun();
    const live = runRedTestLive();
    expect(typeof redRun.observed_red_exit_code).toBe("number");
    expect(redRun.observed_red_exit_code).not.toBe(0);
    expect(redRun.observed_red_exit_code).toBe(live.exitCode);
  }, 120_000);

  test("the recorded frozen hash equals the sha256 of the current red test content — freeze intact", () => {
    const redRun = readRedRun();
    expect(typeof redRun.frozen_hash).toBe("string");
    expect(/^[0-9a-f]{64}$/.test(String(redRun.frozen_hash))).toBe(true);
    expect(redRun.frozen_hash).toBe(sha256Hex(readRedTest()));
    expect(redRun.red_test_path).toBe("src/interview/prediction-probe/prediction-gate.redtest.ts");
  });
});
