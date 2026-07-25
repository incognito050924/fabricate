/**
 * ac-10f acceptance — abduction residual table (procedure ⑩) (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10f.json), covered clauses:
 *  (1) table existence + structure — abduction_residual_table is a required
 *      field of the round-0 unified reading pass output (the same single pass
 *      as the ac-10 core); rows are observations, columns are candidate
 *      explanations, every cell verdict is restricted to the enum
 *      {설명함, 의아} and any other cell value is refused by zod parsing
 *      (negative fixtures); a row missing a declared candidate column is
 *      refused too, so the artifact must stay a rectangular table.
 *  (2) tie → emission — over a table whose cell values are fixed by fixture,
 *      a tie residual (two or more candidate explanations left tied) is
 *      detected deterministically (a deterministic computation over the enum
 *      cell values); when detected, at least one question candidate is emitted
 *      carrying a non-empty goal_predicate_ref, and each emitted candidate
 *      references the tie residual (observation × candidate-explanation
 *      targets) that caused its emission; a strictly-ranked table detects no
 *      tie and emits nothing.
 *  (3) ac-3 wiring — feeding the emitted question candidate into the ac-3
 *      orphan gate with a real recordFiredTurn call records it without
 *      tripping the orphan rejection (counter stays 0) because it carries
 *      goal_predicate_ref; the same question stripped of the ref is rejected
 *      as orphan (contrast proving the pass is due to the ref).
 *
 * Residual (NOT tested here, per the row's residual declaration):
 *  - Explanation-cell judgment content — which candidate explains which
 *    observation (설명함 vs 의아) is mechanically undecidable; cells are fixed
 *    by fixture and their content is never graded.
 *  - Completeness of the candidate-explanation set — whether every live
 *    explanation was enumerated is not closed by this criterion; only tie
 *    detection and emission over the given table are checked.
 *  - Whether the emitted candidate's goal_predicate_ref semantically reaches
 *    the right goal predicate — inherited from ac-3's residual; only ref-token
 *    presence (verbatim) and gate routing are asserted.
 */
import { describe, expect, test } from "bun:test";
import { round0ReadingSchema } from "../src/interview/reading/round0-reading";
import {
  abductionResidualTableSchema,
  detectTieResiduals,
} from "../src/interview/round0/abduction-residual";
import { emitTieQuestionCandidates } from "../src/interview/round0/tie-question-emitter";
import { createTurnLog, recordFiredTurn } from "../src/interview/turn";

// ---------------------------------------------------------------------------
// Fixtures — request under reading: "설정 파일을 새 스키마로 대체해줘".
// Observations (rows) = content words + context facts; candidate explanations
// (columns) = competing readings. Cell values are FIXED here — the oracle
// declares the cell judgment residual, so only structure, enum enforcement,
// tie detection, emission wiring, and gate passage are asserted.
// ---------------------------------------------------------------------------

const GOAL_REF = "p-1";
const ASKED_AT = "2026-07-25T11:00:00.000Z";

const CANDIDATE_REPLACE_FILE = "구 설정 파일을 삭제하고 새 스키마 파일로 교체하려는 의도";
const CANDIDATE_REWRITE_CONTENT = "파일 경로는 유지한 채 내용만 새 스키마로 다시 쓰려는 의도";
const CANDIDATE_DOC_ONLY = "스키마 문서만 갱신하려는 의도";

const CANDIDATES = [CANDIDATE_REPLACE_FILE, CANDIDATE_REWRITE_CONTENT, CANDIDATE_DOC_ONLY];

const OBS_VERB = "요청이 완수동사 '대체하다'를 사용함";
const OBS_OBJECT = "요청 목적어가 '설정 파일'임";
const OBS_CONTEXT = "기존 설정 파일을 참조하는 코드가 여러 곳에 존재함";

type Cell = { candidate_explanation: string; verdict: string };
type Row = { observation: string; cells: Cell[] };
type Table = { candidate_explanations: string[]; rows: Row[] };

const makeRow = (observation: string, verdicts: [string, string, string]): Row => ({
  observation,
  cells: CANDIDATES.map((candidate_explanation, index) => ({
    candidate_explanation,
    verdict: verdicts[index] ?? "의아",
  })),
});

/**
 * Tie fixture: the replace-file and rewrite-content candidates carry identical
 * verdict columns (tied under any deterministic reading of 동률), while the
 * doc-only candidate is strictly worse. The shared 의아 row (OBS_CONTEXT) is
 * the residual left tied.
 */
const makeTieTable = (): Table => ({
  candidate_explanations: [...CANDIDATES],
  rows: [
    makeRow(OBS_VERB, ["설명함", "설명함", "의아"]),
    makeRow(OBS_OBJECT, ["설명함", "설명함", "의아"]),
    makeRow(OBS_CONTEXT, ["의아", "의아", "의아"]),
  ],
});

