/**
 * ac-10g acceptance — backtranslation echo as a separate artifact: fresh-context
 * Korean backtranslation, deterministic diff against the source request, and the
 * mechanical fidelity_failed flag (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10g.json), covered clauses:
 *  (1) backtranslation_echo exists in the round-0 reading output as a field
 *      distinct from ac-1's restatement — both keys are modelled and required
 *      (a missing echo, a missing restatement, and a non-string restatement are
 *      each refused at their own path), the echo object placed under the
 *      restatement key raises issues at BOTH keys, and a malformed echo is
 *      refused at the nested path backtranslation_echo.<field>.
 *  (2) the backtranslation text is non-empty Korean (Hangul-containing check),
 *      a fresh-context (source-request-not-viewed) provenance marker is a
 *      required typed field, and an echo whose provenance marks the source
 *      request as viewed is refused by the schema (structural approximation —
 *      the actuality of the fresh context is residual).
 *  (3) the backtranslation is deterministically diffed against the source
 *      request original text and that diff stays inside backtranslation_echo.
 *      Structural realization: the echo carries the source_request_text it was
 *      diffed against, `diff` is a typed {added: string[], removed: string[]},
 *      and an echo whose stored diff is not the deterministic diff of its own
 *      (source_request_text, backtranslation_text) pair is refused — so a
 *      constant or junk diff cannot ride inside the forced artifact. The
 *      parse-or-refuse entry point runs that whole schema (it throws on every
 *      malformed echo, not only on the provenance bit) and preserves the
 *      computed diff verbatim.
 *  (4) mechanical-mismatch fixtures — the '일부' insertion narrowing over a
 *      plain source, the '모든' → '일부' qualifier replacement, and a dropped
 *      content word ('보관함') — set fidelity_failed to true and surface the
 *      mismatching content words/qualifiers in the diff; an echo carrying a
 *      raised diff with the flag down is refused (no artifact-side fail-open).
 *  (5) false-positive guard (three fixtures): an identical backtranslation, a
 *      word-order-only variation, and a re-wording that changes only particles
 *      while keeping every content word and the '모든' qualifier do NOT set
 *      fidelity_failed.
 *
 * Residual (NOT tested here, per row residual):
 *  - The final judgment on '완전' overstatement — whether a reading killed
 *    '완전' as a mere intensifier — is declared residual by the contract
 *    itself; the backtranslation diff is only the last net.
 *  - Fresh-context actuality — the provenance field only declares that the
 *    source request was not viewed; whether the backtranslation was really
 *    produced without viewing it cannot be closed by a field check (kin to
 *    the ac-1 synthesis_provenance residual).
 *  - Semantic faithfulness beyond the content-word/qualifier-level mechanical
 *    diff (whether the paraphrase truly carries the reading) is human
 *    judgment and is never scored here: no fixture asks the diff to rule on a
 *    synonym substitution or on meaning, only on content words and qualifiers.
 */
import { describe, expect, test } from "bun:test";
import { diffBacktranslation } from "../src/interview/reading/backtranslation-diff";
import {
  backtranslationEchoSchema,
  parseBacktranslationEcho,
} from "../src/interview/reading/backtranslation-echo";
import { round0ReadingSchema } from "../src/interview/reading/round0-reading";

/** Source request whose scope is explicitly total ('모든'). */
const SOURCE_WITH_ALL = "받은 편지함에서 모든 파일을 보관함으로 옮겨줘";
/** Source request with no scope qualifier at all. */
const SOURCE_PLAIN = "받은 편지함에서 파일을 보관함으로 옮겨줘";
/** Narrowed backtranslation — the contract-named '일부 파일 옮겨줘' class. */
const NARROWED_BACKTRANSLATION = "받은 편지함에서 일부 파일을 보관함으로 옮겨줘";
/** Mismatch fixture 3 — the destination content word '보관함' is dropped. */
const DESTINATION_DROPPED_BACKTRANSLATION = "받은 편지함에서 모든 파일을 옮겨줘";
/** Guard fixture 2 — word order changed, token set identical. */
const REORDERED_BACKTRANSLATION = "모든 파일을 받은 편지함에서 보관함으로 옮겨줘";
/**
 * Guard fixture 3 — only the particles change (에서 → 의, 을 → 은). Every
 * content word and the '모든' qualifier survive, so no mechanical mismatch
 * exists at the level the contract names; a raw whitespace-token comparison
 * would nonetheless see two differing token multisets.
 */
