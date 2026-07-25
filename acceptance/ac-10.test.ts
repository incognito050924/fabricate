/**
 * ac-10 acceptance — round-0 reading leaves three inspectable artifacts (core).
 * Frozen red: the modules under src/interview/reading/ do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-10.json), covered clauses:
 *  (1) the round-0 unified reading pass yields a frame role table that exists
 *      and has at least one row (existence + non-empty); an empty table is not
 *      an acceptable reading
 *  (2) every role item with role==='core' and an empty filler is emitted as a
 *      dimension candidate enrolled in ac-3's dimension structure
 *      (origin='discovered', state='open') and the emission record references
 *      the original role item — downstream connection (1); filled core roles
 *      and unfilled peripheral roles are not emitted. Two differently shaped
 *      role tables (plus an all-core-filled one) must yield different emission
 *      sets, so the emission is derived from the argument, never fixed
 *  (3) the token-effect audit table exists and every token of the
 *      fixture-fixed content-token set maps to a non-empty constraint row
 *      (set coverage); an unmapped token is detected, named, and makes the
 *      reading unacceptable
 *  (4) a single empty constraint row deterministically rejects the reading
 *      and records reread_triggered=true (empty-row rejection + reread)
 *  (5) the entailment/presupposition/implicature typing table exists, each
 *      row carries cancellation-check and projection-check result fields,
 *      and every commitment produced by the reading is typed as one of the
 *      three types; an untyped commitment, a commitment whose row carries a
 *      type outside the three-type vocabulary, and a row missing a check
 *      field are each detected, named, and make the reading unacceptable
 *  (6) the typing table is handed to question hygiene (ac-7) as its input
 *      seam: the hygiene input reference points at the typing table —
 *      downstream connection (2); the consumption behavior itself is ac-7's
 *      concern and is NOT asserted here
 *
 * Residual (NOT tested here, per row residual):
 *  - Whether a role really is 'core': only the role field value and the
 *    unfilled-core -> dimension emission wiring are checked.
 *  - Whether a constraint row's content correctly captures its token's actual
 *    effect, and whether the fixture's token segmentation matches a real
 *    utterance: only non-empty-row mapping coverage is checked; the
 *    content-token set itself is fixture-fixed.
 *  - Whether a commitment is classified under the CORRECT type (classifier
 *    circularity, same prior as ac-7): only that every commitment carries one
 *    of the three vocabulary types plus both check result fields is checked —
 *    membership and field presence, never which of the three is right. The
 *    boolean contents of the check fields are fixture-fixed and not graded.
 */
import { describe, expect, test } from "bun:test";
import { validateCommitmentTyping } from "../src/interview/reading/commitment-typing";
import { emitUnfilledCoreRoles } from "../src/interview/reading/frame-role-table";
import { runRound0Reading } from "../src/interview/reading/round0-reading";
import { auditTokenEffects } from "../src/interview/reading/token-effect-audit";

const SOURCE_REQUEST = "임시 파일을 매일 자정에 백업 폴더로 옮겨줘";

// Fixture-fixed content-token set (segmentation accuracy is residual).
const CONTENT_TOKENS = ["임시 파일", "매일 자정", "백업 폴더", "옮겨"];

// Frame role table: 2 filled core, 2 unfilled core, 1 filled peripheral,
// 1 unfilled peripheral — only the 2 unfilled core rows may be emitted.
const FRAME_ROLE_ROWS = [
  { role_name: "theme", role: "core", filler: "임시 파일" },
  { role_name: "destination", role: "core", filler: "백업 폴더" },
  { role_name: "source_location", role: "core", filler: "" },
  { role_name: "collision_policy", role: "core", filler: "" },
  { role_name: "schedule", role: "peripheral", filler: "매일 자정" },
  { role_name: "manner", role: "peripheral", filler: "" },
];

// A second, differently shaped frame role table with entirely different role
// names: 2 filled core, 1 unfilled core, 2 unfilled peripheral. Emission must
// be derived from the argument, so this table must yield a different result
// than FRAME_ROLE_ROWS (1 record, named "retention_window").
const ALT_FRAME_ROLE_ROWS = [
  { role_name: "agent", role: "core", filler: "백업 데몬" },
  { role_name: "instrument", role: "core", filler: "이동 명령" },
  { role_name: "retention_window", role: "core", filler: "" },
  { role_name: "failure_notice", role: "peripheral", filler: "" },
  { role_name: "priority", role: "peripheral", filler: "" },
];

