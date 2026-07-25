import { describe, expect, test } from "bun:test";
import type { VerificationMethod } from "../intent/criterion";
import { type Evidence, type EvidenceKind, matchEvidence } from "./evidence";

const make = (kind: EvidenceKind): Evidence => ({
  kind,
  ref: `some/ref-for-${kind}`,
  summary: `${kind} evidence`,
});

describe("matchEvidence — no evidence always blocks", () => {
  test.each(["run", "rescan", "human"] as const)(
    "method %s with zero evidence blocks",
    (method) => {
      const result = matchEvidence(method, []);
      expect(result.decision).toBe("block");
      expect(result.reason.length).toBeGreaterThan(0);
    },
  );
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
    expect(matchEvidence(method, [make(kind)]).decision).toBe(expected);
  });
});

describe("matchEvidence — mixed evidence", () => {
  test("passes when at least one offered kind matches", () => {
    const result = matchEvidence("rescan", [make("test"), make("file")]);
    expect(result.decision).toBe("pass");
    expect(result.reason).toContain("file");
  });

  test("blocks when every offered kind mismatches", () => {
    const result = matchEvidence("run", [make("file"), make("observation")]);
    expect(result.decision).toBe("block");
  });
});