const PARTICLE_VARIED_BACKTRANSLATION = "받은 편지함의 모든 파일은 보관함으로 옮겨줘";

/** ac-1-style restatement (different wording), fixed for coexistence checks. */
const RESTATEMENT = "수신함에 쌓인 문서 전체를 별도 보관 공간으로 이동해 달라는 요청으로 읽었다";

type DiffResult = { added: string[]; removed: string[]; fidelity_failed: boolean };

/** A coherent backtranslation_echo artifact for the given pair. */
const echoFor = (source: string, backtranslation: string) => {
  const computed: DiffResult = diffBacktranslation(source, backtranslation);
  return {
    source_request_text: source,
    backtranslation_text: backtranslation,
    provenance: { source_request_viewed: false },
    diff: { added: computed.added, removed: computed.removed },
    fidelity_failed: computed.fidelity_failed,
  };
};

/** A well-formed backtranslation_echo artifact (identical, faithful pair). */
const validEcho = () => echoFor(SOURCE_WITH_ALL, SOURCE_WITH_ALL);

const issuePaths = (result: {
  success: boolean;
  error?: { issues: { path: (string | number)[] }[] };
}) => (result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.path.join(".")));

const hasIssueAt = (result: { success: boolean }, path: string) =>
  issuePaths(result as Parameters<typeof issuePaths>[0]).includes(path);

const hasIssueUnder = (result: { success: boolean }, prefix: string) =>
  issuePaths(result as Parameters<typeof issuePaths>[0]).some(
    (p) => p === prefix || p.startsWith(`${prefix}.`),
  );

describe("ac-10g clause 1 — backtranslation_echo is a separate required field beside restatement", () => {
  test("an output carrying only the restatement is refused at the backtranslation_echo field", () => {
    const result = round0ReadingSchema.safeParse({ restatement: RESTATEMENT });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "backtranslation_echo")).toBe(true);
    expect(hasIssueUnder(result, "restatement")).toBe(false);
  });

  test("an output carrying only the backtranslation_echo is refused at the restatement field", () => {
    const result = round0ReadingSchema.safeParse({ backtranslation_echo: validEcho() });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "restatement")).toBe(true);
    expect(hasIssueUnder(result, "backtranslation_echo")).toBe(false);
  });

  test("a non-string restatement is refused at the restatement field (it is a typed sibling, not a bag)", () => {
    const result = round0ReadingSchema.safeParse({
      restatement: 42,
      backtranslation_echo: validEcho(),
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "restatement")).toBe(true);
    expect(hasIssueUnder(result, "backtranslation_echo")).toBe(false);
  });

  test("an empty restatement is refused at the restatement field", () => {
    const result = round0ReadingSchema.safeParse({
      restatement: "",
      backtranslation_echo: validEcho(),
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "restatement")).toBe(true);
  });

  test("restatement and backtranslation_echo coexist under distinct keys without issues at either", () => {
    const result = round0ReadingSchema.safeParse({
      restatement: RESTATEMENT,
      backtranslation_echo: validEcho(),
    });

    expect(hasIssueUnder(result, "backtranslation_echo")).toBe(false);
    expect(hasIssueUnder(result, "restatement")).toBe(false);
  });

  test("the echo object hiding under the restatement key satisfies neither key", () => {
    const result = round0ReadingSchema.safeParse({ restatement: validEcho() });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "backtranslation_echo")).toBe(true);
    expect(hasIssueAt(result, "restatement")).toBe(true);
  });

  test("a malformed echo is refused at the nested backtranslation_echo.backtranslation_text path", () => {
    const result = round0ReadingSchema.safeParse({
      restatement: RESTATEMENT,
      backtranslation_echo: { ...validEcho(), backtranslation_text: "" },
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "backtranslation_echo.backtranslation_text")).toBe(true);
  });

  test("an echo whose stored diff contradicts its own pair is refused inside the round-0 output", () => {
    const result = round0ReadingSchema.safeParse({
      restatement: RESTATEMENT,
      backtranslation_echo: {
        ...echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION),
        diff: { added: [], removed: [] },
        fidelity_failed: false,
      },
    });

    expect(result.success).toBe(false);
    expect(hasIssueUnder(result, "backtranslation_echo")).toBe(true);
  });
});

