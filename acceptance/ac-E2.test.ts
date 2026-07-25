import { describe, expect, test } from "bun:test";
/**
 * ac-E2 acceptance — Lindley enumerated interpretation set + `separates`
 * (DESIGN node, seam-shared with ac-36/C1). Because ac-E2 is a DESIGN node,
 * the judged object is not the running Lindley machine but the existence and
 * deterministic shape of the four declared design deliverables: the
 * alive-interpretation enumeration schema, the candidate-question `separates`
 * field, the "stop when no candidate reduces the set" gate spec, and the
 * design-produced frozen red test.
 *
 * Frozen red: every module below is new — none of src/interview/schedule/
 * lindley-spec.md, interpretation-set.ts, separates.ts, interpretation-stop.ts
 * or lindley.redtest.ts exists yet. Slice 3 must produce them so this file
 * turns green; these assertions are the completion definition of ac-E2.
 *
 * Oracle clauses covered (gate-a/rows/ac-E2.json oracle_statement):
 *  (1) spec existence + ac-36/C1 joint — src/interview/schedule/lindley-spec.md
 *      exists and is non-empty (the file itself is the doc→file evidence); its
 *      machine-readable declaration block (convention fixed here: the unique
 *      ```json fence whose object carries a "stop_when" key) passes zod
 *      parsing; its `seam` field is exactly the ac-36 frontier spec path
 *      src/interview/schedule/frontier-spec.md, and the candidate-question
 *      surface it declares is a src/interview/schedule/*.ts module that the
 *      frontier spec itself also names — same-seam authorship, closed as a
 *      structural check only. The "A5 first" ordering is NOT tested here: it
 *      is enforced by the row's depends_on (ac-29), not by this file.
 *  (2) alive-interpretation enumeration schema —
 *      src/interview/schedule/interpretation-set.ts exports a zod schema that
 *      parses the set as a closed enumeration (finite list of named elements,
 *      each with an id and an alive/eliminated status), preserves element
 *      values verbatim, and deterministically rejects at parse time: the empty
 *      set, duplicate ids, and free-form input outside the enumeration (a
 *      free-form status value, a bare string element, an extra key).
 *  (3) `separates` justification per candidate question —
 *      src/interview/schedule/separates.ts exports a candidate-question schema
 *      whose `separates: [interpretation i, interpretation j]` field and
 *      justification text are both mandatory at the schema level (isOptional()
 *      === false — this is the machine reading of "마다"), and a
 *      set-aware parse that deterministically rejects missing separates, an
 *      i === j self-pair, a wrong-arity pair, and a reference to an id absent
 *      from the interpretation set, while accepting a well-formed candidate
 *      and preserving its justification verbatim.
 *  (4) stop gate spec — the declaration's stop_when field is exactly
 *      "no_candidate_reduces_set"; a "축소" definition clause exists stating
 *      that a candidate's separates must be able to shrink the size of the
 *      alive-interpretation set; and the gate's implementation target is the
 *      src/interview/schedule/interpretation-stop.ts surface, both in the
 *      declaration and in the spec body, with that surface file present.
 *  (5) red test deliverable — src/interview/schedule/lindley.redtest.ts exists,
 *      is non-empty, is a real bun:test file, imports the interpretation-stop
 *      surface, and judges the stop gate / separates enforcement / set
 *      reduction behavior; its *.redtest.ts name keeps it outside bun's default
 *      *.test.ts glob so the green suite is not polluted (same convention as
 *      ac-33/ac-36, enforced by construction since every assertion reads
 *      exactly that path). Its pre-implementation red observation record
 *      (convention kin to ac-36: src/interview/schedule/lindley.red-run.json
 *      with test_path + observed_red_exit_code) exists, points at the red test,
 *      and recorded a non-zero exit code — a frozen red awaiting the future
 *      implementation node.
 *
 * Residual clauses NOT tested here (per gate-a/rows/ac-E2.json residual):
 *  - Completeness of the interpretation set — whether every live interpretation
 *    was enumerated is human judgment the statement itself declares residual;
 *    ac-E2's contract vocabulary (doc, test) carries no human-evidence kind, so
 *    per decision 0001 it stays residual rather than relaxing evidence kinds.
 *  - Semantic validity of each `separates` justification and design adequacy of
 *    the spec — whether the candidate question really splits interpretation i
 *    from j, and whether the enumeration / separates / stop-gate spec transplant
 *    the Lindley structure correctly, are not closed by field presence and
 *    reference-integrity checks.
 *  - Actual runtime behavior of the stop gate, separates enforcement and set
 *    reduction — the DESIGN node's completion bar stops at spec + red test. That
 *    behavior closes when lindley.redtest.ts goes green under a later
 *    implementation node; which candidate actually shrinks the set in a real
 *    interview depends on real user answers and is outside this oracle.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { interpretationSetSchema } from "../src/interview/schedule/interpretation-set";
import {
  candidateQuestionSchema,
  parseCandidateQuestion,
} from "../src/interview/schedule/separates";

const PROJECT_ROOT = resolve(import.meta.dir, "..");

const SPEC_RELATIVE_PATH = "src/interview/schedule/lindley-spec.md";
const FRONTIER_SPEC_RELATIVE_PATH = "src/interview/schedule/frontier-spec.md";
const STOP_SURFACE_RELATIVE_PATH = "src/interview/schedule/interpretation-stop.ts";
const RED_TEST_RELATIVE_PATH = "src/interview/schedule/lindley.redtest.ts";
const RED_RUN_RECORD_RELATIVE_PATH = "src/interview/schedule/lindley.red-run.json";

const SPEC_PATH = join(PROJECT_ROOT, SPEC_RELATIVE_PATH);
const FRONTIER_SPEC_PATH = join(PROJECT_ROOT, FRONTIER_SPEC_RELATIVE_PATH);
const STOP_SURFACE_PATH = join(PROJECT_ROOT, STOP_SURFACE_RELATIVE_PATH);
const RED_TEST_PATH = join(PROJECT_ROOT, RED_TEST_RELATIVE_PATH);
const RED_RUN_RECORD_PATH = join(PROJECT_ROOT, RED_RUN_RECORD_RELATIVE_PATH);

const readSpec = (): string => readFileSync(SPEC_PATH, "utf8");

// ---------------------------------------------------------------------------
// Machine-readable declaration block: the unique ```json fence whose parsed
// object carries a "stop_when" key. Extra fields are tolerated (passthrough);
// the four oracle-named fields are required.
// ---------------------------------------------------------------------------

const JSON_FENCE = /```json\s*\n([\s\S]*?)```/g;

const declarationSchema = z
  .object({
    seam: z.string().min(1),
    candidate_question_surface: z.string().min(1),
    stop_when: z.string().min(1),
    implementation_target: z.string().min(1),
  })
  .passthrough();

type LindleyDeclaration = z.infer<typeof declarationSchema>;

const declarationCandidates = (markdown: string): unknown[] => {
  const candidates: unknown[] = [];
  for (const fence of markdown.matchAll(JSON_FENCE)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fence[1] ?? "");
    } catch {
      continue; // a json fence that is not strict JSON is not the declaration block
    }
    if (typeof parsed === "object" && parsed !== null && "stop_when" in parsed) {
      candidates.push(parsed);
    }
  }
  return candidates;
};

const loadDeclaration = (): LindleyDeclaration => {
  const candidates = declarationCandidates(readSpec());
  if (candidates.length !== 1) {
    throw new Error(
      `expected exactly one machine-readable declaration block, found ${candidates.length}`,
    );
  }
  return declarationSchema.parse(candidates[0]);
};

// ---------------------------------------------------------------------------
// Markdown section extraction: a section runs from its heading to the next
// heading of the same or higher level.
// ---------------------------------------------------------------------------

type MarkdownSection = { heading: string; text: string };

const markdownSections = (markdown: string): MarkdownSection[] => {
  const lines = markdown.split("\n");
  const headings: { title: string; level: number; line: number }[] = [];
  for (const [index, line] of lines.entries()) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      headings.push({ title: match[2] ?? "", level: (match[1] ?? "").length, line: index });
    }
  }
  return headings.map((heading, order) => {
    let end = lines.length;
    for (let next = order + 1; next < headings.length; next += 1) {
      const candidate = headings[next];
      if (candidate && candidate.level <= heading.level) {
        end = candidate.line;
        break;
      }
    }
    return { heading: heading.title, text: lines.slice(heading.line, end).join("\n") };
  });
};

const sectionWithHeading = (markdown: string, headingPattern: RegExp): MarkdownSection | null =>
  markdownSections(markdown).find((section) => headingPattern.test(section.heading)) ?? null;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALIVE_ONE = {
  id: "i-1",
  statement: "보관은 받은 편지함에서 완전히 꺼내 별도 보관함으로 옮기는 것이다",
  status: "alive",
};

const ALIVE_TWO = {
  id: "i-2",
  statement: "보관은 받은 편지함에 남긴 채 라벨만 붙이는 것이다",
  status: "alive",
};

const ELIMINATED_THREE = {
  id: "i-3",
  statement: "보관은 영구 삭제를 뜻한다",
  status: "eliminated",
};

const VALID_SET_RAW = {
  interpretations: [ALIVE_ONE, ALIVE_TWO, ELIMINATED_THREE],
};

const JUSTIFICATION = "받은 편지함에 남기는지 여부가 i-1과 i-2를 정확히 가른다";

const VALID_CANDIDATE_RAW = {
  question_text: "보관 뒤에도 그 메일이 받은 편지함에 보여야 하나요?",
  separates: ["i-1", "i-2"],
  justification: JUSTIFICATION,
};

const redRunRecordSchema = z
  .object({
    test_path: z.string().min(1),
    observed_red_exit_code: z.number().int(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Clause 1 — spec exists, declaration parses, seam ties to the ac-36 frontier
// spec's candidate-question surface (same-seam authorship, structural only)
// ---------------------------------------------------------------------------

describe("ac-E2 clause 1 — lindley design spec and the ac-36/C1 seam joint", () => {
  test("the lindley design spec exists at the planned path and is non-empty", () => {
    expect(existsSync(SPEC_PATH)).toBe(true);
    expect(readSpec().trim().length).toBeGreaterThan(0);
  });

  test("the spec carries exactly one machine-readable declaration block that passes zod parsing", () => {
    const candidates = declarationCandidates(readSpec());
    expect(candidates.length).toBe(1);
    expect(declarationSchema.safeParse(candidates[0]).success).toBe(true);
  });

  test("the declaration seam field is exactly the ac-36 frontier spec, which exists", () => {
    expect(loadDeclaration().seam).toBe(FRONTIER_SPEC_RELATIVE_PATH);
    expect(existsSync(FRONTIER_SPEC_PATH)).toBe(true);
  });

  test("the declared candidate-question surface is a schedule module the frontier spec also names", () => {
    const surface = loadDeclaration().candidate_question_surface;
    expect(/^src\/interview\/schedule\/[\w.-]+\.ts$/.test(surface)).toBe(true);
    expect(readFileSync(FRONTIER_SPEC_PATH, "utf8")).toContain(surface);
    expect(readSpec()).toContain(surface);
  });
});

// ---------------------------------------------------------------------------
// Clause 2 — alive-interpretation set as a closed enumeration
// ---------------------------------------------------------------------------

describe("ac-E2 clause 2 — alive-interpretation set parses as a closed enumeration", () => {
  test("a finite enumeration of id + alive/eliminated elements parses and round-trips verbatim", () => {
    const parsed = interpretationSetSchema.parse(VALID_SET_RAW);
    expect(parsed.interpretations).toHaveLength(3);
    expect(parsed.interpretations.map((entry) => entry.id)).toEqual(["i-1", "i-2", "i-3"]);
    expect(parsed.interpretations.map((entry) => entry.status)).toEqual([
      "alive",
      "alive",
      "eliminated",
    ]);
    expect(parsed.interpretations[0]?.statement).toBe(ALIVE_ONE.statement);
  });

  test("the empty set is rejected at parse time", () => {
    expect(interpretationSetSchema.safeParse({ interpretations: [] }).success).toBe(false);
  });

  test("duplicate interpretation ids are rejected at parse time", () => {
    const duplicated = {
      interpretations: [ALIVE_ONE, { ...ALIVE_TWO, id: ALIVE_ONE.id }],
    };
    expect(interpretationSetSchema.safeParse(duplicated).success).toBe(false);
  });

  test("free-form input outside the enumeration is rejected — loose status, bare string element, extra key", () => {
    expect(
      interpretationSetSchema.safeParse({
        interpretations: [{ ...ALIVE_ONE, status: "아마도 살아있음" }],
      }).success,
    ).toBe(false);
    expect(
      interpretationSetSchema.safeParse({ interpretations: ["보관은 이동을 뜻한다"] }).success,
    ).toBe(false);
    expect(
      interpretationSetSchema.safeParse({
        interpretations: [{ ...ALIVE_ONE, hunch: "왠지 이게 맞다" }],
      }).success,
    ).toBe(false);
    expect(
      interpretationSetSchema.safeParse({ interpretations: [{ ...ALIVE_ONE, id: "" }] }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Clause 3 — every candidate question carries separates:[i, j] + justification
// ---------------------------------------------------------------------------

describe("ac-E2 clause 3 — separates and justification are mandatory per candidate question", () => {
  const parsedSet = () => interpretationSetSchema.parse(VALID_SET_RAW);

  test("separates and justification are not optional at the schema level ('마다')", () => {
    expect(candidateQuestionSchema.shape.separates.isOptional()).toBe(false);
    expect(candidateQuestionSchema.shape.justification.isOptional()).toBe(false);
    expect(candidateQuestionSchema.safeParse(VALID_CANDIDATE_RAW).success).toBe(true);
  });

  test("a candidate question missing separates is rejected by schema and by set-aware parse", () => {
    const { separates: _dropped, ...withoutSeparates } = VALID_CANDIDATE_RAW;
    expect(candidateQuestionSchema.safeParse(withoutSeparates).success).toBe(false);
    const result = parseCandidateQuestion(withoutSeparates, parsedSet());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the candidate without separates to be rejected");
    expect(result.reason).toContain("separates");
  });

  test("a candidate question missing or blanking the justification is rejected", () => {
    const { justification: _dropped, ...withoutJustification } = VALID_CANDIDATE_RAW;
    expect(candidateQuestionSchema.safeParse(withoutJustification).success).toBe(false);
    expect(
      candidateQuestionSchema.safeParse({ ...VALID_CANDIDATE_RAW, justification: "   " }).success,
    ).toBe(false);
    const result = parseCandidateQuestion(withoutJustification, parsedSet());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the candidate without justification to be rejected");
    expect(result.reason).toContain("정당화");
  });

  test("an i === j self-pair is rejected", () => {
    const selfPair = { ...VALID_CANDIDATE_RAW, separates: ["i-1", "i-1"] };
    expect(candidateQuestionSchema.safeParse(selfPair).success).toBe(false);
    const result = parseCandidateQuestion(selfPair, parsedSet());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the self-pair candidate to be rejected");
    expect(result.reason).toContain("separates");
  });

  test("separates must name exactly two interpretations — one or three is rejected", () => {
    expect(
      candidateQuestionSchema.safeParse({ ...VALID_CANDIDATE_RAW, separates: ["i-1"] }).success,
    ).toBe(false);
    expect(
      candidateQuestionSchema.safeParse({
        ...VALID_CANDIDATE_RAW,
        separates: ["i-1", "i-2", "i-3"],
      }).success,
    ).toBe(false);
  });

  test("a separates entry absent from the interpretation set is rejected, naming the unknown id", () => {
    const result = parseCandidateQuestion(
      { ...VALID_CANDIDATE_RAW, separates: ["i-1", "i-9"] },
      parsedSet(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected the dangling interpretation reference to be rejected");
    expect(result.reason).toContain("i-9");
  });

  test("a well-formed candidate over two set members is accepted and keeps its justification verbatim", () => {
    const result = parseCandidateQuestion(VALID_CANDIDATE_RAW, parsedSet());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected the well-formed candidate to be accepted");
    expect(result.question.separates).toEqual(["i-1", "i-2"]);
    expect(result.question.justification).toBe(JUSTIFICATION);
  });
});

// ---------------------------------------------------------------------------
// Clause 4 — the stop gate spec
// ---------------------------------------------------------------------------

describe("ac-E2 clause 4 — 'no candidate reduces the set' stop gate spec", () => {
  test("stop_when is exactly no_candidate_reduces_set", () => {
    expect(loadDeclaration().stop_when).toBe("no_candidate_reduces_set");
  });

  test("a 축소 definition clause exists — separates must be able to shrink the alive set's size", () => {
    const section = sectionWithHeading(readSpec(), /축소/);
    expect(section).not.toBeNull();
    if (section === null) throw new Error("unreachable");
    expect(section.text).toContain("separates");
    expect(section.text).toContain("살아있는-해석 집합");
    expect(section.text).toContain("크기");
  });

  test("the gate's implementation target is the interpretation-stop surface, named in declaration and body", () => {
    expect(loadDeclaration().implementation_target).toBe(STOP_SURFACE_RELATIVE_PATH);
    expect(readSpec()).toContain(STOP_SURFACE_RELATIVE_PATH);
    expect(existsSync(STOP_SURFACE_PATH)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Clause 5 — design-produced frozen red test and its red observation record
// ---------------------------------------------------------------------------

describe("ac-E2 clause 5 — design-produced red test artifact", () => {
  test("the red test exists outside the default test glob and judges the stop gate on the interpretation-stop surface", () => {
    expect(existsSync(RED_TEST_PATH)).toBe(true);
    const source = readFileSync(RED_TEST_PATH, "utf8");
    expect(source.trim().length).toBeGreaterThan(0);
    expect(source).toContain("bun:test");
    expect(/\b(?:describe|test|it)\s*\(/.test(source)).toBe(true);
    expect(/from\s+["'][^"']*interpretation-stop["']/.test(source)).toBe(true);
    expect(source).toContain("separates");
    expect(source).toContain("no_candidate_reduces_set");
  });

  test("a pre-implementation red observation record points at the red test with a non-zero exit code", () => {
    expect(existsSync(RED_RUN_RECORD_PATH)).toBe(true);
    const parsed = redRunRecordSchema.safeParse(
      JSON.parse(readFileSync(RED_RUN_RECORD_PATH, "utf8")),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("unreachable");
    expect(parsed.data.test_path).toBe(RED_TEST_RELATIVE_PATH);
    expect(parsed.data.observed_red_exit_code).not.toBe(0);
  });
});
