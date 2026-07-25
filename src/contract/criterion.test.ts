import { describe, expect, test } from "bun:test";
import { criterion, parseCriterion } from "./criterion";

const validOracle = {
  criterion_id: "ac-1",
  statement: "bun test exits 0 on the round-0 gate suite",
  method: "run",
  direction: "forward",
};

const validCriterion = {
  id: "ac-1",
  statement: "라운드 0에서 충족 상태 스키마를 도출·저장한다",
  oracle: validOracle,
};

describe("criterion schema — oracle is mandatory", () => {
  test("rejects a criterion without an oracle", () => {
    const { oracle: _dropped, ...withoutOracle } = validCriterion;
    expect(criterion.safeParse(withoutOracle).success).toBe(false);
  });

  test("accepts a criterion with a complete oracle", () => {
    expect(criterion.safeParse(validCriterion).success).toBe(true);
  });

  test("rejects an oracle with an empty statement", () => {
    const bad = {
      ...validCriterion,
      oracle: { ...validOracle, statement: "" },
    };
    expect(criterion.safeParse(bad).success).toBe(false);
  });
});

describe("criterion schema — exactly three verification methods", () => {
  test.each(["run", "rescan", "human"] as const)("accepts method %s", (method) => {
    const ok = { ...validCriterion, oracle: { ...validOracle, method } };
    expect(criterion.safeParse(ok).success).toBe(true);
  });

  test("rejects an unknown verification method", () => {
    const bad = {
      ...validCriterion,
      oracle: { ...validOracle, method: "llm_self_report" },
    };
    expect(criterion.safeParse(bad).success).toBe(false);
  });
});

describe("criterion schema — forward oracles may not anchor to code locations", () => {
  const codeAnchor = { file: "src/interview/round0.ts", line: 42 };

  test("rejects a forward oracle with a code anchor", () => {
    const bad = {
      ...validCriterion,
      oracle: { ...validOracle, direction: "forward", code_anchor: codeAnchor },
    };
    expect(criterion.safeParse(bad).success).toBe(false);
  });

  test("accepts a backward oracle with a code anchor", () => {
    const ok = {
      ...validCriterion,
      oracle: { ...validOracle, direction: "backward", code_anchor: codeAnchor },
    };
    expect(criterion.safeParse(ok).success).toBe(true);
  });

  test("accepts a forward oracle without a code anchor", () => {
    expect(criterion.safeParse(validCriterion).success).toBe(true);
  });
});

describe("criterion schema — oracle must point back at its own criterion", () => {
  test("rejects an oracle whose criterion_id differs from the criterion id", () => {
    const bad = {
      ...validCriterion,
      oracle: { ...validOracle, criterion_id: "ac-2" },
    };
    expect(criterion.safeParse(bad).success).toBe(false);
  });
});

describe("parseCriterion", () => {
  test("returns the parsed criterion for valid input", () => {
    expect(parseCriterion(validCriterion).id).toBe("ac-1");
  });

  test("throws for a criterion without an oracle", () => {
    const { oracle: _dropped, ...withoutOracle } = validCriterion;
    expect(() => parseCriterion(withoutOracle)).toThrow();
  });
});