describe("ac-10g clause 2 — non-empty Korean text and mandatory fresh-context provenance", () => {
  test("a well-formed echo parses and keeps its text and provenance verbatim", () => {
    const result = backtranslationEchoSchema.safeParse(validEcho());

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.data.backtranslation_text).toBe(SOURCE_WITH_ALL);
    expect(result.data.source_request_text).toBe(SOURCE_WITH_ALL);
    expect(result.data.provenance.source_request_viewed).toBe(false);
  });

  test("an empty backtranslation text is refused at backtranslation_text", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      backtranslation_text: "",
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "backtranslation_text")).toBe(true);
  });

  test("a whitespace-only backtranslation text is refused at backtranslation_text", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      backtranslation_text: "   ",
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "backtranslation_text")).toBe(true);
  });

  test("a Hangul-free backtranslation text is refused (Korean-containing check)", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      backtranslation_text: "please move some files to the archive",
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "backtranslation_text")).toBe(true);
  });

  test("an echo without the provenance marker is refused (required field)", () => {
    const { provenance: _dropped, ...withoutProvenance } = validEcho();
    const result = backtranslationEchoSchema.safeParse(withoutProvenance);

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "provenance")).toBe(true);
  });

  test("an empty provenance object is refused at provenance.source_request_viewed", () => {
    const result = backtranslationEchoSchema.safeParse({ ...validEcho(), provenance: {} });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "provenance.source_request_viewed")).toBe(true);
  });

  test("a backtranslation marked as produced with the source request viewed is refused", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      provenance: { source_request_viewed: true },
    });

    expect(result.success).toBe(false);
    expect(hasIssueUnder(result, "provenance")).toBe(true);
  });
});

