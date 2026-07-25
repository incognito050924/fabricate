/**
 * ac-10a acceptance — Vendler accomplishment aspect: per-verb aspect tags,
 * completion predicate, endpoint-reached check (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10a.json), covered clauses:
 *  (1) running the round-0 unified reading pass — THE SAME SINGLE PASS as the
 *      ac-10 core, asserted here by feeding one fixture that carries the ac-10
 *      core reading input together with the verb rows and requiring that ONE
 *      call return the accepted core artifacts (frame_role_table,
 *      token_effect_audit, commitment_typing, emitted_dimensions) and the
 *      aspect tags inside the same reading object — yields
 *      reading.aspect_tags[] carrying a per-verb aspect classification tag for
 *      every fixture verb, verbatim, in order, with nothing added or dropped;
 *  (2) the row tagged as an accomplishment verb ('대체하다') has a non-empty
 *      completion_predicate, preserved verbatim; the activity row keeps no
 *      fabricated predicate;
 *  (3) an endpoint_reached_check — the '내 종결 상태가 그 종점에 도달하는가'
 *      check — is present and non-empty on the accomplishment row, verbatim;
 *  (4) a reading output whose accomplishment row has no completion_predicate
 *      (= activity-reading: the accomplishment verb read as a mere activity)
 *      is rejected by zod schema parsing — that rejection IS the detection of
 *      the activity-reading misreading class. Asserted at two levels: on the
 *      schema itself (missing / empty / whitespace-only predicate rejected at
 *      the exact issue path, activity rows without a predicate still parse),
 *      AND on the round-0 pass, which must be wired to that schema: the same
 *      deficient rows fed to the pass make it reject
 *      (accepted=false, reason='activity_reading'), and pass verdict and
 *      schema verdict agree over a four-variant matrix, so a schema that is
 *      dead code cannot pass this file.
 *
 * Residual (NOT tested here, per row residual):
 *  - Whether the Korean verb aspect classification itself is correct (which
 *    verbs really are accomplishment verbs) is not machine-decidable; the
 *    fixtures fix the tagging, and this file asserts only verbatim
 *    preservation and schema enforcement (required fields, rejection).
 *  - Whether the content of completion_predicate / endpoint_reached_check
 *    semantically expresses or judges the verb's true endpoint — only
 *    non-emptiness / presence / verbatim preservation is asserted, never
 *    whether the wording captures the real endpoint.
 */
import { describe, expect, test } from "bun:test";
import { runRound0Reading } from "../src/interview/reading/round0-reading";
import { aspectReadingSchema } from "../src/interview/round0/vendler-aspect";

type AspectRow = {
  verb: string;
  aspect_class: string;
  completion_predicate?: string;
  endpoint_reached_check?: string;
};

const SOURCE_REQUEST = "낡은 인증 모듈을 새 세션 모듈로 대체하고 관련 문서를 검토해 주세요.";

// --- ac-10 core reading input (this criterion rides the SAME pass) ---------
// Fixture-fixed content-token set; token segmentation accuracy is ac-10's
// residual and is not graded here.
const CONTENT_TOKENS = ["낡은 인증 모듈", "새 세션 모듈", "대체", "관련 문서", "검토"];

const FRAME_ROLE_ROWS = [
  { role_name: "theme", role: "core", filler: "낡은 인증 모듈" },
  { role_name: "replacement", role: "core", filler: "새 세션 모듈" },
  { role_name: "cutover_point", role: "core", filler: "" },
  { role_name: "review_scope", role: "peripheral", filler: "관련 문서" },
];

const TOKEN_EFFECT_ROWS = [
  { token: "낡은 인증 모듈", constraint: "교체 대상은 낡은 인증 모듈로 한정된다" },
  { token: "새 세션 모듈", constraint: "교체 후 인증 경로는 새 세션 모듈을 쓴다" },
  { token: "대체", constraint: "병행 유지가 아니라 대체다: 낡은 모듈은 남지 않는다" },
  { token: "관련 문서", constraint: "검토 범위는 인증 교체와 관련된 문서로 한정된다" },
  { token: "검토", constraint: "문서는 수정이 아니라 검토 대상이다" },
];