/**
 * Strictly-ranked fixture: distinct explain-counts (3 > 1 > 0) and distinct
 * verdict patterns — no tie under any deterministic definition.
 */
const makeNoTieTable = (): Table => ({
  candidate_explanations: [...CANDIDATES],
  rows: [
    makeRow(OBS_VERB, ["설명함", "설명함", "의아"]),
    makeRow(OBS_OBJECT, ["설명함", "의아", "의아"]),
    makeRow(OBS_CONTEXT, ["설명함", "의아", "의아"]),
  ],
});

const tieKey = (tie: { observations: string[]; tied_candidates: string[] }): string =>
  JSON.stringify({
    observations: [...tie.observations].sort(),
    tied_candidates: [...tie.tied_candidates].sort(),
  });

describe("ac-10f clause 1 — abduction_residual_table structure: rows=observations, cols=candidate explanations", () => {
  test("a complete table parses and is preserved verbatim", () => {
    const table = makeTieTable();
    const result = abductionResidualTableSchema.safeParse(table);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.data).toEqual(table);
    expect(result.data.rows.map((row: Row) => row.observation)).toEqual([
      OBS_VERB,
      OBS_OBJECT,
      OBS_CONTEXT,
    ]);
  });

  test("both allowed cell verdicts 설명함 and 의아 are accepted across uniform tables", () => {
    for (const verdict of ["설명함", "의아"] as const) {
      const uniform: Table = {
        candidate_explanations: [...CANDIDATES],
        rows: [
          makeRow(OBS_VERB, [verdict, verdict, verdict]),
          makeRow(OBS_OBJECT, [verdict, verdict, verdict]),
          makeRow(OBS_CONTEXT, [verdict, verdict, verdict]),
        ],
      };
      expect(abductionResidualTableSchema.safeParse(uniform).success).toBe(true);
    }
  });

  test("any cell verdict outside the enum {설명함, 의아} is refused by zod, anchored at the verdict", () => {
    const table = makeTieTable();
    const firstCell = table.rows[0]?.cells[0];
    if (!firstCell) throw new Error("fixture invariant broken");
    firstCell.verdict = "모름";

    const result = abductionResidualTableSchema.safeParse(table);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues.some((issue) => issue.path.includes("verdict"))).toBe(true);
  });

  test("other out-of-enum cell values are refused too", () => {
    for (const bad of ["설명 함", "explains", "puzzled", ""]) {
      const table = makeTieTable();
      const cell = table.rows[1]?.cells[2];
      if (!cell) throw new Error("fixture invariant broken");
      cell.verdict = bad;
      expect(abductionResidualTableSchema.safeParse(table).success).toBe(false);
    }
  });

  test("a cell missing its verdict entirely is refused", () => {
    const table = makeTieTable();
    const row = table.rows[2];
    if (!row) throw new Error("fixture invariant broken");
    row.cells = [
      { candidate_explanation: CANDIDATE_REPLACE_FILE } as unknown as Cell,
      ...row.cells.slice(1),
    ];
    expect(abductionResidualTableSchema.safeParse(table).success).toBe(false);
  });

  test("a row missing a declared candidate-explanation column is refused (rectangular table)", () => {
    const table = makeTieTable();
    const row = table.rows[2];
    if (!row) throw new Error("fixture invariant broken");
    row.cells = row.cells.filter((cell) => cell.candidate_explanation !== CANDIDATE_DOC_ONLY);

    expect(abductionResidualTableSchema.safeParse(table).success).toBe(false);
  });
});

describe("ac-10f clause 1 — abduction_residual_table is a required field of the round-0 reading output", () => {
  test("an output without abduction_residual_table is refused with an issue at that field", () => {
    const result = round0ReadingSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues.some((issue) => issue.path[0] === "abduction_residual_table")).toBe(
      true,
    );
  });

  test("a well-formed table raises no issue at the abduction_residual_table field", () => {
    const result = round0ReadingSchema.safeParse({ abduction_residual_table: makeTieTable() });
    const tableIssues = result.success
      ? []
      : result.error.issues.filter((issue) => issue.path[0] === "abduction_residual_table");
    expect(tableIssues).toEqual([]);
  });

  test("a table with an out-of-enum cell is refused at the abduction_residual_table field", () => {
    const table = makeTieTable();
    const cell = table.rows[0]?.cells[0];
    if (!cell) throw new Error("fixture invariant broken");
    cell.verdict = "설명불가";

    const result = round0ReadingSchema.safeParse({ abduction_residual_table: table });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.error.issues.some((issue) => issue.path[0] === "abduction_residual_table")).toBe(
      true,
    );
  });
});

