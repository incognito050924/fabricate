import { describe, expect, test } from "bun:test";
import { lockCriterionSet } from "../intent/lock";
import { decideClose, reEntry } from "./close";

const validReEntry = { condition: "관문 A 승인 후 ac-7 판정 재실행" };
const lock = lockCriterionSet(["ac-1", "ac-2", "ac-3"]);

describe("reEntry schema", () => {
  test("rejects an empty re-entry condition", () => {
    expect(reEntry.safeParse({ condition: "" }).success).toBe(false);
  });
});

describe("decideClose — the judged list must cover the locked set", () => {
  test("a locked id absent from the judged list is inadmissible, even if all judged pass", () => {
    const decision = decideClose(lock, [
      { id: "ac-1", verdict: "pass" },
      { id: "ac-2", verdict: "pass" },
    ]);
    expect(decision.admissible).toBe(false);
    if (!decision.admissible) {
      expect(decision.missing).toEqual(["ac-3"]);
      expect(decision.reason).toContain("ac-3");
    }
  });

  test("a re-entry contract does not excuse a missing locked id", () => {
    const decision = decideClose(lock, [{ id: "ac-1", verdict: "pass" }], validReEntry);
    expect(decision.admissible).toBe(false);
    if (!decision.admissible) {
      expect(decision.missing).toEqual(["ac-2", "ac-3"]);
    }
  });

  test("an empty judged list is inadmissible with every locked id missing", () => {
    const decision = decideClose(lock, []);
    expect(decision.admissible).toBe(false);
    if (!decision.admissible) {
      expect(decision.missing).toEqual(["ac-1", "ac-2", "ac-3"]);
    }
  });

  test("judged ids beyond the lock (additions) are admissible and judged like the rest", () => {
    const decision = decideClose(lock, [
      { id: "ac-1", verdict: "pass" },
      { id: "ac-2", verdict: "pass" },
      { id: "ac-3", verdict: "pass" },
      { id: "ac-4", verdict: "pass" },
    ]);
    expect(decision).toEqual({ admissible: true, status: "done" });
  });
});

describe("decideClose — done only when every criterion passed", () => {
  test("all-pass over the full locked set closes as done", () => {
    const decision = decideClose(lock, [
      { id: "ac-1", verdict: "pass" },
      { id: "ac-2", verdict: "pass" },
      { id: "ac-3", verdict: "pass" },
    ]);
    expect(decision).toEqual({ admissible: true, status: "done" });
  });

  test("a criterion without a verdict lands as unverified, never done", () => {
    const decision = decideClose(
      lock,
      [{ id: "ac-1", verdict: "pass" }, { id: "ac-2", verdict: "pass" }, { id: "ac-3" }],
      validReEntry,
    );
    expect(decision.admissible).toBe(true);
    if (decision.admissible) {
      expect(decision.status).toBe("unverified");
    }
  });

  test("a failed criterion is residue too", () => {
    const decision = decideClose(
      lock,
      [
        { id: "ac-1", verdict: "pass" },
        { id: "ac-2", verdict: "fail" },
        { id: "ac-3", verdict: "pass" },
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
    const decision = decideClose(lock, [
      { id: "ac-1" },
      { id: "ac-2", verdict: "pass" },
      { id: "ac-3", verdict: "pass" },
    ]);
    expect(decision.admissible).toBe(false);
    if (!decision.admissible) {
      expect(decision.missing).toEqual([]);
      expect(decision.residue).toEqual(["ac-1"]);
      expect(decision.reason).toContain("재진입");
    }
  });

  test("residue with a re-entry contract lands as unverified and carries it", () => {
    const decision = decideClose(
      lock,
      [{ id: "ac-1" }, { id: "ac-2", verdict: "pass" }, { id: "ac-3", verdict: "pass" }],
      validReEntry,
    );
    expect(decision).toEqual({
      admissible: true,
      status: "unverified",
      residue: ["ac-1"],
      re_entry: validReEntry,
    });
  });
});