const C_ENTAILMENT = "대체가 끝나면 낡은 인증 모듈을 호출하는 코드가 남아 있지 않다";
const C_PRESUPPOSITION = "낡은 인증 모듈이 현재 존재한다";
const C_IMPLICATURE = "인증과 무관한 모듈은 건드리지 않는다";
const COMMITMENTS = [C_ENTAILMENT, C_PRESUPPOSITION, C_IMPLICATURE];

const COMMITMENT_TYPING_ROWS = [
  {
    commitment: C_ENTAILMENT,
    type: "entailment",
    cancellation_check: false,
    projection_check: false,
  },
  {
    commitment: C_PRESUPPOSITION,
    type: "presupposition",
    cancellation_check: false,
    projection_check: true,
  },
  {
    commitment: C_IMPLICATURE,
    type: "implicature",
    cancellation_check: true,
    projection_check: false,
  },
];

// --- aspect fixture --------------------------------------------------------
// The fixture fixes the per-verb aspect tagging (classification correctness is
// residual): '대체하다' is the accomplishment verb named by the contract row,
// '검토하다' is fixed as a plain activity for contrast.
const COMPLETION_PREDICATE = "낡은 인증 모듈 참조가 0건이고 모든 호출 지점이 새 세션 모듈을 쓴다";
const ENDPOINT_CHECK = "내 종결 상태가 그 종점에 도달하는가 — 낡은 인증 모듈 참조가 0건인가";

const WELL_FORMED_ASPECT_ROWS: AspectRow[] = [
  {
    verb: "대체하다",
    aspect_class: "accomplishment",
    completion_predicate: COMPLETION_PREDICATE,
    endpoint_reached_check: ENDPOINT_CHECK,
  },
  {
    // Activities have no endpoint to predicate on: no completion_predicate.
    verb: "검토하다",
    aspect_class: "activity",
  },
];

// Negative variant: the accomplishment verb read as a mere activity — the
// completion_predicate is absent.
const MISSING_PREDICATE_ROWS: AspectRow[] = [
  {
    verb: "대체하다",
    aspect_class: "accomplishment",
    endpoint_reached_check: ENDPOINT_CHECK,
  },
];

// Negative variant: predicate key present but empty — an activity-reading in
// disguise ("비어있지 않다" is the requirement).
const EMPTY_PREDICATE_ROWS: AspectRow[] = [
  {
    verb: "대체하다",
    aspect_class: "accomplishment",
    completion_predicate: "",
    endpoint_reached_check: ENDPOINT_CHECK,
  },
];

// Negative variant: whitespace-only predicate — empty in substance.
const BLANK_PREDICATE_ROWS: AspectRow[] = [
  {
    verb: "대체하다",
    aspect_class: "accomplishment",
    completion_predicate: "   ",
    endpoint_reached_check: ENDPOINT_CHECK,
  },
];

// Control: the predicate requirement is conditional on the accomplishment
// class. Same two verbs, both fixture-tagged as activities, neither carrying a
// predicate — nothing to reject. (The tagging itself is residual.)
const ALL_ACTIVITY_ROWS: AspectRow[] = [
  { verb: "대체하다", aspect_class: "activity" },
  { verb: "검토하다", aspect_class: "activity" },
];

const clone = <T>(rows: T[]): T[] => rows.map((row) => ({ ...row }));

function makeReadingInput(aspectRows: AspectRow[]) {
  return {
    source_request: SOURCE_REQUEST,
    content_tokens: [...CONTENT_TOKENS],
    frame_role_table: clone(FRAME_ROLE_ROWS),
    token_effect_audit: clone(TOKEN_EFFECT_ROWS),
    commitments: [...COMMITMENTS],
    commitment_typing: clone(COMMITMENT_TYPING_ROWS),
    aspect_tags: clone(aspectRows),
  };
}

function acceptedReading(aspectRows: AspectRow[]) {
  const result = runRound0Reading(makeReadingInput(aspectRows));
  if (!result.accepted) {
    throw new Error(`the unified pass rejected a well-formed fixture: ${String(result.reason)}`);
  }
  return result;
}

