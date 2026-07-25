/**
 * Acceptance test for ac-G1 — the fact-vs-decision rule: an environment-
 * checkable fact is routed to a world_check / subagent lookup and is never
 * asked of the user; it surfaces only when the lookup fails.
 *
 * Frozen red: src/interview/question-routing.ts and src/interview/world-check.ts
 * do not exist yet. Slice 3 must implement them so this file turns green; these
 * assertions are the completion definition of ac-G1.
 *
 * Oracle clauses covered (gate-a/rows/ac-G1.json oracle_statement):
 *  (1) a fixture tagged as an environment-checkable fact, fed to the router,
 *      leaves a world_check / subagent-lookup record while the count of fired
 *      user questions stays 0 (fact -> world_check, never asked of the user);
 *      the contrast fixture tagged as a user decision is the one that becomes a
 *      fired user question, and an untagged question is refused fail-closed
 *      rather than fired;
 *  (2) a fixture whose world_check lookup succeeds produces 0 user-surfacing
 *      records; only the fixture whose lookup fails produces a surfacing
 *      record, and the surfaced text preserves the question verbatim;
 *  (3) the routing is the general rule, not ac-7's presupposition-interrogation
 *      -only path: a plain (non-presupposition) fact question fixture routes to
 *      world_check identically, with the same route and lookup kind.
 *
 * Residual clause NOT tested here (per gate-a/rows/ac-G1.json residual):
 *  - The 'fact vs decision' classification itself is mechanically undecidable
 *    and inherits ac-7's classifier circularity (the classifier shares the
 *    prior of what it inspects). This file consumes the classification as a
 *    fixture tag input and asserts routing plus surfacing only; whether a real
 *    utterance is classified correctly is not closed by this criterion.
 */
import { describe, expect, test } from "bun:test";
import {
  createRoutingLog,
  listSurfacedFacts,
  listUserQuestions,
  listWorldCheckLookups,
  resolveRoutedCheck,
  routeQuestion,
} from "../src/interview/question-routing";
import { runWorldCheck } from "../src/interview/world-check";

// Fixture tags fix the fact/decision classification (residual); the tests
// assert routing and surfacing only.

// An environment-checkable fact that arrives via ac-7's presupposition path.
const presuppositionFactFixture = {
  question_text: "기존 테스트 스위트는 어디에 있나요?",
  fact_tag: "environment_checkable_fact",
  origin: "presupposition_interrogation",
} as const;

// An environment-checkable fact that is a plain question, not a presupposition
// interrogation — the fixture that proves the rule is general (clause 3).
const generalFactFixture = {
  question_text: "이 저장소의 패키지 매니저는 무엇인가요?",
  fact_tag: "environment_checkable_fact",
  origin: "general_fact_question",
} as const;

const secondGeneralFactFixture = {
  question_text: "빌드 스크립트 이름은 무엇인가요?",
  fact_tag: "environment_checkable_fact",
  origin: "general_fact_question",
} as const;

// A user decision cannot be looked up in the environment — it is the contrast
// that keeps "route everything to world_check" from passing vacuously.
const decisionFixture = {
  question_text: "보관함을 어디에 만들까요?",
  fact_tag: "user_decision",
  origin: "general_fact_question",
} as const;

const untaggedFixture = {
  question_text: "이 값은 어떻게 정할까요?",
} as const;

describe("ac-G1 clause 1 — an environment-checkable fact routes to world_check and is never asked", () => {
  test("the fact fixture routes to world_check and leaves a subagent-lookup record", () => {
    const log = createRoutingLog();
    const result = routeQuestion(generalFactFixture, log);

    expect(result.route).toBe("world_check");
    if (result.route !== "world_check") throw new Error("unreachable");
    expect(result.check.question_text).toBe("이 저장소의 패키지 매니저는 무엇인가요?");
    expect(result.check.lookup_kind).toBe("subagent_lookup");

    const lookups = listWorldCheckLookups(log);
    expect(lookups.length).toBe(1);
    expect(lookups[0]?.question_text).toBe("이 저장소의 패키지 매니저는 무엇인가요?");
    expect(lookups[0]?.lookup_kind).toBe("subagent_lookup");
  });

  test("routing the fact fires zero user questions", () => {
    const log = createRoutingLog();
    routeQuestion(generalFactFixture, log);
    routeQuestion(presuppositionFactFixture, log);

    expect(listUserQuestions(log).length).toBe(0);
  });

  test("the lookup counter increments per routed fact, in order, each text verbatim", () => {
    const log = createRoutingLog();
    expect(listWorldCheckLookups(log).length).toBe(0);

    routeQuestion(generalFactFixture, log);
    expect(listWorldCheckLookups(log).length).toBe(1);

    routeQuestion(secondGeneralFactFixture, log);
    expect(listWorldCheckLookups(log).length).toBe(2);

    expect(listWorldCheckLookups(log).map((entry) => entry.question_text)).toEqual([
      "이 저장소의 패키지 매니저는 무엇인가요?",
      "빌드 스크립트 이름은 무엇인가요?",
    ]);
  });

  test("a user-decision fixture is the one that becomes a fired user question", () => {
    const log = createRoutingLog();
    const result = routeQuestion(decisionFixture, log);

    expect(result.route).toBe("ask_user");
    expect(listWorldCheckLookups(log).length).toBe(0);

    const asked = listUserQuestions(log);
    expect(asked.length).toBe(1);
    expect(asked[0]?.question_text).toBe("보관함을 어디에 만들까요?");
  });

  test("an untagged question is refused fail-closed instead of being fired at the user", () => {
    const log = createRoutingLog();
    const result = routeQuestion(untaggedFixture, log);

    expect(result.route).toBe("refused");
    if (result.route !== "refused") throw new Error("unreachable");
    expect(result.reason).toContain("태그");
    expect(listUserQuestions(log).length).toBe(0);
    expect(listWorldCheckLookups(log).length).toBe(0);
  });
});

