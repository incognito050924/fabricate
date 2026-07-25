/**
 * ac-10b acceptance — charity tournament (Davidson+Schleiermacher+RSA) (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10b.json), covered clauses:
 *  (1) the reading output carries candidate_readings[] and every item carries an
 *      elimination_reason field; schema parsing is fail-closed — an item missing
 *      the field makes the whole output rejected, never silently accepted
 *  (2) survivor-count routing is deterministic — survivors>=2 emits question
 *      candidates, ==1 returns a proceed routing with no question emission and
 *      no reread, ==0 sets reread_triggered=true; one fixture per branch, and
 *      the same survivor count always lands on the same branch
 *  (3) language_parse_set and user_parse_set both exist in the output together
 *      with their intersection/diff computation; when the diff is non-empty,
 *      each mismatch item is emitted verbatim as a question target
 *  (4) every candidate_readings item carries a numeric rsa_speaker_score
 *      (S-hat(u|m)) field and the elimination transcript artifact exists;
 *      a missing/non-numeric score is rejected fail-closed
 *
 * Residual (NOT tested here, per row residual):
 *  - Whether an elimination_reason's prose actually justifies eliminating that
 *    reading — the contract declares the reason's content residual; this file
 *    closes field presence (and verbatim preservation through parsing) only.
 *  - Whether rsa_speaker_score values are correctly computed as the RSA
 *    counterfactual speaker score S-hat(u|m) — the contract requires field
 *    existence only, so only the presence of a numeric field is asserted.
 *  - Content completeness of the candidate reading set and of the two parse
 *    sets (whether every live reading/parse was enumerated) — fixtures fix the
 *    sets; only existence, set operations, and routing are asserted.
 *
 * Convention fixed by this file: a candidate whose elimination_reason is null
 * is a survivor; a string reason marks an eliminated candidate. The field must
 * be present (null included) on every item.
 */
import { describe, expect, test } from "bun:test";
import { parseCharityTournament } from "../src/interview/reading/charity-tournament";
import { compareParseSets } from "../src/interview/reading/parse-sets";
import { parseRound0ReadingOutput } from "../src/interview/reading/round0-reading";
import { validateRsaScores } from "../src/interview/reading/rsa-score";
import { routeBySurvivorCount } from "../src/interview/reading/survivor-routing";

// ---------------------------------------------------------------------------
// Fixtures — round-0 unified reading pass outputs, fixed as data (oracle: the
// test pins the pass output and asserts existence / set ops / routing only).
// Request under reading: "설정 파일을 새 스키마로 대체해줘".
// ---------------------------------------------------------------------------

const twoSurvivorTournament = {
  candidate_readings: [
    {
      reading: "기존 설정 파일을 삭제하고 새 스키마 형식의 파일로 교체한다",
      elimination_reason: null,
      rsa_speaker_score: 0.42,
    },
    {
      reading: "기존 파일을 유지한 채 내용만 새 스키마로 다시 쓴다",
      elimination_reason: null,
      rsa_speaker_score: 0.38,
    },
    {
      reading: "스키마 문서만 갱신하고 설정 파일은 손대지 않는다",
      elimination_reason: "요청 동사 '대체'와 양립 불가: 대상 파일에 아무 변경이 없는 독해",
      rsa_speaker_score: 0.07,
    },
    {
      reading: "새 스키마 파일을 추가로 만들고 기존 파일도 남겨 둔다",
      elimination_reason: "'대체'의 완수 종점(기존 것이 더는 쓰이지 않음)에 도달하지 못하는 독해",
      rsa_speaker_score: 0.13,
    },
  ],
} as const;

// Different readings, same survivor count (2) — used for the determinism check.
const otherTwoSurvivorTournament = {
  candidate_readings: [
    {
      reading: "테스트 픽스처를 프로덕션 스키마로 승격한다",
      elimination_reason: null,
      rsa_speaker_score: 0.51,
    },
    {
      reading: "프로덕션 스키마를 테스트 픽스처에 복사한다",
      elimination_reason: null,
      rsa_speaker_score: 0.44,
    },
    {
      reading: "둘 다 삭제하고 처음부터 다시 만든다",
      elimination_reason: "요청에 없는 파괴적 행위를 도입하는 독해",
      rsa_speaker_score: 0.05,
    },
  ],
} as const;

const oneSurvivorTournament = {
  candidate_readings: [
    {
      reading: "기존 설정 파일을 삭제하고 새 스키마 형식의 파일로 교체한다",
      elimination_reason: null,
      rsa_speaker_score: 0.72,
    },
    {
      reading: "스키마 문서만 갱신하고 설정 파일은 손대지 않는다",
      elimination_reason: "요청 동사 '대체'와 양립 불가: 대상 파일에 아무 변경이 없는 독해",
      rsa_speaker_score: 0.09,
    },
    {
      reading: "새 스키마 파일을 추가로 만들고 기존 파일도 남겨 둔다",
      elimination_reason: "'대체'의 완수 종점에 도달하지 못하는 독해",
      rsa_speaker_score: 0.19,
    },
  ],
} as const;

