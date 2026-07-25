/**
 * ac-23 acceptance — reverse-direction (c) pain-case ledger: failure cases
 * (internal-English → surface-Korean rendering/translation pain) are captured
 * immediately in the turn they occur, land as real artifacts on the PRODUCT
 * glossary/regression-list paths (never on the personal memory path), every
 * regression entry read back from the written artifact drives a deterministic
 * grep regression check, and every captured case reaches the U9
 * assumption-ledger retro settlement (ac-19) through runRetroSettlement.
 * Frozen red: none of src/interview/pain-case/ledger.ts,
 * src/interview/pain-case/regression.ts, src/interview/glossary/landing.ts,
 * src/ledger/retro-settlement.ts exist yet; the piece-3 implementation must
 * turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-23.json), covered clauses:
 *  (1) immediate capture: a fixture turn tagged as a rendering/translation
 *      pain case yields a pain-case record inside that turn's processing
 *      result; the record carries the occurrence-turn pointer and the capture
 *      turn equals the occurrence turn (immediacy = occurrence turn ==
 *      capture turn, a checkable predicate); TWO distinct pain fixtures are
 *      processed so every record field is observed to follow its own input
 *      (no constant record); an untagged ordinary turn captures nothing
 *      (creation is tag-gated); a delayed-capture fixture is deterministically
 *      detected as a violation, including a single-entry log whose capture
 *      EXISTS but whose occurrence turn differs from its capture turn — so the
 *      equality predicate itself, not merely "capture missing", is exercised.
 *  (2) product landing: landing writes real files under a temp root; the
 *      written artifact set is read back with node:fs and must be exactly the
 *      product glossary + regression-list paths — the personal memory path
 *      file must NOT exist, and no other file may be written. Asserted on
 *      both the landing path constants and the written artifacts.
 *  (3) grep regression link: the regression entries READ BACK from the written
 *      regression-list artifact carry non-empty greppable patterns preserving
 *      each turn's offending surface phrase verbatim (turn → record → written
 *      entry chain, two fixtures with different phrases); a render output
 *      containing one pattern deterministically FAILS the check and points at
 *      exactly that case, and a render output containing neither PASSES.
 *  (4) U9 settlement link: the captured record carries a non-empty U9
 *      assumption-ledger settlement link, that link is an assumption id that
 *      resolves inside the ac-19 retro settlement — runRetroSettlement (the
 *      same entry point ac-19 fixes) over a ledger mixing an unrelated
 *      assumption with the pain-derived ones yields a target set containing
 *      both pain links and the unrelated assumption, while a turn that
 *      captured nothing contributes no settlement target.
 *
 * Residual (NOT tested here, per row residual):
 *  - Cause judgment — WHY a captured case failed (mistranslation, forced
 *    translation, vocabulary drift, ...) is declared residual by the
 *    contract itself; this criterion closes only the capture / landing /
 *    grep-regression / settlement wiring structure.
 *  - Failure-case detection in real conversation — whether a real turn IS a
 *    failure case is an LLM judgment; the fixtures fix the pain-case tag,
 *    and detection accuracy or completeness outside fixtures is not closed
 *    by this criterion.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PAIN_CASE_LANDING_PATHS,
  PERSONAL_MEMORY_PATH,
  PRODUCT_GLOSSARY_LANDING_PATH,
  PRODUCT_REGRESSION_LIST_LANDING_PATH,
  landPainCase,
} from "../src/interview/glossary/landing";
import { detectImmediacyViolations, processPainCaseTurn } from "../src/interview/pain-case/ledger";
import { grepRegressionCheck, readRegressionEntries } from "../src/interview/pain-case/regression";
import { runRetroSettlement, toSettlementAssumptions } from "../src/ledger/retro-settlement";

// Fixture-fixed conversation content: whether these turns really are failure
// cases is residual (LLM-judged); the fixture tag fixes it, and the test
// asserts only capture / landing / grep / settlement wiring structure.
// TWO pain fixtures with different turn ids AND different offending phrases,
// so that every record field can be checked against its own input.
const PAIN_FIXTURE_A = {
  turn_id: "t-pain-1",
  internal_utterance: "Does this backup plan make sense to you?",
  surface_render: "이 백업 계획이 당신에게 말이 되나요?",
  offending_phrase: "말이 되나요",
};
const PAIN_FIXTURE_B = {
  turn_id: "t-pain-7",
  internal_utterance: "Let me walk you through the tradeoff.",
  surface_render: "제가 그 트레이드오프를 통해 걸어가 보겠습니다.",
  offending_phrase: "통해 걸어가",
};

// Render-output fixtures for the deterministic grep check: one contains only
// A's pattern, one contains only B's pattern, one contains neither.
const RENDER_WITH_A = "일정을 다시 잡았습니다. 이 방식이 말이 되나요?";
const RENDER_WITH_B = "복구 절차를 통해 걸어가 보겠습니다.";
const RENDER_CLEAN = "일정을 다시 잡았습니다. 이 방식이 이해되시나요?";

// An ordinary ac-19-shaped assumption that has nothing to do with pain cases:
// the contrast member proving the settlement target set is not a pain-only
// echo of its own input.
const UNRELATED_ASSUMPTION = {
  assumption_id: "a-execution-1",
  origin: "execution",
  statement: "빌드 캐시가 최신 lockfile 기준으로 유효하다고 가정했다",
  confidence: "guess",
  logged_at: "2026-07-25T10:00:00.000Z",
};

type PainFixture = typeof PAIN_FIXTURE_A;

function makePainTurn(fixture: PainFixture) {
  return {
    turn_id: fixture.turn_id,
    pain_case_tag: "render-translation-pain" as const,
    internal_utterance: fixture.internal_utterance,
    surface_render: fixture.surface_render,
    offending_phrase: fixture.offending_phrase,
  };
}

function makeOrdinaryTurn(turn_id: string) {
  return {
    turn_id,
    pain_case_tag: "none" as const,
    internal_utterance: "I rescheduled the run.",
    surface_render: RENDER_CLEAN,
    offending_phrase: "",
  };
}

function captureRecord(fixture: PainFixture) {
  const record = processPainCaseTurn(makePainTurn(fixture)).pain_case_record;
  if (!record) throw new Error(`expected a pain-case record on pain turn ${fixture.turn_id}`);
  return record;
}

function freshRoot(): string {
  return mkdtempSync(join(tmpdir(), "ac23-"));
}

/** Every file actually written under the landing root, as "/"-joined paths. */
function listWrittenFiles(root: string, prefix = ""): string[] {
  const here = prefix ? join(root, prefix) : root;
  return readdirSync(here)
    .flatMap((name) => {
      const relative = prefix ? `${prefix}/${name}` : name;
      return statSync(join(root, relative)).isDirectory()
        ? listWrittenFiles(root, relative)
        : [relative];
    })
    .sort();
}