describe("ac-10f clause 2 — tie residuals are detected deterministically over the enum cell values", () => {
  test("detects the tie between the two candidates with identical verdict columns, excluding the strictly worse one", () => {
    const ties = detectTieResiduals(makeTieTable());

    expect(ties).toHaveLength(1);
    const tie = ties[0];
    if (!tie) throw new Error("unreachable");
    expect([...tie.tied_candidates].sort()).toEqual(
      [CANDIDATE_REPLACE_FILE, CANDIDATE_REWRITE_CONTENT].sort(),
    );
    expect(tie.tied_candidates).not.toContain(CANDIDATE_DOC_ONLY);
  });

  test("the tie targets actual residual cells: observations of the table left 의아 for a tied candidate", () => {
    const table = makeTieTable();
    const ties = detectTieResiduals(table);
    const tie = ties[0];
    if (!tie) throw new Error("unreachable");

    expect(tie.observations.length).toBeGreaterThan(0);
    const observationLabels = table.rows.map((row) => row.observation);
    for (const target of tie.observations) {
      expect(observationLabels).toContain(target);
      const row = table.rows.find((r) => r.observation === target);
      if (!row) throw new Error("unreachable");
      const puzzlesATiedCandidate = row.cells.some(
        (cell) =>
          tie.tied_candidates.includes(cell.candidate_explanation) && cell.verdict === "의아",
      );
      expect(puzzlesATiedCandidate).toBe(true);
    }
  });

  test("detection is deterministic: the same fixed cells yield identical ties on every run", () => {
    expect(detectTieResiduals(makeTieTable())).toEqual(detectTieResiduals(makeTieTable()));
  });

  test("a strictly-ranked table yields no tie residuals", () => {
    expect(detectTieResiduals(makeNoTieTable())).toEqual([]);
  });
});

describe("ac-10f clause 2 — a detected tie emits question candidates carrying goal_predicate_ref", () => {
  test("at least one candidate is emitted; each carries a non-empty question and the goal_predicate_ref verbatim", () => {
    const candidates = emitTieQuestionCandidates({
      table: makeTieTable(),
      goal_predicate_ref: GOAL_REF,
    });

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    for (const candidate of candidates) {
      expect(typeof candidate.question_text).toBe("string");
      expect(candidate.question_text.length).toBeGreaterThan(0);
      expect(candidate.goal_predicate_ref).toBe(GOAL_REF);
    }
  });

  test("each emitted candidate references the tie residual (observation × candidate targets) that caused it", () => {
    const table = makeTieTable();
    const detectedKeys = detectTieResiduals(table).map(tieKey);
    const candidates = emitTieQuestionCandidates({ table, goal_predicate_ref: GOAL_REF });

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    for (const candidate of candidates) {
      expect(detectedKeys).toContain(tieKey(candidate.tie));
      expect([...candidate.tie.tied_candidates].sort()).toEqual(
        [CANDIDATE_REPLACE_FILE, CANDIDATE_REWRITE_CONTENT].sort(),
      );
    }
  });

  test("a table without ties emits no question candidates", () => {
    expect(
      emitTieQuestionCandidates({ table: makeNoTieTable(), goal_predicate_ref: GOAL_REF }),
    ).toEqual([]);
  });
});

describe("ac-10f clause 3 — the emitted candidate passes the ac-3 orphan gate (real call)", () => {
  test("recordFiredTurn records the emitted candidate: no orphan rejection, counter stays 0, text and ref preserved verbatim", () => {
    const candidates = emitTieQuestionCandidates({
      table: makeTieTable(),
      goal_predicate_ref: GOAL_REF,
    });
    const emitted = candidates[0];
    if (!emitted) throw new Error("unreachable — clause 2 requires at least one candidate");

    const outcome = recordFiredTurn(createTurnLog(), {
      question_text: emitted.question_text,
      asked_at: ASKED_AT,
      goal_predicate_ref: emitted.goal_predicate_ref,
    });

    expect(outcome.recorded).toBe(true);
    expect(outcome.log.orphan_rejection_count).toBe(0);
    expect(outcome.log.turns).toHaveLength(1);
    expect(outcome.log.turns[0]?.question_text).toBe(emitted.question_text);
    expect(outcome.log.turns[0]?.goal_predicate_ref).toBe(GOAL_REF);
  });

  test("the same question stripped of goal_predicate_ref is rejected as orphan (the ref is why it passes)", () => {
    const candidates = emitTieQuestionCandidates({
      table: makeTieTable(),
      goal_predicate_ref: GOAL_REF,
    });
    const emitted = candidates[0];
    if (!emitted) throw new Error("unreachable — clause 2 requires at least one candidate");

    const outcome = recordFiredTurn(createTurnLog(), {
      question_text: emitted.question_text,
      asked_at: ASKED_AT,
    });

    expect(outcome.recorded).toBe(false);
    expect(outcome.log.orphan_rejection_count).toBe(1);
    expect(outcome.log.turns).toHaveLength(0);
  });
});