const zeroSurvivorTournament = {
  candidate_readings: [
    {
      reading: "스키마 문서만 갱신하고 설정 파일은 손대지 않는다",
      elimination_reason: "요청 동사 '대체'와 양립 불가: 대상 파일에 아무 변경이 없는 독해",
      rsa_speaker_score: 0.11,
    },
    {
      reading: "새 스키마 파일을 추가로 만들고 기존 파일도 남겨 둔다",
      elimination_reason: "'대체'의 완수 종점에 도달하지 못하는 독해",
      rsa_speaker_score: 0.14,
    },
  ],
} as const;

// Parse-set fixtures: what the language allows vs what this user plausibly means.
const mismatchedParseSets = {
  language_parse_set: ["설정 파일 전체 교체", "설정 값 부분 갱신"],
  user_parse_set: ["설정 파일 전체 교체", "스키마 마이그레이션 스크립트 실행"],
} as const;

const agreeingParseSets = {
  language_parse_set: ["설정 파일 전체 교체"],
  user_parse_set: ["설정 파일 전체 교체"],
} as const;

const validReadingArtifact = {
  candidate_readings: twoSurvivorTournament.candidate_readings,
  language_parse_set: mismatchedParseSets.language_parse_set,
  user_parse_set: mismatchedParseSets.user_parse_set,
  parse_comparison: {
    intersection: ["설정 파일 전체 교체"],
    diff: ["설정 값 부분 갱신", "스키마 마이그레이션 스크립트 실행"],
    question_targets: ["설정 값 부분 갱신", "스키마 마이그레이션 스크립트 실행"],
  },
  elimination_transcript:
    "R1: 독해 3 소거 — 파일 무변경 독해는 '대체'와 양립 불가. R2: 독해 4 소거 — 완수 종점 미도달.",
} as const;

describe("ac-10b clause 1 — candidate_readings schema: elimination_reason is mandatory, fail-closed", () => {
  test("a complete tournament parses and preserves every candidate verbatim", () => {
    const result = parseCharityTournament(twoSurvivorTournament);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.tournament.candidate_readings.length).toBe(4);
    // Every item carries the elimination_reason field (null = survivor counts
    // as present; the FIELD must exist on each item).
    for (const candidate of result.tournament.candidate_readings) {
      expect("elimination_reason" in candidate).toBe(true);
    }
    // Verbatim preservation through the parse — reasons are not rewritten.
    expect(result.tournament.candidate_readings.map((c: { reading: string }) => c.reading)).toEqual(
      twoSurvivorTournament.candidate_readings.map((c) => c.reading),
    );
    expect(result.tournament.candidate_readings[2]?.elimination_reason).toBe(
      "요청 동사 '대체'와 양립 불가: 대상 파일에 아무 변경이 없는 독해",
    );
  });

  test("an item missing the elimination_reason field makes the whole output rejected", () => {
    const missingField = {
      candidate_readings: [
        twoSurvivorTournament.candidate_readings[0],
        {
          // No elimination_reason key at all — schema must refuse the output.
          reading: "필드가 누락된 독해",
          rsa_speaker_score: 0.2,
        },
      ],
    };

    const result = parseCharityTournament(missingField);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.reason).toContain("elimination_reason");
  });
});

describe("ac-10b clause 2 — survivor-count routing is deterministic", () => {
  test("survivors >= 2 emits question candidates", () => {
    const routing = routeBySurvivorCount(twoSurvivorTournament);

    expect(routing.branch).toBe("emit_question_candidates");
    if (routing.branch !== "emit_question_candidates") throw new Error("unreachable");
    expect(routing.survivor_count).toBe(2);
    expect(routing.reread_triggered).toBe(false);
    expect(Array.isArray(routing.question_candidates)).toBe(true);
    expect(routing.question_candidates.length).toBeGreaterThan(0);
    for (const candidate of routing.question_candidates) {
      expect(typeof candidate).toBe("string");
      expect(candidate.length).toBeGreaterThan(0);
    }
  });

  test("survivors == 1 proceeds: no question emission, no reread", () => {
    const routing = routeBySurvivorCount(oneSurvivorTournament);

    expect(routing.branch).toBe("proceed");
    expect(routing.survivor_count).toBe(1);
    expect(routing.reread_triggered).toBe(false);
    expect("question_candidates" in routing).toBe(false);
  });

  test("survivors == 0 sets reread_triggered=true", () => {
    const routing = routeBySurvivorCount(zeroSurvivorTournament);

    expect(routing.branch).toBe("reread");
    expect(routing.survivor_count).toBe(0);
    expect(routing.reread_triggered).toBe(true);
    expect("question_candidates" in routing).toBe(false);
  });

  test("routing is deterministic: same input twice yields the identical routing", () => {
    const first = routeBySurvivorCount(twoSurvivorTournament);
    const second = routeBySurvivorCount(twoSurvivorTournament);

    expect(second).toEqual(first);
  });

  test("routing depends on survivor count alone: a different tournament with 2 survivors lands on the same branch", () => {
    const routing = routeBySurvivorCount(otherTwoSurvivorTournament);

    expect(routing.branch).toBe("emit_question_candidates");
    expect(routing.survivor_count).toBe(2);
  });
});