type PainCaseRecord = ReturnType<typeof captureRecord>;

/** Lands both pain fixtures into one fresh root and returns the root. */
function landBothFixtures(): { root: string; recordA: PainCaseRecord; recordB: PainCaseRecord } {
  const root = freshRoot();
  const recordA = captureRecord(PAIN_FIXTURE_A);
  const recordB = captureRecord(PAIN_FIXTURE_B);
  landPainCase(recordA, { root });
  landPainCase(recordB, { root });
  return { root, recordA, recordB };
}

describe("ac-23 clause 1 — immediate capture: occurrence turn == capture turn, delayed capture is a violation", () => {
  test("each pain-tagged fixture turn yields a record whose fields follow that turn's own input", () => {
    const recordA = captureRecord(PAIN_FIXTURE_A);
    const recordB = captureRecord(PAIN_FIXTURE_B);

    // Each record points at ITS OWN occurrence turn, and the capture turn is
    // the SAME turn — immediacy as a checkable predicate, inside the
    // processing result of the turn itself.
    expect(recordA.occurred_turn_id).toBe("t-pain-1");
    expect(recordA.captured_turn_id).toBe("t-pain-1");
    expect(recordB.occurred_turn_id).toBe("t-pain-7");
    expect(recordB.captured_turn_id).toBe("t-pain-7");

    // Two fixtures, two distinct records: no constant record can satisfy both.
    expect(recordA.case_id.length).toBeGreaterThan(0);
    expect(recordB.case_id.length).toBeGreaterThan(0);
    expect(recordA.case_id).not.toBe(recordB.case_id);
    expect(recordA.grep_pattern).toBe(PAIN_FIXTURE_A.offending_phrase);
    expect(recordB.grep_pattern).toBe(PAIN_FIXTURE_B.offending_phrase);
    expect(recordA.u9_settlement_link).not.toBe(recordB.u9_settlement_link);
  });

  test("an untagged ordinary turn captures no pain-case record (creation is tag-gated)", () => {
    expect(processPainCaseTurn(makeOrdinaryTurn("t-ordinary-1")).pain_case_record).toBeUndefined();
  });

  test("a same-turn capture log has zero immediacy violations", () => {
    const record = captureRecord(PAIN_FIXTURE_A);
    const violations = detectImmediacyViolations([
      {
        turn_id: "t-pain-1",
        pain_case_tag: "render-translation-pain" as const,
        capture: {
          occurred_turn_id: record.occurred_turn_id,
          captured_turn_id: record.captured_turn_id,
        },
      },
      { turn_id: "t-ordinary-1", pain_case_tag: "none" as const, capture: null },
    ]);

    expect(violations).toHaveLength(0);
  });

  test("a single entry whose capture EXISTS but whose occurrence turn != capture turn is a violation", () => {
    // The equality predicate itself is exercised here: the capture is present
    // and non-null, so a checker that only looks for a missing capture passes
    // this log wrongly.
    const violations = detectImmediacyViolations([
      {
        turn_id: "t-pain-9",
        pain_case_tag: "render-translation-pain" as const,
        capture: { occurred_turn_id: "t-pain-9", captured_turn_id: "t-late-9" },
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0].occurred_turn_id).toBe("t-pain-9");
    expect(violations[0].captured_turn_id).toBe("t-late-9");
  });

  test("a delayed-capture fixture (occurrence turn passes uncaptured, capture lands next turn) is deterministically detected", () => {
    const violations = detectImmediacyViolations([
      // The pain case occurs here, but the turn proceeds without a capture.
      { turn_id: "t-pain-2", pain_case_tag: "render-translation-pain" as const, capture: null },
      // The capture only lands one turn later — occurrence != capture turn.
      {
        turn_id: "t-next-1",
        pain_case_tag: "none" as const,
        capture: { occurred_turn_id: "t-pain-2", captured_turn_id: "t-next-1" },
      },
    ]);

    expect(violations.length).toBeGreaterThan(0);
    const violation = violations.find(
      (v: { occurred_turn_id: string }) => v.occurred_turn_id === "t-pain-2",
    );
    if (!violation) throw new Error("expected a violation pointing at the uncaptured pain turn");
    expect(violation.occurred_turn_id).toBe("t-pain-2");
    // Whatever the reporting shape (late turn id or no capture), the capture
    // turn must NOT be the occurrence turn — that mismatch is the violation.
    expect(violation.captured_turn_id).not.toBe("t-pain-2");
  });
});

describe("ac-23 clause 2 — product landing: glossary/regression-list artifacts written, personal memory never", () => {
  test("landing path constants are the product glossary/regression-list pair and exclude personal memory", () => {
    expect(PRODUCT_GLOSSARY_LANDING_PATH.length).toBeGreaterThan(0);
    expect(PRODUCT_REGRESSION_LIST_LANDING_PATH.length).toBeGreaterThan(0);
    expect(PERSONAL_MEMORY_PATH.length).toBeGreaterThan(0);
    expect(PRODUCT_GLOSSARY_LANDING_PATH).not.toBe(PRODUCT_REGRESSION_LIST_LANDING_PATH);
    expect(PERSONAL_MEMORY_PATH).not.toBe(PRODUCT_GLOSSARY_LANDING_PATH);
    expect(PERSONAL_MEMORY_PATH).not.toBe(PRODUCT_REGRESSION_LIST_LANDING_PATH);

    // The declared pain-case landing set is EXACTLY the product pair — the
    // personal memory path is not a member.
    expect([...PAIN_CASE_LANDING_PATHS].sort()).toEqual(
      [PRODUCT_GLOSSARY_LANDING_PATH, PRODUCT_REGRESSION_LIST_LANDING_PATH].sort(),
    );
    expect(PAIN_CASE_LANDING_PATHS).not.toContain(PERSONAL_MEMORY_PATH);
  });

  test("landing writes exactly the two product artifacts under the root — no personal memory file, no other file", () => {
    const { root } = landBothFixtures();

    // Observed on the filesystem, not on the implementation's self-report:
    // the complete set of written files is the declared product pair.
    expect(listWrittenFiles(root)).toEqual(
      [PRODUCT_GLOSSARY_LANDING_PATH, PRODUCT_REGRESSION_LIST_LANDING_PATH].sort(),
    );
    expect(existsSync(join(root, PRODUCT_GLOSSARY_LANDING_PATH))).toBe(true);
    expect(existsSync(join(root, PRODUCT_REGRESSION_LIST_LANDING_PATH))).toBe(true);
    expect(existsSync(join(root, PERSONAL_MEMORY_PATH))).toBe(false);
  });

  test("both written product artifacts carry both captured cases, each with its own phrase", () => {
    const { root, recordA, recordB } = landBothFixtures();
    const glossary = readFileSync(join(root, PRODUCT_GLOSSARY_LANDING_PATH), "utf8");
    const regressionList = readFileSync(join(root, PRODUCT_REGRESSION_LIST_LANDING_PATH), "utf8");

    for (const written of [glossary, regressionList]) {
      expect(written.length).toBeGreaterThan(0);
      expect(written).toContain(recordA.case_id);
      expect(written).toContain(recordB.case_id);
      // The offending surface phrases survive verbatim into the artifacts, so
      // the artifacts themselves are greppable.
      expect(written).toContain(PAIN_FIXTURE_A.offending_phrase);
      expect(written).toContain(PAIN_FIXTURE_B.offending_phrase);
    }
  });

  test("the returned landings name both product paths and carry the captured case", () => {
    const root = freshRoot();
    const record = captureRecord(PAIN_FIXTURE_A);
    const paths = landPainCase(record, { root }).landings.map((l: { path: string }) => l.path);

    expect([...paths].sort()).toEqual(
      [PRODUCT_GLOSSARY_LANDING_PATH, PRODUCT_REGRESSION_LIST_LANDING_PATH].sort(),
    );
    expect(paths).not.toContain(PERSONAL_MEMORY_PATH);

    const entries = readRegressionEntries(root);
    expect(entries).toHaveLength(1);
    expect(entries[0].case_id).toBe(record.case_id);
  });
});

describe("ac-23 clause 3 — grep regression link: patterns read back from the artifact, deterministic fail/pass", () => {
  test("every entry in the written regression list carries its own turn's phrase verbatim", () => {
    const { root, recordA, recordB } = landBothFixtures();
    const entries = readRegressionEntries(root);

    expect(entries).toHaveLength(2);
    const byCase = new Map(
      entries.map((e: { case_id: string; grep_pattern: string }) => [e.case_id, e.grep_pattern]),
    );
    for (const pattern of byCase.values()) {
      expect(typeof pattern).toBe("string");
      expect(pattern.length).toBeGreaterThan(0);
    }
    // Verbatim chain per fixture: turn → record → written regression entry.
    expect(byCase.get(recordA.case_id)).toBe(PAIN_FIXTURE_A.offending_phrase);
    expect(byCase.get(recordB.case_id)).toBe(PAIN_FIXTURE_B.offending_phrase);
    expect(byCase.get(recordA.case_id)).toBe(recordA.grep_pattern);
    expect(byCase.get(recordB.case_id)).toBe(recordB.grep_pattern);
  });

  test("a render output containing one pattern FAILS the check and points at exactly that case", () => {
    const { root, recordA, recordB } = landBothFixtures();
    const entries = readRegressionEntries(root);

    // Fixture sanity: this render output contains A's phrase and not B's.
    expect(RENDER_WITH_A).toContain(PAIN_FIXTURE_A.offending_phrase);
    expect(RENDER_WITH_A.includes(PAIN_FIXTURE_B.offending_phrase)).toBe(false);

    const result = grepRegressionCheck(entries, RENDER_WITH_A);
    expect(result.pass).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].case_id).toBe(recordA.case_id);
    expect(result.violations[0].pattern).toBe(PAIN_FIXTURE_A.offending_phrase);
    expect(result.violations.map((v: { case_id: string }) => v.case_id)).not.toContain(
      recordB.case_id,
    );
  });

  test("a render output containing the OTHER pattern points at the other case (per-entry grep)", () => {
    const { root, recordB } = landBothFixtures();
    const entries = readRegressionEntries(root);

    expect(RENDER_WITH_B).toContain(PAIN_FIXTURE_B.offending_phrase);
    expect(RENDER_WITH_B.includes(PAIN_FIXTURE_A.offending_phrase)).toBe(false);

    const result = grepRegressionCheck(entries, RENDER_WITH_B);
    expect(result.pass).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].case_id).toBe(recordB.case_id);
    expect(result.violations[0].pattern).toBe(PAIN_FIXTURE_B.offending_phrase);
  });

  test("a render output containing neither pattern PASSES the grep regression check", () => {
    const { root } = landBothFixtures();
    const entries = readRegressionEntries(root);

    // Fixture sanity: this render output contains neither pain pattern.
    expect(RENDER_CLEAN.includes(PAIN_FIXTURE_A.offending_phrase)).toBe(false);
    expect(RENDER_CLEAN.includes(PAIN_FIXTURE_B.offending_phrase)).toBe(false);

    const result = grepRegressionCheck(entries, RENDER_CLEAN);
    expect(result.pass).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe("ac-23 clause 4 — U9 settlement: the case reaches the ac-19 retro settlement target set", () => {
  test("the captured record carries a non-empty U9 assumption-ledger settlement link", () => {
    const recordA = captureRecord(PAIN_FIXTURE_A);
    const recordB = captureRecord(PAIN_FIXTURE_B);

    for (const record of [recordA, recordB]) {
      expect(typeof record.u9_settlement_link).toBe("string");
      expect(record.u9_settlement_link.length).toBeGreaterThan(0);
    }
    expect(recordA.u9_settlement_link).not.toBe(recordB.u9_settlement_link);
  });

  test("the settlement link resolves to a schema-valid U9 assumption carrying the case", () => {
    const recordA = captureRecord(PAIN_FIXTURE_A);
    const assumptions = toSettlementAssumptions([recordA]);

    expect(assumptions).toHaveLength(1);
    const assumption = assumptions[0];
    // The link is an assumption id in the U9 ledger, not an opaque string.
    expect(assumption.assumption_id).toBe(recordA.u9_settlement_link);
    // Same schema the U9 ledger (ac-19) requires of every logged assumption.
    expect(typeof assumption.origin).toBe("string");
    expect(assumption.origin.length).toBeGreaterThan(0);
    expect(typeof assumption.confidence).toBe("string");
    expect(assumption.confidence.length).toBeGreaterThan(0);
    expect(typeof assumption.statement).toBe("string");
    expect(assumption.statement).toContain(recordA.case_id);
  });

  test("runRetroSettlement includes both captured cases alongside an unrelated assumption", () => {
    const recordA = captureRecord(PAIN_FIXTURE_A);
    const recordB = captureRecord(PAIN_FIXTURE_B);
    const settlement = runRetroSettlement([
      UNRELATED_ASSUMPTION,
      ...toSettlementAssumptions([recordA, recordB]),
    ]);

    const targetIds = settlement.targets.map((t: { assumption_id: string }) => t.assumption_id);
    expect(targetIds).toContain(recordA.u9_settlement_link);
    expect(targetIds).toContain(recordB.u9_settlement_link);
    // Contrast member: the settlement is the real ac-19 one, not a pain-only
    // echo that returns what it was handed from the pain side.
    expect(targetIds).toContain("a-execution-1");
    expect(settlement.targets).toHaveLength(3);
    expect(settlement.correlation_blind_spot).toContain("같은 모델 prior");
  });

  test("a turn that captured nothing contributes no settlement target", () => {
    const turns = [
      makePainTurn(PAIN_FIXTURE_A),
      makeOrdinaryTurn("t-ordinary-1"),
      makePainTurn(PAIN_FIXTURE_B),
    ];
    const records = turns
      .map((turn) => processPainCaseTurn(turn).pain_case_record)
      .filter((record): record is PainCaseRecord => record !== undefined);

    // The tag-gated turn produced no record, so nothing about it can reach
    // the U9 ledger.
    expect(records).toHaveLength(2);

    const settlement = runRetroSettlement([
      UNRELATED_ASSUMPTION,
      ...toSettlementAssumptions(records),
    ]);
    expect(settlement.targets).toHaveLength(3);

    const serialized = JSON.stringify(settlement.targets);
    expect(serialized).toContain(records[0].case_id);
    expect(serialized).toContain(records[1].case_id);
    expect(serialized.includes("t-ordinary-1")).toBe(false);
  });
});