// A third table whose core roles are all filled: nothing may be emitted.
const FILLED_CORE_ONLY_ROWS = [
  { role_name: "agent", role: "core", filler: "백업 데몬" },
  { role_name: "theme", role: "core", filler: "임시 파일" },
  { role_name: "priority", role: "peripheral", filler: "" },
];

// One non-empty constraint row per content token (full set coverage).
const TOKEN_EFFECT_ROWS = [
  { token: "임시 파일", constraint: "이동 대상은 임시 파일로 한정된다" },
  { token: "매일 자정", constraint: "실행 시각은 매일 자정으로 고정된다" },
  { token: "백업 폴더", constraint: "이동 종착지는 백업 폴더다" },
  { token: "옮겨", constraint: "복사가 아니라 이동이다: 반영 후 원본 위치에서 제거된다" },
];

const C_ENTAILMENT = "이동이 끝나면 원본 위치에 파일이 남아 있지 않다";
const C_PRESUPPOSITION = "옮길 임시 파일이 존재한다";
const C_IMPLICATURE = "백업 폴더 밖의 다른 파일은 건드리지 않는다";
const COMMITMENTS = [C_ENTAILMENT, C_PRESUPPOSITION, C_IMPLICATURE];

// Check-field CONTENTS are fixture-fixed and not graded (residual); the tests
// assert only field presence (boolean) and three-type membership.
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

// A commitment that the reading produces but that no typing row covers.
const C_UNTYPED = "이동 내역이 로그로 남는다";
// A commitment that appears only in the typing table, never in the reading's
// commitment list: a name-set difference, not a length difference.
const C_STRAY = "백업 폴더는 이동 전에 이미 존재한다";

// A row whose type is outside the entailment/presupposition/implicature
// vocabulary: the commitment is therefore not typed as one of the three.
const OUT_OF_VOCABULARY_TYPE_ROW = {
  commitment: C_IMPLICATURE,
  type: "inference",
  cancellation_check: true,
  projection_check: false,
};

/** Drops one key so a malformed row can be built without duplicating it. */
function withoutKey<T extends object, K extends keyof T>(row: T, key: K): Omit<T, K> {
  const { [key]: _dropped, ...rest } = row;
  return rest;
}

function copyTypingRows() {
  return COMMITMENT_TYPING_ROWS.map((row) => ({ ...row }));
}

function makeGoodInput() {
  return {
    source_request: SOURCE_REQUEST,
    content_tokens: [...CONTENT_TOKENS],
    frame_role_table: FRAME_ROLE_ROWS.map((row) => ({ ...row })),
    token_effect_audit: TOKEN_EFFECT_ROWS.map((row) => ({ ...row })),
    commitments: [...COMMITMENTS],
    commitment_typing: COMMITMENT_TYPING_ROWS.map((row) => ({ ...row })),
  };
}

function acceptOrThrow(input: ReturnType<typeof makeGoodInput>) {
  const result = runRound0Reading(input);
  if (!result.accepted) throw new Error("expected the good fixture to be accepted");
  return result;
}

describe("ac-10 clause 1 — frame role table exists and is non-empty", () => {
  test("the accepted reading pass exposes the frame role table with at least one row", () => {
    const result = runRound0Reading(makeGoodInput());
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");

    expect(result.reading.frame_role_table.length).toBeGreaterThanOrEqual(1);
    expect(result.reading.frame_role_table).toHaveLength(6);

    const first = result.reading.frame_role_table[0];
    expect(first?.role_name).toBe("theme");
    expect(first?.role).toBe("core");
    expect(first?.filler).toBe("임시 파일");
  });

  test("an empty frame role table is not an acceptable reading", () => {
    const result = runRound0Reading({ ...makeGoodInput(), frame_role_table: [] });
    expect(result.accepted).toBe(false);
  });
});

