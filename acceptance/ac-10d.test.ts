/**
 * ac-10d acceptance — Hirsch 4-criteria interpretation verification (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10d.json), covered clauses:
 *  (1) existence — the round-0 reading output carries a hirsch_criteria
 *      verification checklist with exactly one verdict item for each of the
 *      four criteria 문법·대응·장르·정합; fewer than four items, a missing
 *      criterion, an unknown criterion, or a duplicate criterion is rejected
 *      by the reading OUTPUT schema itself (not only by the sub-parser)
 *  (2) completeness — every one of the four verdict content fields is
 *      non-empty; a single empty (or whitespace-only) verdict, or an item with
 *      no verdict field at all, rejects the whole reading output
 *  (3) separation field — the same reading output carries
 *      meaning_vs_my_position where the request's meaning and the agent's own
 *      position exist as two structurally separate sub-fields (meaning /
 *      my_position); a merged single-text field or a missing sub-field is
 *      rejected by the reading output schema
 *  (4) fixture contrast — a reading output holding the agent-position
 *      sentence "rebuild 아직 안 됐는데" in the position sub-field passes the
 *      output schema (all field values preserved verbatim), while the same
 *      output with meaning_vs_my_position removed entirely is rejected
 *
 * Every rejection asserted against the standalone verification sub-parser is
 * mirrored against parseRound0Reading, so the reading output schema cannot be
 * a loose shell that delegates nothing: the two modules must actually compose.
 *
 * Residual (NOT tested here, per row residual):
 *  - Whether the 대응 (correspondence) and 정합 (coherence) verdict contents
 *    are actually correct — the contract itself declares this residual; this
 *    file closes only existence + non-emptiness of the four verdicts.
 *  - The semantic accuracy of the meaning/position classification — whether a
 *    given sentence (e.g. "rebuild 아직 안 됐는데") truly is agent position
 *    rather than request meaning is a human-judged predicate; this file
 *    enforces the separated structure only.
 */
import { describe, expect, test } from "bun:test";
import {
  HIRSCH_CRITERIA,
  parseHirschVerification,
} from "../src/interview/reading/hirsch-verification";
import { parseRound0Reading, sampleRound0Reading } from "../src/interview/reading/round0-reading";

type ChecklistItem = { criterion: string; verdict: string };

const checklistItem = (criterion: string, verdict: string): ChecklistItem => ({
  criterion,
  verdict,
});

const grammarVerdict = "요청 문장은 문법적으로 성립하는 한국어 지시문이다";
const correspondenceVerdict = "독해가 요청 텍스트의 모든 내용 토큰에 대응한다";
const genreVerdict = "요청은 빌드 지시 장르로 읽는 것이 타당하다";
const coherenceVerdict = "독해 내부 판정들 사이에 모순이 없다";

const validChecklist: ReadonlyArray<ChecklistItem> = [
  checklistItem("문법", grammarVerdict),
  checklistItem("대응", correspondenceVerdict),
  checklistItem("장르", genreVerdict),
  checklistItem("정합", coherenceVerdict),
];

const expectedVerdicts: Record<string, string> = {
  문법: grammarVerdict,
  대응: correspondenceVerdict,
  장르: genreVerdict,
  정합: coherenceVerdict,
};

const agentPositionSentence = "rebuild 아직 안 됐는데";
const requestMeaning = "산출물을 다시 빌드해 달라는 요청이다";

const validSeparation = {
  meaning: requestMeaning,
  my_position: agentPositionSentence,
};

const validVerification = {
  hirsch_criteria: validChecklist.map((item) => ({ ...item })),
  meaning_vs_my_position: { ...validSeparation },
};

/** criterion -> verdict, order-independent and duplicate-collapsing. */
const verdictsOf = (items: ReadonlyArray<ChecklistItem>): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.criterion, item.verdict]));

