import { describe, expect, test } from "bun:test";
import { checkCriterionSet, lockCriterionSet, relockCriterionSet } from "./lock";

describe("lockCriterionSet — freezing the set", () => {
  test("normalizes: trims, dedupes, sorts", () => {
    const lock = lockCriterionSet([" ac-2", "ac-1", "ac-2 ", "ac-1"]);
    expect(lock.criterion_ids).toEqual(["ac-1", "ac-2"]);
  });

  test("refuses to lock an empty set", () => {
    expect(() => lockCriterionSet([])).toThrow();
  });

  test("does not alias the caller's array", () => {
    const ids = ["ac-1", "ac-2"];
    const lock = lockCriterionSet(ids);
    ids.push("ac-3");
    expect(lock.criterion_ids).toEqual(["ac-1", "ac-2"]);
  });
});

describe("checkCriterionSet — removals refused, additions reported", () => {
  const lock = lockCriterionSet(["ac-1", "ac-2", "ac-3"]);

  test("identical proposal is admissible with nothing to report", () => {
    const check = checkCriterionSet(lock, ["ac-1", "ac-2", "ac-3"]);
    expect(check.admissible).toBe(true);
    expect(check.removed).toEqual([]);
    expect(check.added).toEqual([]);
  });

  test("a proposal dropping a locked id is refused and names the removal", () => {
    const check = checkCriterionSet(lock, ["ac-1", "ac-3"]);
    expect(check.admissible).toBe(false);
    expect(check.removed).toEqual(["ac-2"]);
    expect(check.reason).toContain("ac-2");
  });

  test("a proposal adding a new id is admissible and the addition is reported", () => {
    const check = checkCriterionSet(lock, ["ac-1", "ac-2", "ac-3", "ac-4"]);
    expect(check.admissible).toBe(true);
    expect(check.added).toEqual(["ac-4"]);
  });

  test("simultaneous add and remove is still refused", () => {
    const check = checkCriterionSet(lock, ["ac-1", "ac-2", "ac-4"]);
    expect(check.admissible).toBe(false);
    expect(check.removed).toEqual(["ac-3"]);
    expect(check.added).toEqual(["ac-4"]);
  });
});

describe("relockCriterionSet — refused once any verdict is attached", () => {
  test("re-lock before any verdict is admissible", () => {
    const decision = relockCriterionSet(["ac-1", "ac-2"], []);
    expect(decision.admissible).toBe(true);
    if (decision.admissible) {
      expect(decision.lock.criterion_ids).toEqual(["ac-1", "ac-2"]);
    }
  });

  test("re-lock after a single verdict is refused and names the judged ids", () => {
    const decision = relockCriterionSet(["ac-1", "ac-2"], ["ac-1"]);
    expect(decision.admissible).toBe(false);
    if (!decision.admissible) {
      expect(decision.reason).toContain("ac-1");
    }
  });
});