describe("ac-G1 clause 2 — surfacing happens only when the world_check lookup fails", () => {
  const routeFact = () => {
    const log = createRoutingLog();
    const result = routeQuestion(generalFactFixture, log);
    if (result.route !== "world_check")
      throw new Error("the fact fixture must route to world_check");
    return { log, check: result.check };
  };

  test("a successful lookup surfaces nothing and records no surfacing", () => {
    const { log, check } = routeFact();
    const outcome = resolveRoutedCheck(log, check, () => true);

    expect(outcome.passed).toBe(true);
    expect(outcome.surfaced).toBeNull();
    expect(listSurfacedFacts(log).length).toBe(0);
    expect(listUserQuestions(log).length).toBe(0);
  });

  test("a failed lookup is the only case that records a surfacing, preserving the text verbatim", () => {
    const { log, check } = routeFact();
    const outcome = resolveRoutedCheck(log, check, () => false);

    expect(outcome.passed).toBe(false);
    expect(typeof outcome.surfaced).toBe("string");
    if (typeof outcome.surfaced !== "string") throw new Error("unreachable");
    expect(outcome.surfaced).toContain("이 저장소의 패키지 매니저는 무엇인가요?");

    const surfaced = listSurfacedFacts(log);
    expect(surfaced.length).toBe(1);
    expect(surfaced[0]?.question_text).toBe("이 저장소의 패키지 매니저는 무엇인가요?");
  });

  test("across a success and a failure only the failure is surfaced", () => {
    const log = createRoutingLog();
    const success = routeQuestion(generalFactFixture, log);
    const failure = routeQuestion(secondGeneralFactFixture, log);
    if (success.route !== "world_check" || failure.route !== "world_check") {
      throw new Error("both fact fixtures must route to world_check");
    }

    resolveRoutedCheck(log, success.check, () => true);
    resolveRoutedCheck(log, failure.check, () => false);

    expect(listWorldCheckLookups(log).length).toBe(2);
    expect(listSurfacedFacts(log).map((entry) => entry.question_text)).toEqual([
      "빌드 스크립트 이름은 무엇인가요?",
    ]);
  });

  test("the underlying world check itself surfaces on failure only", () => {
    const passing = runWorldCheck({
      question_text: generalFactFixture.question_text,
      probe: () => true,
    });
    expect(passing.passed).toBe(true);
    expect(passing.surfaced).toBeNull();

    const failing = runWorldCheck({
      question_text: generalFactFixture.question_text,
      probe: () => false,
    });
    expect(failing.passed).toBe(false);
    expect(typeof failing.surfaced).toBe("string");
    if (typeof failing.surfaced !== "string") throw new Error("unreachable");
    expect(failing.surfaced).toContain("이 저장소의 패키지 매니저는 무엇인가요?");
  });
});

describe("ac-G1 clause 3 — the rule is general, not ac-7's presupposition-only path", () => {
  test("a non-presupposition fact question routes to world_check exactly like the presupposition one", () => {
    const presuppositionLog = createRoutingLog();
    const generalLog = createRoutingLog();

    const viaPresupposition = routeQuestion(presuppositionFactFixture, presuppositionLog);
    const viaGeneral = routeQuestion(generalFactFixture, generalLog);

    expect(viaPresupposition.route).toBe("world_check");
    expect(viaGeneral.route).toBe("world_check");
    expect(viaGeneral.route).toBe(viaPresupposition.route);
    if (viaPresupposition.route !== "world_check" || viaGeneral.route !== "world_check") {
      throw new Error("unreachable");
    }
    expect(viaGeneral.check.lookup_kind).toBe(viaPresupposition.check.lookup_kind);
    expect(viaGeneral.check.lookup_kind).toBe("subagent_lookup");
  });

  test("the general fact question is asked of the world, not of the user, and surfaces only on failure", () => {
    const log = createRoutingLog();
    const routed = routeQuestion(generalFactFixture, log);
    if (routed.route !== "world_check") throw new Error("unreachable");

    expect(listUserQuestions(log).length).toBe(0);
    expect(listWorldCheckLookups(log).length).toBe(1);

    resolveRoutedCheck(log, routed.check, () => true);
    expect(listSurfacedFacts(log).length).toBe(0);
    expect(listUserQuestions(log).length).toBe(0);
  });

  test("origin does not change the outcome: both origins keep user questions at zero", () => {
    const log = createRoutingLog();
    routeQuestion(presuppositionFactFixture, log);
    routeQuestion(generalFactFixture, log);

    expect(listWorldCheckLookups(log).map((entry) => entry.question_text)).toEqual([
      "기존 테스트 스위트는 어디에 있나요?",
      "이 저장소의 패키지 매니저는 무엇인가요?",
    ]);
    expect(listUserQuestions(log).length).toBe(0);
  });
});