/** Rejection must name the offending field, not just blow up anonymously. */
const expectRejection = (run: () => unknown, fieldFragment: string): void => {
  let thrown: unknown;
  try {
    run();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(Error);
  expect(String(thrown)).toContain(fieldFragment);
};

// --- broken checklists, reused against BOTH the sub-parser and the output ---

const missingGenre = validChecklist.filter((item) => item.criterion !== "장르");

const duplicatedGrammar: ReadonlyArray<ChecklistItem> = [
  checklistItem("문법", grammarVerdict),
  checklistItem("문법", "같은 기준에 대한 두 번째 판정"),
  checklistItem("대응", correspondenceVerdict),
  checklistItem("장르", genreVerdict),
];

const fiveWithDuplicate: ReadonlyArray<ChecklistItem> = [
  ...validChecklist,
  checklistItem("대응", "중복 대응 판정"),
];

const unknownCriterion = validChecklist.map((item) =>
  item.criterion === "장르" ? checklistItem("문체", item.verdict) : item,
);

const emptyCorrespondence = validChecklist.map((item) =>
  item.criterion === "대응" ? checklistItem("대응", "") : item,
);

const blankCoherence = validChecklist.map((item) =>
  item.criterion === "정합" ? checklistItem("정합", "   ") : item,
);

const verdictFieldDropped = validChecklist.map((item) =>
  item.criterion === "문법" ? { criterion: "문법" } : { ...item },
);

const mergedSeparation = `${requestMeaning} — ${agentPositionSentence}`;

const withChecklist = (items: ReadonlyArray<unknown>) => ({
  ...validVerification,
  hirsch_criteria: [...items],
});

const withSeparation = (separation: unknown) => ({
  ...validVerification,
  meaning_vs_my_position: separation,
});

describe("ac-10d clause 1 — hirsch_criteria exists with exactly one verdict per criterion", () => {
  test("the fixed criterion vocabulary is 문법·대응·장르·정합", () => {
    expect([...HIRSCH_CRITERIA]).toEqual(["문법", "대응", "장르", "정합"]);
  });

  test("a checklist with exactly one verdict per criterion parses verbatim", () => {
    const parsed = parseHirschVerification(validVerification);

    expect(parsed.hirsch_criteria.length).toBe(4);
    expect(verdictsOf(parsed.hirsch_criteria)).toEqual(expectedVerdicts);
  });

  test("three items (장르 missing) are rejected", () => {
    expectRejection(() => parseHirschVerification(withChecklist(missingGenre)), "hirsch_criteria");
  });

  test("four items where a duplicate criterion displaces another are rejected", () => {
    expectRejection(
      () => parseHirschVerification(withChecklist(duplicatedGrammar)),
      "hirsch_criteria",
    );
  });

  test("five items — all four criteria plus a duplicate — are rejected", () => {
    expectRejection(
      () => parseHirschVerification(withChecklist(fiveWithDuplicate)),
      "hirsch_criteria",
    );
  });

  test("an unknown criterion in place of 장르 is rejected", () => {
    expectRejection(
      () => parseHirschVerification(withChecklist(unknownCriterion)),
      "hirsch_criteria",
    );
  });
});

describe("ac-10d clause 2 — every criterion verdict is non-empty (existence + completeness)", () => {
  test("the valid parse carries each criterion's verdict content verbatim", () => {
    const parsed = parseHirschVerification(validVerification);
    const verdicts = verdictsOf(parsed.hirsch_criteria);

    expect(Object.keys(verdicts).sort()).toEqual([...HIRSCH_CRITERIA].sort());
    expect(Object.values(verdicts).sort()).toEqual(
      [grammarVerdict, correspondenceVerdict, genreVerdict, coherenceVerdict].sort(),
    );
  });

  test("one empty verdict (대응) rejects the whole verification", () => {
    expectRejection(
      () => parseHirschVerification(withChecklist(emptyCorrespondence)),
      "hirsch_criteria",
    );
  });

  test("a whitespace-only verdict (정합) is rejected as empty", () => {
    expectRejection(
      () => parseHirschVerification(withChecklist(blankCoherence)),
      "hirsch_criteria",
    );
  });

  test("an item carrying no verdict field at all is rejected", () => {
    expectRejection(
      () => parseHirschVerification(withChecklist(verdictFieldDropped)),
      "hirsch_criteria",
    );
  });
});

describe("ac-10d clause 3 — meaning_vs_my_position is two structurally separate sub-fields", () => {
  test("meaning and my_position are preserved verbatim as separate sub-fields", () => {
    const parsed = parseHirschVerification(validVerification);

    expect(parsed.meaning_vs_my_position.meaning).toBe(requestMeaning);
    expect(parsed.meaning_vs_my_position.my_position).toBe(agentPositionSentence);
  });

  test("a merged single-text field is rejected", () => {
    expectRejection(
      () => parseHirschVerification(withSeparation(mergedSeparation)),
      "meaning_vs_my_position",
    );
  });

  test("a missing my_position sub-field is rejected", () => {
    expectRejection(
      () => parseHirschVerification(withSeparation({ meaning: requestMeaning })),
      "meaning_vs_my_position",
    );
  });

  test("a missing meaning sub-field is rejected", () => {
    expectRejection(
      () => parseHirschVerification(withSeparation({ my_position: agentPositionSentence })),
      "meaning_vs_my_position",
    );
  });
});

describe("ac-10d clause 4 — the round-0 reading OUTPUT schema enforces the whole verification", () => {
  const readingWithVerification = {
    ...sampleRound0Reading,
    hirsch_criteria: validChecklist.map((item) => ({ ...item })),
    meaning_vs_my_position: { ...validSeparation },
  };

  const readingWith = (patch: Record<string, unknown>) => ({
    ...readingWithVerification,
    ...patch,
  });

  test("fixture A: the agent-position sentence in the position field passes the output schema", () => {
    const parsed = parseRound0Reading(readingWithVerification);

    expect(parsed.hirsch_criteria.length).toBe(4);
    expect(verdictsOf(parsed.hirsch_criteria)).toEqual(expectedVerdicts);
    expect(parsed.meaning_vs_my_position.meaning).toBe(requestMeaning);
    expect(parsed.meaning_vs_my_position.my_position).toBe(agentPositionSentence);
  });

  test("fixture B: the same output without meaning_vs_my_position is rejected", () => {
    const { meaning_vs_my_position: _dropped, ...withoutSeparation } = readingWithVerification;

    expectRejection(() => parseRound0Reading(withoutSeparation), "meaning_vs_my_position");
  });

  test("an output without hirsch_criteria at all is rejected", () => {
    const { hirsch_criteria: _dropped, ...withoutChecklist } = readingWithVerification;

    expectRejection(() => parseRound0Reading(withoutChecklist), "hirsch_criteria");
  });

  test("an output whose checklist has only three items is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ hirsch_criteria: missingGenre })),
      "hirsch_criteria",
    );
  });

  test("an output whose checklist duplicates 문법 (four items) is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ hirsch_criteria: duplicatedGrammar })),
      "hirsch_criteria",
    );
  });

  test("an output whose checklist has five items with a duplicate 대응 is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ hirsch_criteria: fiveWithDuplicate })),
      "hirsch_criteria",
    );
  });

  test("an output whose checklist carries the unknown criterion 문체 is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ hirsch_criteria: unknownCriterion })),
      "hirsch_criteria",
    );
  });

  test("an output with one empty verdict (대응) is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ hirsch_criteria: emptyCorrespondence })),
      "hirsch_criteria",
    );
  });

  test("an output with a whitespace-only verdict (정합) is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ hirsch_criteria: blankCoherence })),
      "hirsch_criteria",
    );
  });

  test("an output whose 문법 item has no verdict field is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ hirsch_criteria: verdictFieldDropped })),
      "hirsch_criteria",
    );
  });

  test("an output whose meaning_vs_my_position is one merged text is rejected", () => {
    expectRejection(
      () => parseRound0Reading(readingWith({ meaning_vs_my_position: mergedSeparation })),
      "meaning_vs_my_position",
    );
  });

  test("an output whose meaning_vs_my_position lacks my_position is rejected", () => {
    expectRejection(
      () =>
        parseRound0Reading(readingWith({ meaning_vs_my_position: { meaning: requestMeaning } })),
      "meaning_vs_my_position",
    );
  });

  test("an output whose meaning_vs_my_position lacks meaning is rejected", () => {
    expectRejection(
      () =>
        parseRound0Reading(
          readingWith({ meaning_vs_my_position: { my_position: agentPositionSentence } }),
        ),
      "meaning_vs_my_position",
    );
  });
});
