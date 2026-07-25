import { describe, expect, test } from "bun:test";
import { decideClose, reEntry } from "./close";

const validReEntry = { condition: "관문 A 승인 후 ac-7 판정 재실행" };

describe("reEntry schema", () => {
  test("rejects an empty re-entry condition", () => {
    expect(reEntry.safeParse({ condition: "" }).success).toBe(false);
  });
});

describe("decideClose — done only when every criterion passed", () => {
  test("all-pass closes as done", () => {
    const decision = decideClose([
      { id: "ac-1", verdict: "pass" },
      { id: "ac-2", verdict: "pass" },
    ]);
    expect(decision).toEqual({ admissible: true, status: "done" });
  });

  test("a criterion without a verdict makes done inadmissible", () => {
    const decision = decideClose([{ id: "ac-1", verdict: "pass" }, { id: "ac-2" }], validReEntry);
    expect(decision.admissible).toBe(true);
    if (decision.admissible) {
      expect(decision.status).toBe("unverified");
    }
  });

  test("a failed criterion also lands as unverified residue, never done", () => {
    const decision = decideClose(
      [
        { id: "ac-1", verdict: "pass" },
        { id: "ac-2", verdict: "fail" },
      ],
      validReEntry,
    );
    expect(decision.admissible).toBe(true);
    if (decision.admissible && decision.status === "unverified") {
      expect(decision.residue).toEqual(["ac-2"]);
    }
  });
});

describe("decideClose — honest landing requires a re-entry contract", () => {
  test("residue without a re-entry contract is inadmissible", () => {
    const decision = decideClose([{ id: "ac-1" }]);
    expect(decision.admissible).toBe(false);
    if (!decision.admissible) {
      expect(decision.residue).toEqual(["ac-1"]);
      expect(decision.reason).toContain("재진입");
    }
  });

  test("residue with a re-entry contract lands as unverified and carries it", () => {
    const decision = decideClose([{ id: "ac-1" }], validReEntry);
    expect(decision).toEqual({
      admissible: true,
      status: "unverified",
      residue: ["ac-1"],
      re_entry: validReEntry,
    });
  });
});

describe("decideClose — an empty criterion set cannot close as done", () => {
  test("zero criteria is inadmissible", () => {
    const decision = decideClose([]);
    expect(decision.admissible).toBe(false);
  });
});