function aspectRow(rows: AspectRow[], verb: string): AspectRow {
  const row = rows.find((candidate: AspectRow) => candidate.verb === verb);
  if (!row) throw new Error(`aspect row for ${verb} must exist in aspect_tags[]`);
  return row;
}

describe("ac-10a clause 1 — one round-0 pass emits the ac-10 core artifacts AND the aspect tags", () => {
  test("a single call returns the accepted core reading together with aspect_tags", () => {
    const result = runRound0Reading(makeReadingInput(WELL_FORMED_ASPECT_ROWS));

    // The reading is accepted: these aspect tags come out of a reading the
    // pass itself judges usable, not out of a rejected one.
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");

    // ac-10 core artifacts of THIS SAME call.
    expect(
      result.reading.frame_role_table.map((row: { role_name: string }) => row.role_name),
    ).toEqual(["theme", "replacement", "cutover_point", "review_scope"]);
    expect(result.reading.token_effect_audit.map((row: { token: string }) => row.token)).toEqual(
      CONTENT_TOKENS,
    );
    expect(
      result.reading.commitment_typing.map((row: { commitment: string }) => row.commitment),
    ).toEqual(COMMITMENTS);
    expect(
      result.emitted_dimensions.map((record: { role_ref: string }) => record.role_ref),
    ).toEqual(["cutover_point"]);

    // ...and the aspect tags live in that same reading object.
    expect(Array.isArray(result.reading.aspect_tags)).toBe(true);
    expect(result.reading.aspect_tags).toHaveLength(2);
    expect(result.reading.aspect_tags.map((row: AspectRow) => row.verb)).toEqual([
      "대체하다",
      "검토하다",
    ]);
  });

  test("each fixture verb keeps its fixed aspect class verbatim, in order, nothing invented", () => {
    const rows: AspectRow[] = acceptedReading(WELL_FORMED_ASPECT_ROWS).reading.aspect_tags;

    expect(rows.map((row) => [row.verb, row.aspect_class])).toEqual([
      ["대체하다", "accomplishment"],
      ["검토하다", "activity"],
    ]);
  });
});

describe("ac-10a clause 2 — accomplishment rows carry a non-empty completion predicate", () => {
  test("the '대체하다' row carries the fixture's completion_predicate verbatim", () => {
    const rows: AspectRow[] = acceptedReading(WELL_FORMED_ASPECT_ROWS).reading.aspect_tags;
    const row = aspectRow(rows, "대체하다");

    expect(row.aspect_class).toBe("accomplishment");
    expect(row.completion_predicate).toBe(
      "낡은 인증 모듈 참조가 0건이고 모든 호출 지점이 새 세션 모듈을 쓴다",
    );
    expect(String(row.completion_predicate).trim().length).toBeGreaterThan(0);
  });

  test("the activity row is not given a fabricated completion_predicate", () => {
    const rows: AspectRow[] = acceptedReading(WELL_FORMED_ASPECT_ROWS).reading.aspect_tags;
    const row = aspectRow(rows, "검토하다");

    expect(row.aspect_class).toBe("activity");
    expect(row.completion_predicate).toBeUndefined();
  });
});

describe("ac-10a clause 3 — the endpoint-reached check is left in the output", () => {
  test("the accomplishment row carries the '내 종결 상태가 그 종점에 도달하는가' check verbatim", () => {
    const rows: AspectRow[] = acceptedReading(WELL_FORMED_ASPECT_ROWS).reading.aspect_tags;
    const row = aspectRow(rows, "대체하다");

    expect(row.endpoint_reached_check).toBe(
      "내 종결 상태가 그 종점에 도달하는가 — 낡은 인증 모듈 참조가 0건인가",
    );
    expect(String(row.endpoint_reached_check)).toContain("내 종결 상태가 그 종점에 도달하는가");
  });
});

