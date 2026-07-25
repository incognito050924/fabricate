/**
 * ac-20 acceptance — U10 clarification-need grade 1-4 (ClariQ): grade+rationale
 * are logged, the grade is the explicit input of lightweight/heavyweight
 * routing, and this grade scale is the single source of truth (SoT) that
 * bundle-6 C5 reuses (C5 adds no new AC). Frozen red: the modules under
 * src/interview/clarification/ and src/interview/turn/ do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-20.json), covered clauses:
 *  (1) grade+rationale log — recording a fixture request turn yields a ClariQ
 *      record whose grade is in {1,2,3,4} and whose rationale is non-empty;
 *      the record schema rejects, at parse time (fail-closed), out-of-scale
 *      grades, an empty rationale (.min(1)), a record with grade but no
 *      rationale, and a record with rationale but no grade.
 *  (2) routing input — the routing function takes the grade as an explicit
 *      argument and deterministically returns a path from the two-member
 *      enum {lightweight, heavyweight}: a low-grade fixture and a high-grade
 *      fixture yield different paths, re-invocation with the same grade
 *      always yields the same path, and the routing decision record keeps a
 *      reference to the input grade so the grade is structurally observable
 *      as the routing's actual input.
 *  (3) single SoT for bundle-6 C5 — an src/-wide scan asserts the
 *      clarification grade scale is declared only in the new grade module
 *      (no second scale definition greps anywhere else); the C5 consumption
 *      seam imports that module instead of redefining or value-copying it,
 *      and returns the identical stored record (reference identity) whose
 *      grade the routing consumed.
 *
 * Residual (NOT tested here, per row residual):
 *  - Grade judgment content — which grade (1-4) a given request actually
 *    deserves (ClariQ grading accuracy) is a human-judged predicate the
 *    locked statement itself declares residual; fixture grades below are
 *    inputs and their correctness is never judged.
 *  - Real-conversation compliance outside fixtures — whether every request
 *    in a live conversation gets a grade+rationale and whether routing
 *    follows that grade is beyond fixture-turn structural observation
 *    (semi-deterministic) and is not closed by this verdict.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { clarificationGradeSchema } from "../src/interview/clarification/grade";
import { routeByClarificationGrade } from "../src/interview/clarification/routing";
import {
  clarificationRecordSchema,
  createClarificationLog,
  readClarificationRecordForC5,
  recordClarificationTurn,
} from "../src/interview/turn/clarification-log";

const SRC_ROOT = join(import.meta.dir, "..", "src");
const GRADE_MODULE_RELATIVE_PATH = "interview/clarification/grade.ts";
const C5_SEAM_MODULE_RELATIVE_PATH = "interview/turn/clarification-log.ts";

// The two-member routing path enum this criterion fixes as its completion
// definition (internal-English identifiers per repo convention).
const ROUTING_PATH_ENUM = ["lightweight", "heavyweight"] as const;

// Fixture grades are inputs; whether these requests really deserve grade 1
// or grade 4 is residual and never judged here.
const LOW_GRADE_FIXTURE = {
  request_text: "로그인 버튼 라벨을 '로그인'에서 '들어가기'로 바꿔줘",
  grade: 1,
  rationale: "대상과 완료 조건이 요청 문안에 그대로 있어 명료화 필요가 거의 없다",
} as const;
const HIGH_GRADE_FIXTURE = {
  request_text: "시스템을 전반적으로 더 좋게 만들어줘",
  grade: 4,
  rationale: "대상 범위와 성공 판정이 전혀 진술되지 않아 무거운 명료화가 필요하다",
} as const;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

// Import statements are stripped before applying the declaration grep so
// that importing the grade type/schema (reuse) is never mistaken for
// redefining it (a second definition).
function stripImportStatements(source: string): string {
  return source.replace(/^import[\s\S]*?["'][^"']*["'];?\s*$/gm, "");
}

// A "clarification grade scale definition" for the purpose of the SoT grep:
// a declaration keyword introducing a clarification-grade-named identifier.
const GRADE_SCALE_DECLARATION =
  /\b(?:const|let|var|type|enum|function|class|interface)\s+\w*clarification_?grade\w*/i;
// Complementary shape-based grep: a literal 1|2|3|4 scale enumeration.
const SCALE_UNION_ENUMERATION = /\b1\s*\|\s*2\s*\|\s*3\s*\|\s*4\b/;

function srcFilesMatching(pattern: RegExp): string[] {
  return listSourceFiles(SRC_ROOT)
    .filter((file) => pattern.test(stripImportStatements(readFileSync(file, "utf8"))))
    .map((file) => relative(SRC_ROOT, file))
    .sort();
}