describe("ac-10g clause 3 — deterministic diff against the source request, kept inside the echo", () => {
  test("the mismatching pair diffs to a stable, non-empty token diff on every call", () => {
    const first: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION);
    const second: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION);

    expect(second).toEqual(first);
    expect(first.added.length).toBeGreaterThan(0);
    expect(first.removed.length).toBeGreaterThan(0);
    expect(first.added.every((t: string) => typeof t === "string" && t.length > 0)).toBe(true);
    expect(first.removed.every((t: string) => typeof t === "string" && t.length > 0)).toBe(true);
  });

  test("swapping the source and the backtranslation swaps added and removed", () => {
    const forward: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION);
    const backward: DiffResult = diffBacktranslation(NARROWED_BACKTRANSLATION, SOURCE_WITH_ALL);

    expect(backward.added).toEqual(forward.removed);
    expect(backward.removed).toEqual(forward.added);
  });

  test("an identical backtranslation diffs to empty added/removed", () => {
    const result: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, SOURCE_WITH_ALL);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  test("an echo without the diff field is refused (the diff must remain in the artifact)", () => {
    const { diff: _dropped, ...withoutDiff } = validEcho();
    const result = backtranslationEchoSchema.safeParse(withoutDiff);

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "diff")).toBe(true);
  });

  test("an echo without the source request it was diffed against is refused", () => {
    const { source_request_text: _dropped, ...withoutSource } = validEcho();
    const result = backtranslationEchoSchema.safeParse(withoutSource);

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "source_request_text")).toBe(true);
  });

  test("an empty source_request_text is refused", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      source_request_text: "",
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "source_request_text")).toBe(true);
  });

  test("a scalar in place of the diff object is refused at diff", () => {
    const result = backtranslationEchoSchema.safeParse({ ...validEcho(), diff: 42 });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "diff")).toBe(true);
  });

  test("a diff missing the removed list is refused at diff.removed", () => {
    const result = backtranslationEchoSchema.safeParse({ ...validEcho(), diff: { added: [] } });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "diff.removed")).toBe(true);
  });

  test("a diff whose added is a bare string is refused at diff.added", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      diff: { added: "일부", removed: [] },
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "diff.added")).toBe(true);
  });

  test("a diff carrying a non-string token is refused at diff.added.0", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      diff: { added: [42], removed: [] },
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "diff.added.0")).toBe(true);
  });

  test("an echo whose stored diff is empty while its own pair mismatches is refused", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION),
      diff: { added: [], removed: [] },
      fidelity_failed: false,
    });

    expect(result.success).toBe(false);
    expect(hasIssueUnder(result, "diff")).toBe(true);
  });

  test("an echo whose stored diff carries tokens the deterministic diff never produced is refused", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION),
      diff: { added: ["아무거나"], removed: ["없는말"] },
    });

    expect(result.success).toBe(false);
    expect(hasIssueUnder(result, "diff")).toBe(true);
  });

  test("the stored diff of a well-formed echo equals the deterministic diff of its own pair", () => {
    const computed: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION);
    const result = backtranslationEchoSchema.safeParse(
      echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION),
    );

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.data.diff).toEqual({ added: computed.added, removed: computed.removed });
  });

  test("the parse-or-refuse entry point preserves the computed diff verbatim inside the echo", () => {
    const computed: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION);
    const parsed = parseBacktranslationEcho(echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION));

    expect(parsed.source_request_text).toBe(SOURCE_WITH_ALL);
    expect(parsed.backtranslation_text).toBe(NARROWED_BACKTRANSLATION);
    expect(parsed.diff).toEqual({ added: computed.added, removed: computed.removed });
    expect(parsed.diff.added.length).toBeGreaterThan(0);
    expect(parsed.fidelity_failed).toBe(computed.fidelity_failed);
  });

  test("the parse-or-refuse entry point throws instead of returning a viewed-context echo", () => {
    expect(() =>
      parseBacktranslationEcho({
        ...validEcho(),
        provenance: { source_request_viewed: true },
      }),
    ).toThrow();
  });

  test("the parse-or-refuse entry point runs the whole schema — every malformed echo throws", () => {
    const { provenance: _p, ...withoutProvenance } = validEcho();
    const { diff: _d, ...withoutDiff } = validEcho();
    const { fidelity_failed: _f, ...withoutFlag } = validEcho();
    const { source_request_text: _s, ...withoutSource } = validEcho();
    const malformed: unknown[] = [
      { ...validEcho(), backtranslation_text: "" },
      { ...validEcho(), backtranslation_text: "   " },
      { ...validEcho(), backtranslation_text: "please move some files to the archive" },
      { ...validEcho(), diff: 42 },
      { ...validEcho(), diff: { added: [42], removed: [] } },
      { ...validEcho(), fidelity_failed: "false" },
      withoutProvenance,
      withoutDiff,
      withoutFlag,
      withoutSource,
    ];

    for (const candidate of malformed) {
      expect(() => parseBacktranslationEcho(candidate)).toThrow();
    }
  });

  test("the parse-or-refuse entry point throws on an echo whose stored diff contradicts its pair", () => {
    expect(() =>
      parseBacktranslationEcho({
        ...echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION),
        diff: { added: [], removed: [] },
        fidelity_failed: false,
      }),
    ).toThrow();
  });
});