describe("ac-10a clause 4a — the zod schema rejects the activity-reading of an accomplishment verb", () => {
  test("positive control: activity rows parse without a completion_predicate", () => {
    const result = aspectReadingSchema.safeParse({
      aspect_tags: clone(WELL_FORMED_ASPECT_ROWS),
    });

    expect(result.success).toBe(true);
  });

  test("the live round-0 output itself parses under the aspect reading schema", () => {
    const reading = acceptedReading(WELL_FORMED_ASPECT_ROWS).reading;
    const result = aspectReadingSchema.safeParse({ aspect_tags: reading.aspect_tags });

    expect(result.success).toBe(true);
  });

  test("an accomplishment row missing completion_predicate is rejected at that exact path", () => {
    const result = aspectReadingSchema.safeParse({ aspect_tags: clone(MISSING_PREDICATE_ROWS) });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    const paths = result.error.issues.map((issue: { path: (string | number)[] }) =>
      issue.path.join("."),
    );
    expect(paths).toContain("aspect_tags.0.completion_predicate");
  });

  test("an empty-string completion_predicate is equally rejected (non-empty is required)", () => {
    const result = aspectReadingSchema.safeParse({ aspect_tags: clone(EMPTY_PREDICATE_ROWS) });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    const paths = result.error.issues.map((issue: { path: (string | number)[] }) =>
      issue.path.join("."),
    );
    expect(paths).toContain("aspect_tags.0.completion_predicate");
  });

  test("a whitespace-only completion_predicate is rejected too (empty in substance)", () => {
    const result = aspectReadingSchema.safeParse({ aspect_tags: clone(BLANK_PREDICATE_ROWS) });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    const paths = result.error.issues.map((issue: { path: (string | number)[] }) =>
      issue.path.join("."),
    );
    expect(paths).toContain("aspect_tags.0.completion_predicate");
  });
});

describe("ac-10a clause 4b — the round-0 pass itself enforces that rejection", () => {
  test("the pass rejects an accomplishment row with no completion_predicate", () => {
    // Paired contrast: the only difference is the missing predicate.
    expect(runRound0Reading(makeReadingInput(WELL_FORMED_ASPECT_ROWS)).accepted).toBe(true);

    const result = runRound0Reading(makeReadingInput(MISSING_PREDICATE_ROWS));

    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("unreachable");
    expect(result.reason).toBe("activity_reading");
  });

  test("the pass rejects an empty and a whitespace-only completion_predicate the same way", () => {
    const emptyResult = runRound0Reading(makeReadingInput(EMPTY_PREDICATE_ROWS));
    expect(emptyResult.accepted).toBe(false);
    expect(emptyResult.reason).toBe("activity_reading");

    const blankResult = runRound0Reading(makeReadingInput(BLANK_PREDICATE_ROWS));
    expect(blankResult.accepted).toBe(false);
    expect(blankResult.reason).toBe("activity_reading");
  });

  test("the pass accepts predicate-less rows when they are tagged as activities (conditional)", () => {
    const result = runRound0Reading(makeReadingInput(ALL_ACTIVITY_ROWS));

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.reading.aspect_tags.map((row: AspectRow) => row.aspect_class)).toEqual([
      "activity",
      "activity",
    ]);
  });

  test("pass verdict and schema verdict agree over the four aspect variants", () => {
    const variants: Array<{ name: string; rows: AspectRow[]; expected: boolean }> = [
      {
        name: "well-formed accomplishment + activity",
        rows: WELL_FORMED_ASPECT_ROWS,
        expected: true,
      },
      { name: "accomplishment missing predicate", rows: MISSING_PREDICATE_ROWS, expected: false },
      { name: "accomplishment with empty predicate", rows: EMPTY_PREDICATE_ROWS, expected: false },
      { name: "all rows tagged activity, no predicates", rows: ALL_ACTIVITY_ROWS, expected: true },
    ];

    for (const variant of variants) {
      const schemaVerdict = aspectReadingSchema.safeParse({
        aspect_tags: clone(variant.rows),
      }).success;
      const passVerdict = runRound0Reading(makeReadingInput(variant.rows)).accepted;

      expect([variant.name, schemaVerdict]).toEqual([variant.name, variant.expected]);
      expect([variant.name, passVerdict]).toEqual([variant.name, variant.expected]);
    }
  });
});