describe("ac-20 clause 1 — grade+rationale are logged and the schema is fail-closed", () => {
  test("the grade schema parses exactly the 1-4 integer scale and rejects out-of-scale values", () => {
    expect(clarificationGradeSchema.safeParse(1).success).toBe(true);
    expect(clarificationGradeSchema.safeParse(2).success).toBe(true);
    expect(clarificationGradeSchema.safeParse(3).success).toBe(true);
    expect(clarificationGradeSchema.safeParse(4).success).toBe(true);

    expect(clarificationGradeSchema.safeParse(0).success).toBe(false);
    expect(clarificationGradeSchema.safeParse(5).success).toBe(false);
    expect(clarificationGradeSchema.safeParse(2.5).success).toBe(false);
    expect(clarificationGradeSchema.safeParse("2").success).toBe(false);
  });

  test("recording a fixture request turn yields a ClariQ record with in-scale grade and non-empty rationale, verbatim", () => {
    const log = createClarificationLog();
    const stored = recordClarificationTurn(log, HIGH_GRADE_FIXTURE);

    expect([1, 2, 3, 4]).toContain(stored.grade);
    expect(stored.grade).toBe(HIGH_GRADE_FIXTURE.grade);
    expect(stored.rationale.length).toBeGreaterThanOrEqual(1);
    expect(stored.rationale).toBe(HIGH_GRADE_FIXTURE.rationale);
    expect(stored.request_text).toBe(HIGH_GRADE_FIXTURE.request_text);
  });

  test("a well-formed grade+rationale record parses (positive control for the fail-closed cases)", () => {
    expect(clarificationRecordSchema.safeParse({ ...LOW_GRADE_FIXTURE }).success).toBe(true);
  });

  test("a record carrying a grade but no (or empty) rationale is rejected at parse time (fail-closed)", () => {
    const missingRationale = clarificationRecordSchema.safeParse({
      request_text: HIGH_GRADE_FIXTURE.request_text,
      grade: 4,
    });
    expect(missingRationale.success).toBe(false);

    const emptyRationale = clarificationRecordSchema.safeParse({
      request_text: HIGH_GRADE_FIXTURE.request_text,
      grade: 4,
      rationale: "",
    });
    expect(emptyRationale.success).toBe(false);
  });

  test("a record carrying a rationale but no (or out-of-scale) grade is rejected at parse time (fail-closed)", () => {
    const missingGrade = clarificationRecordSchema.safeParse({
      request_text: HIGH_GRADE_FIXTURE.request_text,
      rationale: HIGH_GRADE_FIXTURE.rationale,
    });
    expect(missingGrade.success).toBe(false);

    const outOfScaleGrade = clarificationRecordSchema.safeParse({
      request_text: HIGH_GRADE_FIXTURE.request_text,
      grade: 5,
      rationale: HIGH_GRADE_FIXTURE.rationale,
    });
    expect(outOfScaleGrade.success).toBe(false);
  });
});

describe("ac-20 clause 2 — the grade is the explicit, deterministic input of lightweight/heavyweight routing", () => {
  test("a low-grade fixture and a high-grade fixture yield different paths from the two-member enum", () => {
    const low = routeByClarificationGrade(LOW_GRADE_FIXTURE.grade);
    const high = routeByClarificationGrade(HIGH_GRADE_FIXTURE.grade);

    expect(ROUTING_PATH_ENUM).toContain(low.path);
    expect(ROUTING_PATH_ENUM).toContain(high.path);
    expect(low.path).not.toBe(high.path);
  });

  test("re-invocation with the same grade always returns the same path (determinism)", () => {
    for (const grade of [1, 2, 3, 4] as const) {
      const first = routeByClarificationGrade(grade);
      const second = routeByClarificationGrade(grade);
      expect(second.path).toBe(first.path);
    }

    const repeated = [
      routeByClarificationGrade(2).path,
      routeByClarificationGrade(2).path,
      routeByClarificationGrade(2).path,
    ];
    expect(new Set(repeated).size).toBe(1);
  });

  test("the routing decision record keeps a reference to the input grade (grade observed as the actual input)", () => {
    expect(routeByClarificationGrade(3).input_grade).toBe(3);
    expect(routeByClarificationGrade(1).input_grade).toBe(1);
  });
});

describe("ac-20 clause 3 — the grade scale is the single SoT that bundle-6 C5 reuses without a new AC", () => {
  test("src/-wide scan: the clarification grade scale is declared only in the new grade module", () => {
    expect(srcFilesMatching(GRADE_SCALE_DECLARATION)).toEqual([GRADE_MODULE_RELATIVE_PATH]);
  });

  test("src/-wide scan: no second 1|2|3|4 scale enumeration exists outside the grade module", () => {
    const outsideGradeModule = srcFilesMatching(SCALE_UNION_ENUMERATION).filter(
      (file) => file !== GRADE_MODULE_RELATIVE_PATH,
    );
    expect(outsideGradeModule).toEqual([]);
  });

  test("the C5 consumption seam imports the grade module instead of redefining or value-copying it", () => {
    const seamSource = readFileSync(join(SRC_ROOT, C5_SEAM_MODULE_RELATIVE_PATH), "utf8");

    expect(seamSource).toMatch(/from\s+["'][^"']*clarification\/grade(?:\.ts)?["']/);
    expect(GRADE_SCALE_DECLARATION.test(stripImportStatements(seamSource))).toBe(false);
  });

  test("the C5 seam returns the identical stored record whose grade the routing consumed (fixture identity)", () => {
    const log = createClarificationLog();
    const stored = recordClarificationTurn(log, HIGH_GRADE_FIXTURE);

    const decision = routeByClarificationGrade(stored.grade);
    const viaC5 = readClarificationRecordForC5(log, stored.turn_id);

    // Reference identity: C5 reuses the stored record itself — a value copy
    // (structurally equal but distinct object) fails this assertion.
    expect(viaC5).toBe(stored);
    expect(decision.input_grade).toBe(viaC5.grade);
    expect(viaC5.rationale).toBe(HIGH_GRADE_FIXTURE.rationale);
  });
});