describe("ac-10g clause 4 — mechanical mismatch raises fidelity_failed", () => {
  test("inserting '일부' over a plain source sets fidelity_failed and surfaces the token", () => {
    const result: DiffResult = diffBacktranslation(SOURCE_PLAIN, NARROWED_BACKTRANSLATION);

    expect(result.fidelity_failed).toBe(true);
    expect(result.added.some((token: string) => token.includes("일부"))).toBe(true);
    expect(result.removed.some((token: string) => token.includes("일부"))).toBe(false);
  });

  test("replacing '모든' with '일부' sets fidelity_failed and surfaces both qualifiers", () => {
    const result: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION);

    expect(result.fidelity_failed).toBe(true);
    expect(result.added.some((token: string) => token.includes("일부"))).toBe(true);
    expect(result.removed.some((token: string) => token.includes("모든"))).toBe(true);
  });

  test("dropping the destination content word '보관함' sets fidelity_failed and surfaces it as removed", () => {
    const result: DiffResult = diffBacktranslation(
      SOURCE_WITH_ALL,
      DESTINATION_DROPPED_BACKTRANSLATION,
    );

    expect(result.fidelity_failed).toBe(true);
    expect(result.removed.some((token: string) => token.includes("보관함"))).toBe(true);
    expect(result.added.some((token: string) => token.includes("보관함"))).toBe(false);
  });

  test("an echo without the fidelity_failed flag is refused (fail-closed, no silent default)", () => {
    const { fidelity_failed: _dropped, ...withoutFlag } = validEcho();
    const result = backtranslationEchoSchema.safeParse(withoutFlag);

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "fidelity_failed")).toBe(true);
  });

  test("a non-boolean fidelity_failed is refused at fidelity_failed", () => {
    const result = backtranslationEchoSchema.safeParse({
      ...validEcho(),
      fidelity_failed: "false",
    });

    expect(result.success).toBe(false);
    expect(hasIssueAt(result, "fidelity_failed")).toBe(true);
  });

  test("an echo carrying the raised diff with the flag down is refused (no artifact-side fail-open)", () => {
    const raised = echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION);
    expect(raised.fidelity_failed).toBe(true);

    const result = backtranslationEchoSchema.safeParse({ ...raised, fidelity_failed: false });

    expect(result.success).toBe(false);
    expect(hasIssueUnder(result, "fidelity_failed")).toBe(true);
  });

  test("the raised flag survives the parse-or-refuse entry point as true", () => {
    const parsed = parseBacktranslationEcho(echoFor(SOURCE_WITH_ALL, NARROWED_BACKTRANSLATION));

    expect(parsed.fidelity_failed).toBe(true);
  });
});

describe("ac-10g clause 5 — false-positive guard: faithful backtranslations do not raise the flag", () => {
  test("guard fixture 1: an identical backtranslation keeps fidelity_failed false", () => {
    const result: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, SOURCE_WITH_ALL);

    expect(result.fidelity_failed).toBe(false);
  });

  test("guard fixture 2: a word-order-only variation with the same token set keeps fidelity_failed false", () => {
    const result: DiffResult = diffBacktranslation(SOURCE_WITH_ALL, REORDERED_BACKTRANSLATION);

    expect(result.fidelity_failed).toBe(false);
  });

  test("guard fixture 3: a particle-only re-wording keeping every content word and '모든' keeps fidelity_failed false", () => {
    const result: DiffResult = diffBacktranslation(
      SOURCE_WITH_ALL,
      PARTICLE_VARIED_BACKTRANSLATION,
    );

    expect(result.fidelity_failed).toBe(false);
    expect(result.added.some((token: string) => /모든|일부/.test(token))).toBe(false);
    expect(result.removed.some((token: string) => /모든|일부/.test(token))).toBe(false);
  });

  test("guard fixture 3 parses as a well-formed echo with the flag down", () => {
    const result = backtranslationEchoSchema.safeParse(
      echoFor(SOURCE_WITH_ALL, PARTICLE_VARIED_BACKTRANSLATION),
    );

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.data.fidelity_failed).toBe(false);
  });
});