describe("ac-10b clause 3 — language/user parse sets: intersection, diff, mismatch = question target", () => {
  test("intersection and diff are computed from the two sets", () => {
    const comparison = compareParseSets(mismatchedParseSets);

    expect([...comparison.intersection].sort()).toEqual(["설정 파일 전체 교체"]);
    expect([...comparison.diff].sort()).toEqual(
      ["설정 값 부분 갱신", "스키마 마이그레이션 스크립트 실행"].sort(),
    );
  });

  test("a non-empty diff emits each mismatch item verbatim as a question target", () => {
    const comparison = compareParseSets(mismatchedParseSets);

    expect(comparison.question_targets.length).toBe(2);
    expect([...comparison.question_targets].sort()).toEqual(
      ["설정 값 부분 갱신", "스키마 마이그레이션 스크립트 실행"].sort(),
    );
  });

  test("agreeing sets produce an empty diff and no question targets", () => {
    const comparison = compareParseSets(agreeingParseSets);

    expect(comparison.diff).toEqual([]);
    expect(comparison.question_targets).toEqual([]);
    expect([...comparison.intersection].sort()).toEqual(["설정 파일 전체 교체"]);
  });

  test("both sets and their comparison exist in the round-0 reading output", () => {
    const result = parseRound0ReadingOutput(validReadingArtifact);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.artifact.language_parse_set).toEqual([
      "설정 파일 전체 교체",
      "설정 값 부분 갱신",
    ]);
    expect(result.artifact.user_parse_set).toEqual([
      "설정 파일 전체 교체",
      "스키마 마이그레이션 스크립트 실행",
    ]);
    expect(Array.isArray(result.artifact.parse_comparison.intersection)).toBe(true);
    expect(Array.isArray(result.artifact.parse_comparison.diff)).toBe(true);
  });

  test("an output missing user_parse_set is rejected fail-closed", () => {
    const { user_parse_set: _dropped, ...withoutUserSet } = validReadingArtifact;

    const result = parseRound0ReadingOutput(withoutUserSet);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.reason).toContain("user_parse_set");
  });
});

describe("ac-10b clause 4 — per-candidate rsa_speaker_score and the elimination transcript", () => {
  test("every candidate carries a numeric rsa_speaker_score field, preserved verbatim", () => {
    const result = parseRound0ReadingOutput(validReadingArtifact);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    for (const candidate of result.artifact.candidate_readings) {
      expect(typeof candidate.rsa_speaker_score).toBe("number");
      expect(Number.isFinite(candidate.rsa_speaker_score)).toBe(true);
    }
    expect(
      result.artifact.candidate_readings.map(
        (c: { rsa_speaker_score: number }) => c.rsa_speaker_score,
      ),
    ).toEqual([0.42, 0.38, 0.07, 0.13]);
  });

  test("a candidate with a non-numeric score fails score validation", () => {
    const verdict = validateRsaScores([
      { reading: "정상 후보", rsa_speaker_score: 0.5 },
      { reading: "문자열 점수 후보", rsa_speaker_score: "0.5" },
    ]);

    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("unreachable");
    expect(verdict.reason).toContain("rsa_speaker_score");
  });

  test("a candidate missing the score field fails score validation", () => {
    const verdict = validateRsaScores([{ reading: "점수 필드가 없는 후보" }]);

    expect(verdict.ok).toBe(false);
  });

  test("valid numeric scores pass score validation", () => {
    const verdict = validateRsaScores([...twoSurvivorTournament.candidate_readings]);

    expect(verdict.ok).toBe(true);
  });

  test("the elimination transcript artifact exists in the reading output", () => {
    const result = parseRound0ReadingOutput(validReadingArtifact);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(typeof result.artifact.elimination_transcript).toBe("string");
    expect(result.artifact.elimination_transcript.length).toBeGreaterThan(0);
  });

  test("an output missing the elimination transcript is rejected fail-closed", () => {
    const { elimination_transcript: _dropped, ...withoutTranscript } = validReadingArtifact;

    const result = parseRound0ReadingOutput(withoutTranscript);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.reason).toContain("elimination_transcript");
  });
});