describe("ac-10 clause 2 — unfilled core roles are emitted as ac-3 dimension candidates", () => {
  test("each core role with an empty filler is emitted, referencing its original role item", () => {
    const records = emitUnfilledCoreRoles(makeGoodInput().frame_role_table);

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.role_ref).sort()).toEqual([
      "collision_policy",
      "source_location",
    ]);

    for (const record of records) {
      // Enrolled in ac-3's dimension structure (discovered/open candidate).
      expect(record.dimension.origin).toBe("discovered");
      expect(record.dimension.state).toBe("open");
      expect(record.dimension.id.length).toBeGreaterThan(0);
      expect(record.dimension.label.length).toBeGreaterThan(0);
    }
    // Two distinct role items must not collapse into one dimension identity.
    expect(new Set(records.map((record) => record.dimension.id)).size).toBe(2);
  });

  test("filled core roles and unfilled peripheral roles are not emitted (contrast)", () => {
    const refs = emitUnfilledCoreRoles(makeGoodInput().frame_role_table).map(
      (record) => record.role_ref,
    );

    expect(refs).not.toContain("theme");
    expect(refs).not.toContain("destination");
    expect(refs).not.toContain("manner");
  });

  test("a differently shaped table yields a different emission set (argument-derived)", () => {
    const records = emitUnfilledCoreRoles(ALT_FRAME_ROLE_ROWS.map((row) => ({ ...row })));

    expect(records.map((record) => record.role_ref)).toEqual(["retention_window"]);
    expect(records[0]?.dimension.origin).toBe("discovered");
    expect(records[0]?.dimension.state).toBe("open");
    expect(records[0]?.dimension.id.length).toBeGreaterThan(0);
    expect(records[0]?.dimension.label.length).toBeGreaterThan(0);

    // None of the other table's role items may leak in, and the two unfilled
    // peripheral roles of this table must stay out.
    const refs = records.map((record) => record.role_ref);
    expect(refs).not.toContain("source_location");
    expect(refs).not.toContain("collision_policy");
    expect(refs).not.toContain("failure_notice");
    expect(refs).not.toContain("priority");
  });

  test("a table whose core roles are all filled emits nothing", () => {
    expect(emitUnfilledCoreRoles(FILLED_CORE_ONLY_ROWS.map((row) => ({ ...row })))).toEqual([]);
  });

  test("the unified pass enrolls the same emissions in its output (downstream connection 1)", () => {
    const result = acceptOrThrow(makeGoodInput());

    expect(result.emitted_dimensions.map((record) => record.role_ref).sort()).toEqual([
      "collision_policy",
      "source_location",
    ]);
    for (const record of result.emitted_dimensions) {
      expect(record.dimension.origin).toBe("discovered");
      expect(record.dimension.state).toBe("open");
    }
  });

  test("the unified pass emission set follows the frame role table it was given", () => {
    const result = acceptOrThrow({
      ...makeGoodInput(),
      frame_role_table: ALT_FRAME_ROLE_ROWS.map((row) => ({ ...row })),
    });

    expect(result.reading.frame_role_table).toHaveLength(5);
    expect(result.reading.frame_role_table[2]?.role_name).toBe("retention_window");
    expect(result.emitted_dimensions.map((record) => record.role_ref)).toEqual([
      "retention_window",
    ]);
    expect(result.emitted_dimensions[0]?.dimension.origin).toBe("discovered");
    expect(result.emitted_dimensions[0]?.dimension.state).toBe("open");
  });
});

