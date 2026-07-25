import { describe, expect, test } from "bun:test";
import type { VerificationMethod } from "../intent/criterion";
import { type Evidence, type EvidenceKind, evidence, matchEvidence } from "./evidence";

const make = (criterionId: string, kind: EvidenceKind): Evidence => ({
  criterion_id: criterionId,
  kind,
  ref: `some/ref-for-${kind}`,
  summary: `${kind} evidence`,
});

describe("evidence schema — every piece of evidence is bound to one criterion", () => {
  test("rejects evidence without a criterion_id", () => {
    const { criterion_id: _dropped, ...unbound } = make("ac-1", "test");
    expect(evidence.safeParse(unbound).success).toBe(false);
  });

  test("rejects evidence with an empty criterion_id", () => {
    expect(evidence.safeParse(make("", "test")).success).toBe(false);
  });
});

describe("matchEvidence — no evidence always blocks", () => {
  test.each(["run", "rescan", "human"] as const)(
    "method %s with zero evidence blocks",
    (method) => {
      const result = matchEvidence({ criterion_id: "ac-1", method }, []);
      expect(result.decision).toBe("block");
      expect(result.reason.length).toBeGreaterThan(0);
    },
  );
});

describe("matchEvidence — evidence bound to another criterion cannot close this one", () => {
  test("blocks when every offered piece is bound elsewhere, even of the right kind", () => {
    const result = matchEvidence({ criterion_id: "ac-1", method: "run" }, [
      make("ac-2", "test"),
      make("ac-3", "command"),
    ]);
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("ac-1");
  });

  test("one piece of evidence cannot close two criteria", () => {
    const shared = [make("ac-1", "test")];
    expect(matchEvidence({ criterion_id: "ac-1", method: "run" }, shared).decision).toBe("pass");
    expect(matchEvidence({ criterion_id: "ac-2", method: "run" }, shared).decision).toBe("block");
  });

  test("passes via the piece bound to this criterion among foreign ones", () => {
    const result = matchEvidence({ criterion_id: "ac-1", method: "rescan" }, [
      make("ac-2", "file"),
      make("ac-1", "file"),
    ]);
    expect(result.decision).toBe("pass");
  });
});

describe("matchEvidence — each method accepts only its own evidence kinds", () => {
  const cases: Array<[VerificationMethod, EvidenceKind, "pass" | "block"]> = [
    ["run", "test", "pass"],
    ["run", "command", "pass"],
    ["run", "file", "block"],
    ["run", "observation", "block"],
    ["run", "repro", "block"],
    ["rescan", "file", "pass"],
    ["rescan", "test", "block"],
    ["rescan", "command", "block"],
    ["rescan", "observation", "block"],
    ["rescan", "repro", "block"],
    ["human", "observation", "pass"],
    ["human", "repro", "pass"],
    ["human", "test", "block"],
    ["human", "command", "block"],
    ["human", "file", "block"],
  ];

  test.each(cases)("method %s with %s evidence → %s", (method, kind, expected) => {
    const result = matchEvidence({ criterion_id: "ac-1", method }, [make("ac-1", kind)]);
    expect(result.decision).toBe(expected);
  });
});

describe("matchEvidence — mixed evidence kinds", () => {
  test("passes when at least one bound kind matches", () => {
    const result = matchEvidence({ criterion_id: "ac-1", method: "rescan" }, [
      make("ac-1", "test"),
      make("ac-1", "file"),
    ]);
    expect(result.decision).toBe("pass");
    expect(result.reason).toContain("file");
  });

  test("blocks when every bound kind mismatches", () => {
    const result = matchEvidence({ criterion_id: "ac-1", method: "run" }, [
      make("ac-1", "file"),
      make("ac-1", "observation"),
    ]);
    expect(result.decision).toBe("block");
  });
});
