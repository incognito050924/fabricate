import { describe, expect, test } from "bun:test";
import { scanAvoidViolations } from "../glossary/avoid-scan";
import { INTERVIEW_GLOSSARY, glossaryAvoidTerms } from "../glossary/interview-vocabulary";
import {
  INTERVIEW_AVOID_TERMS,
  checkCatalogFloor,
  judgeCopyFidelity,
  runStaticCopyFidelityGate,
} from "./banner-fidelity-gate";
import { STATIC_COPY_CATALOG } from "./static-copy-catalog";

const GATE_SOURCE = "src/interview/i18n/banner-fidelity-gate.ts";

/** Comments may explain the Korean surface; the code may not hold any of it. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("the gate owns no vocabulary of its own", () => {
  test("the avoid list is derived from the agreed-vocabulary glossary, term for term", () => {
    expect([...INTERVIEW_AVOID_TERMS]).toEqual(glossaryAvoidTerms(INTERVIEW_GLOSSARY));
  });

  // Term-for-term equality alone cannot tell a derivation from a retyped list
  // that currently happens to agree — and a retyped list is exactly the drift
  // this module already had. So the derivation itself is pinned.
  test("the avoid list is DERIVED, not retyped: the module holds no Korean of its own", async () => {
    const source = await Bun.file(GATE_SOURCE).text();

    const declaration = source
      .split("\n")
      .find((line) => line.includes("INTERVIEW_AVOID_TERMS: readonly string[] ="));
    expect(declaration).toContain("glossaryAvoidTerms(INTERVIEW_GLOSSARY)");

    expect({ file: GATE_SOURCE, hasKoreanCode: /[가-힣]/.test(stripComments(source)) }).toEqual({
      file: GATE_SOURCE,
      hasKoreanCode: false,
    });
  });

  test("adding a term to the glossary adds it to the gate — the list is not a copy", () => {
    const extended = [
      ...INTERVIEW_GLOSSARY,
      {
        concept: "test-only concept",
        korean: "시험 앵커",
        positive_examples: ["시험 앵커를 쓴다"],
        negative_examples: ["테스트용버려진말을 쓴다"],
        avoid: ["테스트용버려진말"],
      },
    ];

    expect(glossaryAvoidTerms(extended)).toEqual([...INTERVIEW_AVOID_TERMS, "테스트용버려진말"]);
  });

  test("the per-copy judgment is the glossary scanner's verdict, not a second grep", () => {
    const cases = [
      { text: "여정을 시작합니다", terms: [...INTERVIEW_AVOID_TERMS] },
      { text: "인터뷰를 시작합니다", terms: [...INTERVIEW_AVOID_TERMS] },
      { text: "당신의 여정", terms: [...INTERVIEW_AVOID_TERMS] },
      { text: "아무 말", terms: ["말"] },
    ];

    for (const { text, terms } of cases) {
      const judged = judgeCopyFidelity({ catalog_key: "k", text, avoid_terms: terms });
      const scanned = scanAvoidViolations([{ concept: "k", avoid: terms }], text);

      expect({ text, terms: judged.violations.map((violation) => violation.term) }).toEqual({
        text,
        terms: scanned.map((violation) => violation.term),
      });
      expect(judged.passed).toBe(scanned.length === 0);
    }
  });
});

describe("the gate is fail-closed at the floor and at the missing verdict", () => {
  test("an empty catalog is refused — nothing reviewed is not everything reviewed", () => {
    const report = runStaticCopyFidelityGate({});

    expect(report.passed).toBe(false);
    expect(report.catalog_floor.ok).toBe(false);
    expect(checkCatalogFloor({}).ok).toBe(false);
  });

  test("a key with no copy gets NO verdict and blocks the gate (무판정 = 미통과)", () => {
    const report = runStaticCopyFidelityGate({
      "interview.banner.a": { kind: "banner", ko: "인터뷰를 시작합니다" },
      "interview.banner.b": { kind: "banner" } as unknown as { kind: string; ko: string },
    });

    expect(report.passed).toBe(false);
    expect(report.unjudged_keys).toEqual(["interview.banner.b"]);
    expect(report.judgments.map((judgment) => judgment.catalog_key)).toEqual([
      "interview.banner.a",
    ]);
  });

  test("a key whose copy is blank gets no verdict either — an empty string is not clean copy", () => {
    const report = runStaticCopyFidelityGate({
      "interview.banner.a": { kind: "banner", ko: "   " },
    });

    expect(report.unjudged_keys).toEqual(["interview.banner.a"]);
    expect(report.passed).toBe(false);
  });

  test("a populated, clean catalog still passes — the floor does not refuse everything", () => {
    const report = runStaticCopyFidelityGate({
      "interview.banner.a": { kind: "banner", ko: "인터뷰를 시작합니다" },
    });

    expect(report.passed).toBe(true);
    expect(report.catalog_floor.ok).toBe(true);
  });
});

describe("the gate reaches the copy the interview actually prints", () => {
  test("the live catalog passes under the derived list", () => {
    expect(runStaticCopyFidelityGate(STATIC_COPY_CATALOG).passed).toBe(true);
  });

  test("a rejected wording planted in live-shaped copy flips the gate and names the key", () => {
    const term = INTERVIEW_AVOID_TERMS[0];
    const report = runStaticCopyFidelityGate({
      "interview.banner.start": { kind: "banner", ko: `${term}을 시작합니다` },
    });

    expect(report.passed).toBe(false);
    expect(report.violating_keys).toEqual(["interview.banner.start"]);
  });
});
