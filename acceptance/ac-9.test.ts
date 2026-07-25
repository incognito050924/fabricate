/**
 * ac-9 acceptance — finalize accepts only wording that passed the
 * session-blind preservation judgment (fail-closed). Red-frozen.
 *
 * Oracle (gate-a/rows/ac-9.json), covered clauses:
 *  (1) fail-closed rejections, 3 kinds:
 *      - fixture without synthesis_provenance -> FinalizeResult rejection
 *        variant kind='missing_synthesis_provenance', no intent artifact is
 *        recorded, and the CLI finalize arm exits with a non-zero code
 *      - fixture without preservation_judgment -> finalize rejects
 *        (and records no intent)
 *      - fixture with preservation_judgment.verdict='fail' ->
 *        kind='preservation_failed' rejection variant (and records no intent)
 *  (2) pass path: verdict='pass' fixture -> finalize proceeds (accepted, not
 *      a rejection variant); the CLI arm exits 0 as the deterministic
 *      contrast to clause 1
 *  (3) judgment brief shape: the brief artifact carries only source_request
 *      (byte-equal verbatim to the original request), the candidate
 *      statement, and the judge_context tag; the zod schema rejects a
 *      questions[] field, rejects a dimension_notes field, and rejects
 *      judge_context='driver'; the passing fixture observes
 *      judge_context !== 'driver'
 *  (4) resynthesis routing: verdict='fail' routes to a fresh-resynthesis
 *      request variant carrying source_request verbatim; a driver-edit
 *      routing target is absent (asserted as key/variant absence)
 *
 * Residual (NOT tested here, per row residual):
 *  - The accuracy of the preservation judgment itself (whether the candidate
 *    wording actually preserves the original intent) — the judge shares the
 *    driver's model prior, so it is mechanically undecidable; this file
 *    asserts only record-absence -> rejection and fail -> resynthesis
 *    routing.
 *  - The reality of session blindness (whether driver session content
 *    actually leaked into the judge context) — approximated only by the
 *    judge_context field tag and the brief shape checks; actual isolation is
 *    not a machine-checkable subject.
 */
import { describe, expect, test } from "bun:test";
import { runFinalizeCli } from "../src/cli/interview-finalize";
import { createIntentStore, finalize, listRecordedIntents } from "../src/interview/finalize";
import {
  buildPreservationBrief,
  preservationBriefSchema,
} from "../src/interview/preservation-judgment";
import { routeAfterPreservationFail } from "../src/interview/resynthesis";
import { createSynthesisProvenance } from "../src/interview/synthesis-provenance";

// Fixture-fixed records; every assertion below is a deterministic check on
// these fields and on variant tags — no prose grading.
const SOURCE_REQUEST = "레거시 파서를 스트리밍 파서로 완전히 대체해 주세요.";
const CANDIDATE_STATEMENT =
  "레거시 파서 호출 경로를 전부 제거하고 스트리밍 파서가 모든 입력 경로를 처리한다.";

const provenance = createSynthesisProvenance({ author_context: "fresh_synthesizer" });

const blindBrief = buildPreservationBrief({
  source_request: SOURCE_REQUEST,
  candidate_statement: CANDIDATE_STATEMENT,
  judge_context: "blind_judge",
});

const passJudgment = { verdict: "pass", brief: blindBrief } as const;
const failJudgment = { verdict: "fail", brief: blindBrief } as const;

const missingProvenanceFixture = {
  source_request: SOURCE_REQUEST,
  candidate_statement: CANDIDATE_STATEMENT,
  preservation_judgment: passJudgment,
} as const;

const missingJudgmentFixture = {
  source_request: SOURCE_REQUEST,
  candidate_statement: CANDIDATE_STATEMENT,
  synthesis_provenance: provenance,
} as const;

const failVerdictFixture = {
  source_request: SOURCE_REQUEST,
  candidate_statement: CANDIDATE_STATEMENT,
  synthesis_provenance: provenance,
  preservation_judgment: failJudgment,
} as const;

const passFixture = {
  source_request: SOURCE_REQUEST,
  candidate_statement: CANDIDATE_STATEMENT,
  synthesis_provenance: provenance,
  preservation_judgment: passJudgment,
} as const;

