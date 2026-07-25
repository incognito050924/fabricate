/**
 * ac-F1 acceptance — QbC disagreement map (extends ac-40/C4 or ac-35):
 * committee readings are folded into a per-area disagreement_map (a map, not
 * a score), the maximum-disagreement area becomes the next question target,
 * and diagnosis routing forks deterministically — consensus-but-wrong →
 * verification routing ('검증 라우팅'), disagreement → extraction problem
 * ('추출 문제'). Red-frozen.
 *
 * Oracle (gate-a/rows/ac-F1.json), covered clauses:
 *  (1) disagreement map existence — buildDisagreementMap
 *      (src/interview/calibration/disagreement-map.ts) over fixture-fixed
 *      multi-member committee outputs (committeeOutputSchema,
 *      src/interview/calibration/committee-output.ts) yields a map keyed by
 *      EXACTLY the areas where members diverge: a unanimous area gets no
 *      entry at all and a fully unanimous committee yields an empty map
 *      (disagreement, not a readings index), while each diverging area's
 *      entry points at that area's member outputs (real member_id, that
 *      area's reading preserved verbatim, every committee member covered
 *      exactly once — per-area disagreement). disagreementMapSchema rejects
 *      score-shaped payloads at every depth (bare scalar, score-only object,
 *      and — the sharp '점수 아님' case — an areas map whose per-area values
 *      are scalar scores), rejects entries without pointer records, and
 *      accepts the built map plus a hand-written minimal map (positive
 *      controls).
 *  (2) max area → question — selectMaxDisagreementTarget
 *      (src/interview/calibration/max-disagreement-target.ts) is a real
 *      argmax over the map, asserted with TWO committee fixtures whose
 *      maximum-disagreement area differs (3 > 2 > 1 distinct readings, the
 *      max being 삭제 범위 in one fixture and 완료 조건 in the other): the
 *      emitted question-target record references that fixture's max area,
 *      the non-max areas of the same fixture fail as targets, the two
 *      fixtures land on different targets (a fixed area cannot pass), and
 *      the same input repeated yields the same target.
 *  (3) diagnosis fork routing — routeDiagnosis
 *      (src/interview/calibration/diagnosis-router.ts) is a pure function of
 *      the fixture-fixed diagnosis tag (no model call, same input → same
 *      branch): the consensus-but-wrong fixture (all members agreed, tagged
 *      as conflicting with an external verification signal) routes to
 *      '검증 라우팅', the disagreement fixture (member outputs diverged)
 *      routes to '추출 문제' — asserted with the two contrast fixtures — and
 *      an input outside the two-tag domain (unknown tag, missing tag, no
 *      payload) does not leak into either branch: it is refused fail-closed
 *      by throwing, with the offending tag named in the message.
 *
 * Residual (NOT tested here, per row residual):
 *  - Disagreement-cause judgment (declared residual by the statement itself):
 *    WHY the committee split — genuine extraction problem, ambiguity of the
 *    request itself, or sampling noise — is not mechanizable; this file
 *    closes only the structure (map existence, max-area targeting, fork
 *    routing).
 *  - Substance of the "wrong" signal in consensus-but-wrong: this file routes
 *    only over the fixture-fixed external-verification-conflict tag (tag
 *    emission → pure gate routing, isomorphic to ac-35); noticing in real
 *    operation that a consensus is wrong depends on external verification
 *    signals (user correction, world-check, retrospective settlement) and is
 *    not closed by this verdict.
 *  - Correlated blind spot (§5 global limit; the draft names the committee/F1
 *    explicitly): all members share the same model prior, so a shared
 *    misreading passes silently as zero disagreement — the consensus-but-wrong
 *    fork mitigates only when the "wrong" signal arrives from outside, and
 *    diversity forcing is mitigation, not removal.
 */
import { describe, expect, test } from "bun:test";
import { committeeOutputSchema } from "../src/interview/calibration/committee-output";
import { routeDiagnosis } from "../src/interview/calibration/diagnosis-router";
import {
  buildDisagreementMap,
  disagreementMapSchema,
} from "../src/interview/calibration/disagreement-map";
import { selectMaxDisagreementTarget } from "../src/interview/calibration/max-disagreement-target";

// Reading areas, fixture-fixed.
const AREA_SCOPE = "삭제 범위";
const AREA_DONE = "완료 조건";
const AREA_OUTPUT = "출력 형식";