describe("ac-10 clause 3 — token-effect audit: full set coverage over content tokens", () => {
  test("the audit table exists in the accepted reading and covers every content token", () => {
    const result = acceptOrThrow(makeGoodInput());
    expect(result.reading.token_effect_audit).toHaveLength(4);

    const verdict = auditTokenEffects({
      content_tokens: [...CONTENT_TOKENS],
      rows: result.reading.token_effect_audit,
    });
    expect(verdict.covered).toBe(true);
    expect(verdict.unmapped_tokens).toEqual([]);
    expect(verdict.empty_constraint_tokens).toEqual([]);
  });

  test("a content token with no constraint row is detected and named", () => {
    const verdict = auditTokenEffects({
      content_tokens: [...CONTENT_TOKENS],
      rows: TOKEN_EFFECT_ROWS.filter((row) => row.token !== "백업 폴더").map((row) => ({
        ...row,
      })),
    });

    expect(verdict.covered).toBe(false);
    expect(verdict.unmapped_tokens).toEqual(["백업 폴더"]);
  });

  test("a token mapped only to an empty constraint row does not count as covered", () => {
    const verdict = auditTokenEffects({
      content_tokens: [...CONTENT_TOKENS],
      rows: TOKEN_EFFECT_ROWS.map((row) =>
        row.token === "옮겨" ? { ...row, constraint: "" } : { ...row },
      ),
    });

    expect(verdict.covered).toBe(false);
    expect(verdict.empty_constraint_tokens).toEqual(["옮겨"]);
  });

  test("a reading with an unmapped content token is not accepted by the unified pass", () => {
    const input = {
      ...makeGoodInput(),
      token_effect_audit: TOKEN_EFFECT_ROWS.filter((row) => row.token !== "백업 폴더").map(
        (row) => ({ ...row }),
      ),
    };
    expect(runRound0Reading(input).accepted).toBe(false);
  });
});

describe("ac-10 clause 4 — one empty constraint row rejects the reading and triggers reread", () => {
  test("the reading is deterministically rejected with reread_triggered=true recorded", () => {
    // Contrast baseline: without the empty row the same input is accepted.
    expect(runRound0Reading(makeGoodInput()).accepted).toBe(true);

    const withEmptyRow = {
      ...makeGoodInput(),
      token_effect_audit: TOKEN_EFFECT_ROWS.map((row) =>
        row.token === "옮겨" ? { ...row, constraint: "" } : { ...row },
      ),
    };
    const result = runRound0Reading(withEmptyRow);

    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("unreachable");
    expect(result.reread_triggered).toBe(true);
    expect(result.reason).toBe("empty_constraint_row");
  });
});

