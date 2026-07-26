import { describe, expect, mock, test } from "bun:test";
import { runFinalizeCli } from "../../cli/interview-finalize";
import { renderDelegationReflection } from "../render";
import * as catalogModule from "./static-copy-catalog";
import {
  MIN_ENTRIES_PER_KIND,
  STATIC_COPY_CATALOG,
  STATIC_COPY_KINDS,
  type StaticCopyKey,
  staticCopy,
} from "./static-copy-catalog";

const CATALOG_COPY: ReadonlySet<string> = new Set<string>(
  Object.values(STATIC_COPY_CATALOG).map((entry) => entry.ko),
);

/** Everything the module printed that was not the user's own words back. */
const emittedCopy = (output: readonly string[], echoed: readonly string[]): string[] =>
  output
    .join("\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => !echoed.includes(line));

describe("the catalog is the whole user-facing static surface", () => {
  test("every declared kind is populated above the floor", () => {
    for (const kind of STATIC_COPY_KINDS) {
      const ofKind = Object.values(STATIC_COPY_CATALOG).filter((entry) => entry.kind === kind);
      expect({ kind, atLeast: ofKind.length >= MIN_ENTRIES_PER_KIND }).toEqual({
        kind,
        atLeast: true,
      });
    }
  });

  test("staticCopy is the one lookup — it returns the catalog string verbatim", () => {
    for (const [key, entry] of Object.entries(STATIC_COPY_CATALOG)) {
      expect(staticCopy(key as keyof typeof STATIC_COPY_CATALOG)).toBe(entry.ko);
    }
  });
});

const CATALOG_MODULE = "./static-copy-catalog";
// Snapshotted at load, before any stub: the imported names are live bindings,
// so reading them after a mock would hand the stub back as "the original".
const REAL_CATALOG_MODULE = { ...catalogModule };

/**
 * Randomised per run so the sentinel cannot be RECOGNISED. A fixed marker is
 * detectable — a module could call the lookup, notice the shape of what came
 * back, and fall through to its own literal — and then the stub would be
 * measuring a branch written for the test rather than the real path.
 */
const RUN_TAG = Math.random().toString(36).slice(2, 10);
const sentinelFor = (key: string): string => `${RUN_TAG}:${key}`;

/**
 * Swaps `staticCopy` for a sentinel-returning stub for the duration of one
 * check. Set membership cannot tell a module that LOOKS UP its copy from one
 * that inlined the same literal — both print a string the catalog also holds.
 * A stub can: only a module that actually calls the lookup prints the sentinel.
 *
 * NOTE: what this forces is consumption VIA `staticCopy`, not consumption of
 * the catalog as such — a module reading `STATIC_COPY_CATALOG[key].ko` directly
 * is honest but would fail here. That is narrower than the describe name says,
 * and it is deliberate: the single lookup seam is the declared design, and the
 * review layer can only see copy that goes through it.
 */
const withStubbedLookup = <T>(body: () => T): T => {
  mock.module(CATALOG_MODULE, () => ({
    ...REAL_CATALOG_MODULE,
    staticCopy: (key: StaticCopyKey) => sentinelFor(key),
  }));
  try {
    return body();
  } finally {
    mock.module(CATALOG_MODULE, () => REAL_CATALOG_MODULE);
  }
};

describe("the modules that actually print to the user CONSUME the catalog", () => {
  test("the delegation reflection prints what the lookup returns, not its own literals", () => {
    const printed = withStubbedLookup(() =>
      renderDelegationReflection({
        kind: "explicit_skip" as const,
        raw_utterance: "나머지는 알아서 해 주세요",
        interpretation: "세부 결정을 위임받아 진행한다",
      }),
    );

    expect(printed).toContain(sentinelFor("interview.label.echoed_utterance"));
    expect(printed).toContain(sentinelFor("interview.label.echoed_reading"));
    expect(printed).toContain(sentinelFor("interview.prompt.correct_reading"));
    // The user's own words are never routed through the catalog.
    expect(printed).toContain("나머지는 알아서 해 주세요");
  });

  test("the finalize CLI's rejection path prints what the lookup returns", async () => {
    const result = await withStubbedLookup(() =>
      runFinalizeCli({
        source_request: "인터뷰 하네스를 만든다",
        candidate_statement: "확정된 의도 문장",
      }),
    );

    expect(result.exitCode).toBe(1);
    expect(result.output.join("\n")).toContain(sentinelFor("interview.banner.finalize_rejected"));
  });

  test("the finalize CLI's ACCEPTED path prints what the lookup returns", async () => {
    const source_request = "인터뷰 하네스를 만든다";
    const candidate_statement = "확정된 의도 문장";
    const result = await withStubbedLookup(() =>
      runFinalizeCli({
        source_request,
        candidate_statement,
        synthesis_provenance: { author_context: "synthesizer" },
        preservation_judgment: {
          verdict: "pass",
          brief: { source_request, candidate_statement, judge_context: "preservation-judge" },
        },
      }),
    );

    expect(result.exitCode).toBe(0);
    expect(result.output.join("\n")).toContain(sentinelFor("interview.banner.intent_recorded"));
    // The confirmed statement is the user's, not catalog copy.
    expect(result.output.join("\n")).toContain(candidate_statement);
  });

  test("the finalize CLI's ROUTING path prints what the lookup returns", async () => {
    const source_request = "인터뷰 하네스를 만든다";
    const candidate_statement = "원 요청과 무관한 문장";
    const result = await withStubbedLookup(() =>
      runFinalizeCli({
        source_request,
        candidate_statement,
        synthesis_provenance: { author_context: "synthesizer" },
        preservation_judgment: {
          verdict: "fail",
          brief: { source_request, candidate_statement, judge_context: "preservation-judge" },
        },
      }),
    );

    expect(result.exitCode).toBe(1);
    const printed = result.output.join("\n");
    expect(printed).toContain(sentinelFor("interview.label.next_route"));
    expect(printed).toContain(sentinelFor("interview.label.resynthesize"));
  });

  test("the stub is restored — the real copy is back for everyone else", () => {
    expect(
      renderDelegationReflection({
        kind: "explicit_skip" as const,
        raw_utterance: "u",
        interpretation: "i",
      }),
    ).toContain("말씀하신 것:");
  });
});

describe("everything those modules print is copy the review layer can see", () => {
  test("the delegation reflection prints catalog copy around the user's verbatim words", () => {
    const record = {
      kind: "explicit_skip" as const,
      raw_utterance: "나머지는 알아서 해 주세요",
      interpretation: "세부 결정을 위임받아 진행한다",
    };

    const lines = emittedCopy(
      [renderDelegationReflection(record)],
      [record.raw_utterance, record.interpretation],
    );

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect({ line, inCatalog: CATALOG_COPY.has(line) }).toEqual({ line, inCatalog: true });
    }
  });

  test("the finalize CLI's accepted output is catalog copy plus the statement", async () => {
    const source_request = "인터뷰 하네스를 만든다";
    const candidate_statement = "확정된 의도 문장";
    const result = await runFinalizeCli({
      source_request,
      candidate_statement,
      synthesis_provenance: { author_context: "synthesizer" },
      preservation_judgment: {
        verdict: "pass",
        brief: { source_request, candidate_statement, judge_context: "preservation-judge" },
      },
    });

    const lines = emittedCopy(result.output, [result.intent?.statement ?? ""]);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect({ line, inCatalog: CATALOG_COPY.has(line) }).toEqual({ line, inCatalog: true });
    }
  });

  test("the finalize CLI's rejection output is built from catalog copy, not inline literals", async () => {
    const result = await runFinalizeCli({
      source_request: "인터뷰 하네스를 만든다",
      candidate_statement: "확정된 의도 문장",
    });

    expect(result.exitCode).toBe(1);
    const fragments = result.output.join(" ");
    const used = Object.values(STATIC_COPY_CATALOG)
      .map((entry) => entry.ko)
      .filter((copy) => fragments.includes(copy));

    expect(used.length).toBeGreaterThan(0);
  });
});