type CommitteeMember = { member_id: string; readings: Record<string, string> };
type Committee = { members: CommitteeMember[] };

// Shapes the map is asserted against (declared locally — this file shares
// nothing with other test files).
type DisagreementPointer = { member_id: string; reading: string };
type AreaEntry = { pointers: DisagreementPointer[] };
type DisagreementMap = { areas: Record<string, AreaEntry> };

// Readings, fixture-fixed. How they were produced is outside this verdict.
const SCOPE_MOVE_ALL = "레거시 디렉터리 전체를 새 구조로 이동한다";
const SCOPE_MOVE_PART = "레거시 디렉터리 일부만 이동하고 나머지는 보존한다";
const SCOPE_SYMLINK = "이동 없이 심볼릭 링크만 건다";
const DONE_BUN_TEST = "bun test가 green이면 완료";
const DONE_BUILD = "빌드가 green이면 완료";
const DONE_USER_APPROVAL = "사용자 승인이 있으면 완료";
const OUTPUT_KOREAN_SUMMARY = "한국어 요약 렌더";

// Committee A — per-area disagreement sizes are strictly ordered:
// 삭제 범위 (3 distinct readings) > 완료 조건 (2) > 출력 형식 (1, unanimous).
const SCOPE_MAX_COMMITTEE: Committee = {
  members: [
    {
      member_id: "member-1",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_ALL,
        [AREA_DONE]: DONE_BUN_TEST,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
    {
      member_id: "member-2",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_PART,
        [AREA_DONE]: DONE_BUN_TEST,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
    {
      member_id: "member-3",
      readings: {
        [AREA_SCOPE]: SCOPE_SYMLINK,
        [AREA_DONE]: DONE_BUILD,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
    {
      member_id: "member-4",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_ALL,
        [AREA_DONE]: DONE_BUN_TEST,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
  ],
};

// Committee B — the SAME areas, the ordering swapped:
// 완료 조건 (3 distinct readings) > 삭제 범위 (2) > 출력 형식 (1, unanimous).
// A target fixed to one area cannot satisfy both fixtures.
const DONE_MAX_COMMITTEE: Committee = {
  members: [
    {
      member_id: "member-1",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_ALL,
        [AREA_DONE]: DONE_BUN_TEST,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
    {
      member_id: "member-2",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_ALL,
        [AREA_DONE]: DONE_BUILD,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
    {
      member_id: "member-3",
      readings: {
        [AREA_SCOPE]: SCOPE_SYMLINK,
        [AREA_DONE]: DONE_USER_APPROVAL,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
    {
      member_id: "member-4",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_ALL,
        [AREA_DONE]: DONE_BUN_TEST,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
  ],
};

// Committee C — every member reads every area identically: zero disagreement.
const UNANIMOUS_COMMITTEE: Committee = {
  members: [
    {
      member_id: "member-1",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_ALL,
        [AREA_DONE]: DONE_BUN_TEST,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
    {
      member_id: "member-2",
      readings: {
        [AREA_SCOPE]: SCOPE_MOVE_ALL,
        [AREA_DONE]: DONE_BUN_TEST,
        [AREA_OUTPUT]: OUTPUT_KOREAN_SUMMARY,
      },
    },
  ],
};

function memberIds(committee: Committee): string[] {
  return committee.members.map((member) => member.member_id).sort();
}

function fixtureReading(committee: Committee, memberId: string, area: string): string {
  const member = committee.members.find((m) => m.member_id === memberId);
  if (!member) throw new Error(`pointer references an unknown member: ${memberId}`);
  const reading = member.readings[area];
  if (reading === undefined) {
    throw new Error(`fixture has no reading for ${memberId} in area ${area}`);
  }
  return reading;
}

function buildMap(committee: Committee): DisagreementMap {
  return buildDisagreementMap(committee) as DisagreementMap;
}

function distinctReadings(entry: AreaEntry): Set<string> {
  return new Set(entry.pointers.map((pointer) => pointer.reading));
}

// Diagnosis-routing labels required verbatim by the criterion statement:
// consensus-but-wrong → 검증 라우팅, disagreement → 추출 문제.
const VERIFICATION_ROUTE = "검증 라우팅";
const EXTRACTION_PROBLEM_ROUTE = "추출 문제";
const DEFINED_ROUTES = [VERIFICATION_ROUTE, EXTRACTION_PROBLEM_ROUTE];

// Diagnosis inputs are FIXTURE-FIXED tags (tag emission → pure gate routing,
// isomorphic to ac-35): 'consensus-but-wrong' = all members agreed but the
// shared reading is tagged as conflicting with an external verification
// signal; 'disagreement' = member outputs diverged. Whether the tag is TRUE
// of a real committee is residual and NOT judged here.
const DIAGNOSIS_TAGS = ["consensus-but-wrong", "disagreement"] as const;
const CONSENSUS_BUT_WRONG_DIAGNOSIS = { tag: "consensus-but-wrong" } as const;
const DISAGREEMENT_DIAGNOSIS = { tag: "disagreement" } as const;
// Outside the two-tag domain: a plausible-looking third diagnosis that the
// router must NOT silently absorb into one of the two branches.
const OUT_OF_DOMAIN_TAG = "sampling-noise";

describe("ac-F1 clause 1 — a per-area disagreement map is produced from committee output (a map, not a score)", () => {
  test("the multi-member committee fixture parses as committee output with readings preserved verbatim", () => {
    const parsed = committeeOutputSchema.safeParse(SCOPE_MAX_COMMITTEE);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the committee fixture to parse");
    expect(parsed.data.members.length).toBe(4);
    expect(parsed.data.members[1].member_id).toBe("member-2");
    expect(parsed.data.members[1].readings[AREA_SCOPE]).toBe(SCOPE_MOVE_PART);
    expect(parsed.data.members[2].readings[AREA_DONE]).toBe(DONE_BUILD);
    expect(parsed.data.members[3].readings[AREA_OUTPUT]).toBe(OUTPUT_KOREAN_SUMMARY);
  });

  test("committee output is fail-closed at the top level — no members, a non-array members, a single-member 'committee'", () => {
    expect(committeeOutputSchema.safeParse({}).success).toBe(false);
    expect(committeeOutputSchema.safeParse({ members: "member-1" }).success).toBe(false);
    expect(committeeOutputSchema.safeParse({ members: {} }).success).toBe(false);
    // 복수 위원의 산출 — a committee of zero or one cannot disagree.
    expect(committeeOutputSchema.safeParse({ members: [] }).success).toBe(false);
    expect(
      committeeOutputSchema.safeParse({ members: [SCOPE_MAX_COMMITTEE.members[0]] }).success,
    ).toBe(false);
  });

  test("committee output is fail-closed inside each member — the member shape is actually modelled", () => {
    const good = SCOPE_MAX_COMMITTEE.members[0];
    const reject = (member: unknown) =>
      committeeOutputSchema.safeParse({ members: [good, member] }).success;

    // member_id missing / not a string.
    expect(reject({ readings: { [AREA_SCOPE]: SCOPE_MOVE_PART } })).toBe(false);
    expect(reject({ member_id: 7, readings: { [AREA_SCOPE]: SCOPE_MOVE_PART } })).toBe(false);
    // readings missing / not a record / null.
    expect(reject({ member_id: "member-2" })).toBe(false);
    expect(reject({ member_id: "member-2", readings: SCOPE_MOVE_PART })).toBe(false);
    expect(reject({ member_id: "member-2", readings: null })).toBe(false);
    // a reading that is not a verbatim string.
    expect(reject({ member_id: "member-2", readings: { [AREA_SCOPE]: 42 } })).toBe(false);
  });

  test("the map is keyed by EXACTLY the diverging areas — the unanimous area gets no entry", () => {
    const map = buildMap(SCOPE_MAX_COMMITTEE);

    expect(Object.keys(map.areas).sort()).toEqual([AREA_SCOPE, AREA_DONE].sort());
    expect(map.areas[AREA_OUTPUT]).toBeUndefined();
  });

  test("a committee that agrees everywhere yields an EMPTY map — disagreement, not a readings index", () => {
    const map = buildMap(UNANIMOUS_COMMITTEE);

    expect(Object.keys(map.areas)).toEqual([]);
    // The empty map is still a well-formed disagreement map (consensus case).
    expect(disagreementMapSchema.safeParse(map).success).toBe(true);
  });

  test("each area entry points at THAT area's member outputs — every member once, readings verbatim", () => {
    for (const committee of [SCOPE_MAX_COMMITTEE, DONE_MAX_COMMITTEE]) {
      const map = buildMap(committee);

      for (const area of Object.keys(map.areas)) {
        const pointers = map.areas[area].pointers;
        // Real members, each covered exactly once — pointers scoped to the area.
        expect(pointers.map((pointer) => pointer.member_id).sort()).toEqual(memberIds(committee));
        for (const pointer of pointers) {
          expect(pointer.reading).toBe(fixtureReading(committee, pointer.member_id, area));
        }
      }
    }
  });

  test("per-area disagreement magnitude is captured, and it follows the fixture rather than the area name", () => {
    const scopeMaxMap = buildMap(SCOPE_MAX_COMMITTEE);
    const doneMaxMap = buildMap(DONE_MAX_COMMITTEE);

    // Committee A: 삭제 범위 3 distinct readings, 완료 조건 2.
    expect(distinctReadings(scopeMaxMap.areas[AREA_SCOPE]).size).toBe(3);
    expect(distinctReadings(scopeMaxMap.areas[AREA_DONE]).size).toBe(2);
    // Committee B: the same two areas, the magnitudes swapped.
    expect(distinctReadings(doneMaxMap.areas[AREA_DONE]).size).toBe(3);
    expect(distinctReadings(doneMaxMap.areas[AREA_SCOPE]).size).toBe(2);
  });

  test("score-shaped payloads are rejected at schema parse — at the top level AND per area ('점수 아님')", () => {
    expect(disagreementMapSchema.safeParse(0.42).success).toBe(false);
    expect(disagreementMapSchema.safeParse({ score: 0.42 }).success).toBe(false);
    expect(disagreementMapSchema.safeParse({ disagreement: 3 }).success).toBe(false);
    // The sharp case: an areas map whose per-area values are scalar scores.
    expect(
      disagreementMapSchema.safeParse({ areas: { [AREA_SCOPE]: 0.42, [AREA_DONE]: 0.13 } }).success,
    ).toBe(false);
    expect(
      disagreementMapSchema.safeParse({ areas: { [AREA_SCOPE]: { score: 0.42 } } }).success,
    ).toBe(false);
  });

  test("an area entry whose pointers are not member/reading records is rejected", () => {
    // No pointers at all.
    expect(disagreementMapSchema.safeParse({ areas: { [AREA_SCOPE]: {} } }).success).toBe(false);
    // Bare member ids instead of pointer records.
    expect(
      disagreementMapSchema.safeParse({
        areas: { [AREA_SCOPE]: { pointers: ["member-1", "member-2"] } },
      }).success,
    ).toBe(false);
    // A pointer without the verbatim reading, and one without a member.
    expect(
      disagreementMapSchema.safeParse({
        areas: { [AREA_SCOPE]: { pointers: [{ member_id: "member-1" }] } },
      }).success,
    ).toBe(false);
    expect(
      disagreementMapSchema.safeParse({
        areas: { [AREA_SCOPE]: { pointers: [{ reading: SCOPE_MOVE_ALL }] } },
      }).success,
    ).toBe(false);
    // areas must be a keyed map, not a list.
    expect(disagreementMapSchema.safeParse({ areas: [] }).success).toBe(false);
  });

  test("well-formed maps parse — the built map and a hand-written minimal map (positive controls)", () => {
    expect(disagreementMapSchema.safeParse(buildMap(SCOPE_MAX_COMMITTEE)).success).toBe(true);
    expect(disagreementMapSchema.safeParse(buildMap(DONE_MAX_COMMITTEE)).success).toBe(true);

    const parsed = disagreementMapSchema.safeParse({
      areas: {
        [AREA_SCOPE]: {
          pointers: [
            { member_id: "member-1", reading: SCOPE_MOVE_ALL },
            { member_id: "member-2", reading: SCOPE_MOVE_PART },
          ],
        },
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected the minimal disagreement map to parse");
    expect(parsed.data.areas[AREA_SCOPE].pointers[1].reading).toBe(SCOPE_MOVE_PART);
  });
});

describe("ac-F1 clause 2 — the maximum-disagreement area is the next question target", () => {
  const cases = [
    {
      name: "committee A (삭제 범위 3 > 완료 조건 2 > 출력 형식 1)",
      committee: SCOPE_MAX_COMMITTEE,
      maxArea: AREA_SCOPE,
      nonMaxAreas: [AREA_DONE, AREA_OUTPUT],
    },
    {
      name: "committee B (완료 조건 3 > 삭제 범위 2 > 출력 형식 1)",
      committee: DONE_MAX_COMMITTEE,
      maxArea: AREA_DONE,
      nonMaxAreas: [AREA_SCOPE, AREA_OUTPUT],
    },
  ];

  for (const testCase of cases) {
    test(`the emitted question-target record references the max-disagreement area — ${testCase.name}`, () => {
      const map = buildMap(testCase.committee);
      const target = selectMaxDisagreementTarget(map);

      expect(target.area).toBe(testCase.maxArea);
      // The target must name an area the map actually holds.
      expect(Object.keys(map.areas)).toContain(target.area);
    });

    test(`a non-max area is never the target — ${testCase.name}`, () => {
      const target = selectMaxDisagreementTarget(buildMap(testCase.committee));

      for (const area of testCase.nonMaxAreas) {
        expect(target.area).not.toBe(area);
      }
    });
  }

  test("the target follows the fixture, not a fixed area — the two committees select different areas", () => {
    const scopeMaxTarget = selectMaxDisagreementTarget(buildMap(SCOPE_MAX_COMMITTEE));
    const doneMaxTarget = selectMaxDisagreementTarget(buildMap(DONE_MAX_COMMITTEE));

    expect(scopeMaxTarget.area).not.toBe(doneMaxTarget.area);
    expect([scopeMaxTarget.area, doneMaxTarget.area].sort()).toEqual(
      [AREA_SCOPE, AREA_DONE].sort(),
    );
  });

  test("the same input repeated yields the same target (deterministic selection, no model call)", () => {
    for (const committee of [SCOPE_MAX_COMMITTEE, DONE_MAX_COMMITTEE]) {
      const map = buildMap(committee);
      const first = selectMaxDisagreementTarget(map);
      const second = selectMaxDisagreementTarget(map);

      expect(second).toEqual(first);
    }
  });
});

describe("ac-F1 clause 3 — diagnosis fork routing is a pure function of the diagnosis input", () => {
  test("consensus-but-wrong (all agreed, tagged wrong by an external signal) routes to '검증 라우팅'", () => {
    const routed = routeDiagnosis(CONSENSUS_BUT_WRONG_DIAGNOSIS);

    expect(routed.route).toBe(VERIFICATION_ROUTE);
  });

  test("disagreement (member outputs diverged) routes to the extraction problem — '추출 문제'", () => {
    const routed = routeDiagnosis(DISAGREEMENT_DIAGNOSIS);

    expect(routed.route).toBe(EXTRACTION_PROBLEM_ROUTE);
  });

  test("the two contrast fixtures land on two DIFFERENT branches", () => {
    const verificationRouted = routeDiagnosis(CONSENSUS_BUT_WRONG_DIAGNOSIS);
    const extractionRouted = routeDiagnosis(DISAGREEMENT_DIAGNOSIS);

    expect(verificationRouted.route).not.toBe(extractionRouted.route);
  });

  test("routing is deterministic — the same input repeated yields the same branch (no model call)", () => {
    for (const tag of DIAGNOSIS_TAGS) {
      const first = routeDiagnosis({ tag });
      const second = routeDiagnosis({ tag });

      expect(second).toEqual(first);
    }
  });

  test("an input outside the two-tag domain does not leak into either branch — it is refused, naming the tag", () => {
    // A silent fallthrough into '추출 문제' (or '검증 라우팅') would pass a
    // containment check; refusal is what keeps the fork to exactly two paths.
    expect(() => routeDiagnosis({ tag: OUT_OF_DOMAIN_TAG })).toThrow(OUT_OF_DOMAIN_TAG);
    expect(() => routeDiagnosis({ tag: "" })).toThrow();
    expect(() => routeDiagnosis({})).toThrow();
    expect(() => routeDiagnosis(undefined)).toThrow();
  });

  test("the in-domain tags are the only inputs that produce a route, and both routes are defined ones", () => {
    const routes = DIAGNOSIS_TAGS.map((tag) => routeDiagnosis({ tag }).route);

    for (const route of routes) {
      expect(DEFINED_ROUTES).toContain(route);
    }
    // Both defined branches are reachable — neither collapses into the other.
    expect(routes.slice().sort()).toEqual(DEFINED_ROUTES.slice().sort());
  });
});