describe("ac-10 clause 5 — commitment typing: all commitments typed, both check fields present", () => {
  test("the typing table exists and types every commitment with one of the three types", () => {
    const result = acceptOrThrow(makeGoodInput());
    const table = result.reading.commitment_typing;

    expect(table).toHaveLength(3);
    expect(table.map((row) => row.commitment).sort()).toEqual([...COMMITMENTS].sort());

    for (const row of table) {
      expect(["entailment", "presupposition", "implicature"]).toContain(row.type);
      expect(typeof row.cancellation_check).toBe("boolean");
      expect(typeof row.projection_check).toBe("boolean");
    }
  });

  test("the complete fixture passes the typing validator", () => {
    const verdict = validateCommitmentTyping({
      commitments: [...COMMITMENTS],
      rows: copyTypingRows(),
    });

    expect(verdict.complete).toBe(true);
    expect(verdict.untyped_commitments).toEqual([]);
    expect(verdict.out_of_vocabulary_types).toEqual([]);
    expect(verdict.rows_missing_checks).toEqual([]);
  });

  test("an untyped commitment is detected and named by the typing validator", () => {
    const verdict = validateCommitmentTyping({
      commitments: [...COMMITMENTS, C_UNTYPED],
      rows: copyTypingRows(),
    });

    expect(verdict.complete).toBe(false);
    expect(verdict.untyped_commitments).toEqual([C_UNTYPED]);
  });

  test("untyped commitments are found by name, not by row count", () => {
    // Same number of rows as commitments, but the third row types a stray
    // commitment while C_IMPLICATURE is left uncovered.
    const verdict = validateCommitmentTyping({
      commitments: [...COMMITMENTS],
      rows: [
        { ...COMMITMENT_TYPING_ROWS[0] },
        { ...COMMITMENT_TYPING_ROWS[1] },
        { ...COMMITMENT_TYPING_ROWS[2], commitment: C_STRAY },
      ],
    });

    expect(verdict.complete).toBe(false);
    expect(verdict.untyped_commitments).toEqual([C_IMPLICATURE]);
  });

  test("several untyped commitments are named in commitment order, ignoring row order", () => {
    const verdict = validateCommitmentTyping({
      commitments: [C_UNTYPED, C_ENTAILMENT, C_STRAY, C_PRESUPPOSITION, C_IMPLICATURE],
      rows: [
        { ...COMMITMENT_TYPING_ROWS[2] },
        { ...COMMITMENT_TYPING_ROWS[0] },
        { ...COMMITMENT_TYPING_ROWS[1] },
      ],
    });

    expect(verdict.complete).toBe(false);
    expect(verdict.untyped_commitments).toEqual([C_UNTYPED, C_STRAY]);
  });

  test("a type outside the three-type vocabulary is detected and named", () => {
    const verdict = validateCommitmentTyping({
      commitments: [...COMMITMENTS],
      rows: [
        { ...COMMITMENT_TYPING_ROWS[0] },
        { ...COMMITMENT_TYPING_ROWS[1] },
        { ...OUT_OF_VOCABULARY_TYPE_ROW },
      ],
    });

    expect(verdict.complete).toBe(false);
    expect(verdict.out_of_vocabulary_types).toEqual([C_IMPLICATURE]);
  });

  test("a row missing the cancellation-check field is detected and named", () => {
    const verdict = validateCommitmentTyping({
      commitments: [...COMMITMENTS],
      rows: [
        withoutKey({ ...COMMITMENT_TYPING_ROWS[0] }, "cancellation_check"),
        { ...COMMITMENT_TYPING_ROWS[1] },
        { ...COMMITMENT_TYPING_ROWS[2] },
      ],
    });

    expect(verdict.complete).toBe(false);
    expect(verdict.rows_missing_checks).toEqual([C_ENTAILMENT]);
  });

  test("a row missing the projection-check field is detected and named", () => {
    const verdict = validateCommitmentTyping({
      commitments: [...COMMITMENTS],
      rows: [
        { ...COMMITMENT_TYPING_ROWS[0] },
        withoutKey({ ...COMMITMENT_TYPING_ROWS[1] }, "projection_check"),
        { ...COMMITMENT_TYPING_ROWS[2] },
      ],
    });

    expect(verdict.complete).toBe(false);
    expect(verdict.rows_missing_checks).toEqual([C_PRESUPPOSITION]);
  });

  test("a reading with an untyped commitment is not accepted by the unified pass", () => {
    const input = {
      ...makeGoodInput(),
      commitments: [...COMMITMENTS, C_UNTYPED],
    };
    expect(runRound0Reading(input).accepted).toBe(false);
  });

  test("a reading whose typing table misses a commitment by name is not accepted", () => {
    const input = {
      ...makeGoodInput(),
      commitment_typing: [
        { ...COMMITMENT_TYPING_ROWS[0] },
        { ...COMMITMENT_TYPING_ROWS[1] },
        { ...COMMITMENT_TYPING_ROWS[2], commitment: C_STRAY },
      ],
    };
    expect(runRound0Reading(input).accepted).toBe(false);
  });

  test("a reading whose typing table uses a type outside the vocabulary is not accepted", () => {
    const input = {
      ...makeGoodInput(),
      commitment_typing: [
        { ...COMMITMENT_TYPING_ROWS[0] },
        { ...COMMITMENT_TYPING_ROWS[1] },
        { ...OUT_OF_VOCABULARY_TYPE_ROW },
      ],
    };
    expect(runRound0Reading(input).accepted).toBe(false);
  });

  test("a reading whose typing row lacks a check result field is not accepted", () => {
    const input = {
      ...makeGoodInput(),
      commitment_typing: [
        withoutKey({ ...COMMITMENT_TYPING_ROWS[0] }, "projection_check"),
        { ...COMMITMENT_TYPING_ROWS[1] },
        { ...COMMITMENT_TYPING_ROWS[2] },
      ],
    };
    expect(runRound0Reading(input).accepted).toBe(false);
  });
});

describe("ac-10 clause 6 — typing table is the question-hygiene (ac-7) input seam", () => {
  test("the hygiene input reference points at the commitment typing table itself", () => {
    const result = acceptOrThrow(makeGoodInput());

    // Downstream connection 2: reference identity, not a copy. Consumption
    // behavior of the seam is ac-7's concern and is not asserted here.
    expect(result.question_hygiene_input.commitment_typing_table).toBe(
      result.reading.commitment_typing,
    );
    expect(result.question_hygiene_input.commitment_typing_table.length).toBeGreaterThan(0);
  });
});
