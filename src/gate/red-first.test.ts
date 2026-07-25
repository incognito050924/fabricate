import { describe, expect, test } from "bun:test";
import { type RedFirstInput, checkRedFirst, hashTestContent } from "./red-first";

const frozenContent = 'test("goal predicate holds", () => { expect(run()).toBe(0); });';

const honest: RedFirstInput = {
  author: "external",
  observed_red_exit_code: 1,
  frozen_hash: hashTestContent(frozenContent),
  current_content: frozenContent,
};

describe("hashTestContent", () => {
  test("is deterministic over identical content", () => {
    expect(hashTestContent(frozenContent)).toBe(hashTestContent(frozenContent));
  });

  test("changes when content changes", () => {
    expect(hashTestContent(frozenContent)).not.toBe(hashTestContent(`${frozenContent} `));
  });
});

describe("checkRedFirst — the honest path", () => {
  test("accepts external author + observed red + intact frozen content", () => {
    const decision = checkRedFirst(honest);
    expect(decision.accepted).toBe(true);
    expect(decision.reasons).toEqual([]);
  });
});

describe("checkRedFirst — self-authored tests are void", () => {
  test("rejects when the loop wrote its own judging test", () => {
    const decision = checkRedFirst({ ...honest, author: "loop" });
    expect(decision.accepted).toBe(false);
    expect(decision.reasons.length).toBe(1);
  });
});

describe("checkRedFirst — red must have been actually observed", () => {
  test("rejects when no red run was ever recorded", () => {
    const decision = checkRedFirst({ ...honest, observed_red_exit_code: null });
    expect(decision.accepted).toBe(false);
  });

  test("rejects when the recorded run was not red (exit 0)", () => {
    const decision = checkRedFirst({ ...honest, observed_red_exit_code: 0 });
    expect(decision.accepted).toBe(false);
  });
});

describe("checkRedFirst — the frozen test must survive intact", () => {
  test("rejects when the frozen test file was deleted", () => {
    const decision = checkRedFirst({ ...honest, current_content: null });
    expect(decision.accepted).toBe(false);
  });

  test("rejects when the frozen test content changed (hash mismatch)", () => {
    const decision = checkRedFirst({
      ...honest,
      current_content: frozenContent.replace("toBe(0)", "toBe(run())"),
    });
    expect(decision.accepted).toBe(false);
  });
});

describe("checkRedFirst — violations accumulate", () => {
  test("reports every violated condition, not just the first", () => {
    const decision = checkRedFirst({
      author: "loop",
      observed_red_exit_code: null,
      frozen_hash: hashTestContent(frozenContent),
      current_content: null,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.reasons.length).toBe(3);
  });
});