describe("ac-9 clause 1 — fail-closed rejections", () => {
  test("missing synthesis_provenance -> missing_synthesis_provenance rejection, no intent recorded", () => {
    const store = createIntentStore();
    const result = finalize(missingProvenanceFixture, store);

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("missing_synthesis_provenance");
    expect(listRecordedIntents(store)).toEqual([]);
  });

  test("CLI finalize arm exits with a non-zero code on missing synthesis_provenance", async () => {
    const { exitCode } = await runFinalizeCli(missingProvenanceFixture);

    expect(exitCode).not.toBe(0);
  });

  test("missing preservation_judgment -> finalize rejects, no intent recorded", () => {
    const store = createIntentStore();
    const result = finalize(missingJudgmentFixture, store);

    expect(result.status).toBe("rejected");
    expect(listRecordedIntents(store)).toEqual([]);
  });

  test("preservation_judgment.verdict='fail' -> preservation_failed rejection, no intent recorded", () => {
    const store = createIntentStore();
    const result = finalize(failVerdictFixture, store);

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("preservation_failed");
    expect(listRecordedIntents(store)).toEqual([]);
  });
});

describe("ac-9 clause 2 — pass path proceeds", () => {
  test("verdict='pass' -> finalize proceeds: accepted, not a rejection variant, intent recorded verbatim", () => {
    const store = createIntentStore();
    const result = finalize(passFixture, store);

    expect(result.status).toBe("accepted");
    expect("rejection" in result).toBe(false);

    const recorded = listRecordedIntents(store);
    expect(recorded.length).toBe(1);
    expect(recorded[0]?.statement).toBe(CANDIDATE_STATEMENT);
  });

  test("CLI finalize arm exits 0 on the passing fixture (contrast to the fail-closed arm)", async () => {
    const { exitCode } = await runFinalizeCli(passFixture);

    expect(exitCode).toBe(0);
  });

  test("the passing fixture observes judge_context !== 'driver'", () => {
    expect(passFixture.preservation_judgment.brief.judge_context).not.toBe("driver");
    expect(passFixture.preservation_judgment.brief.judge_context).toBe("blind_judge");
  });
});

describe("ac-9 clause 3 — preservation brief shape (session-blind by construction)", () => {
  test("brief carries source_request verbatim, the candidate statement, and judge_context — nothing else", () => {
    expect(blindBrief.source_request).toBe(SOURCE_REQUEST);
    expect(blindBrief.candidate_statement).toBe(CANDIDATE_STATEMENT);
    expect(Object.keys(blindBrief).sort()).toEqual([
      "candidate_statement",
      "judge_context",
      "source_request",
    ]);
    expect("questions" in blindBrief).toBe(false);
    expect("dimension_notes" in blindBrief).toBe(false);
  });

  test("zod schema accepts the minimal blind brief (so the rejections below are not vacuous)", () => {
    const parsed = preservationBriefSchema.safeParse({
      source_request: SOURCE_REQUEST,
      candidate_statement: CANDIDATE_STATEMENT,
      judge_context: "blind_judge",
    });

    expect(parsed.success).toBe(true);
  });

  test("zod schema rejects a brief carrying a questions[] field", () => {
    const parsed = preservationBriefSchema.safeParse({
      source_request: SOURCE_REQUEST,
      candidate_statement: CANDIDATE_STATEMENT,
      judge_context: "blind_judge",
      questions: [],
    });

    expect(parsed.success).toBe(false);
  });

  test("zod schema rejects a brief carrying a dimension_notes field", () => {
    const parsed = preservationBriefSchema.safeParse({
      source_request: SOURCE_REQUEST,
      candidate_statement: CANDIDATE_STATEMENT,
      judge_context: "blind_judge",
      dimension_notes: ["차원 노트 유출"],
    });

    expect(parsed.success).toBe(false);
  });

  test("zod schema rejects judge_context='driver'", () => {
    const parsed = preservationBriefSchema.safeParse({
      source_request: SOURCE_REQUEST,
      candidate_statement: CANDIDATE_STATEMENT,
      judge_context: "driver",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("ac-9 clause 4 — fail routes to fresh resynthesis, never to driver editing", () => {
  test("finalize verdict='fail' result carries a fresh-resynthesis routing target, no driver-edit target", () => {
    const store = createIntentStore();
    const result = finalize(failVerdictFixture, store);

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    const routing = result.routing;
    if (routing === undefined) {
      throw new Error("preservation_failed rejection must carry a routing target");
    }
    expect(routing.target).toBe("fresh_resynthesis");
    expect(routing.source_request).toBe(SOURCE_REQUEST);
    expect(routing.target).not.toBe("driver_edit");
    expect("driver_edit" in routing).toBe(false);
    expect("driver_edit" in result).toBe(false);
  });

  test("resynthesis router emits a fresh request variant with source_request verbatim, no driver-edit key", () => {
    const route = routeAfterPreservationFail({
      source_request: SOURCE_REQUEST,
      judgment: failJudgment,
    });

    expect(route.target).toBe("fresh_resynthesis");
    expect(route.source_request).toBe(SOURCE_REQUEST);
    expect("driver_edit" in route).toBe(false);
  });
});
