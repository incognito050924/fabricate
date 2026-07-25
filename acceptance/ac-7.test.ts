/**
 * ac-7 acceptance — question hygiene (red-frozen).
 *
 * Oracle (gate-a/rows/ac-7.json), covered clauses:
 *  (1) entailment-interrogation tagged fired question -> rejected with
 *      rejection.kind='entailment_interrogation' and reread_triggered=true
 *  (2) expression-rejection fixture -> reread_triggered is NOT true,
 *      distinguishing it from entailment interrogation (2-fixture contrast)
 *  (3) presupposition-interrogation tagged fixture -> routed to world_check,
 *      never surfaced as a user question; world check surfaces nothing on
 *      success and surfaces only on failure
 *  (4) a mixed rejection sequence is recorded as typed {kind, question_text, at}
 *      records (not an aggregate count) and is queryable by kind
 *  (5) a qualified discovery question (revises_goal_predicate present, ac-3
 *      qualification) is exempt from hygiene rejection: it passes and is not
 *      enrolled in the rejection log (carve-out — qualification takes
 *      precedence over any hygiene tag)
 *  (6) unknowns explicitly record the entailment/presupposition/implicature
 *      classifier circularity (same prior)
 *
 * Residual (NOT tested here, per row residual):
 *  - The correctness of the entailment/presupposition/implicature
 *    classification itself — the contract declares it mechanically
 *    undecidable; fixtures fix the classification via tags and this file
 *    asserts routing + recording only.
 *  - The resolution of the classifier circularity (classifier shares the
 *    prior of what it inspects) — only the presence and wording of the
 *    unknowns entry is asserted, not any resolution of the circularity.
 */
import { describe, expect, test } from "bun:test";
import { screenQuestion } from "../src/interview/question-hygiene";
import {
  createRejectionLog,
  listRejections,
  queryRejectionsByKind,
} from "../src/interview/rejection-log";
import { listUnknowns } from "../src/interview/unknowns";
import { runWorldCheck } from "../src/interview/world-check";

// Fixture tags fix the classification; the tests assert routing + recording only.
const entailmentFixture = {
  question_text: "옛 src 지울까요?",
  hygiene_tag: "entailment_interrogation",
} as const;

const secondEntailmentFixture = {
  question_text: "기존 파일은 삭제해도 되나요?",
  hygiene_tag: "entailment_interrogation",
} as const;

const expressionFixture = {
  question_text: "이거 그거 맞나요?",
  hygiene_tag: "expression",
} as const;

const presuppositionFixture = {
  question_text: "기존 테스트 스위트는 어디에 있나요?",
  hygiene_tag: "presupposition_interrogation",
} as const;

// Qualified discovery question (ac-3): revises_goal_predicate is named.
// Deliberately carries a would-reject hygiene tag so the carve-out is
// observable as precedence, not as a vacuous pass.
const qualifiedDiscoveryFixture = {
  question_text: "성능 상한을 충족 술어로 추가해야 하나요?",
  hygiene_tag: "entailment_interrogation",
  revises_goal_predicate: "goal-pred-perf-ceiling",
} as const;

describe("ac-7 clause 1 — entailment interrogation is rejected and triggers reread", () => {
  test("fired entailment-tagged question is rejected with kind='entailment_interrogation'", () => {
    const log = createRejectionLog();
    const result = screenQuestion(entailmentFixture, log);

    expect(result.route).toBe("rejected");
    if (result.route !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("entailment_interrogation");
    expect(result.rejection.question_text).toBe("옛 src 지울까요?");
    expect(result.rejection.reread_triggered).toBe(true);
  });

  test("the rejection is recorded in the log at screening time", () => {
    const log = createRejectionLog();
    screenQuestion(entailmentFixture, log);

    const entries = listRejections(log);
    expect(entries.length).toBe(1);
    expect(entries[0]?.kind).toBe("entailment_interrogation");
    expect(entries[0]?.question_text).toBe("옛 src 지울까요?");
  });
});

describe("ac-7 clause 2 — expression rejection is distinct: no reread trigger", () => {
  test("expression-tagged fixture is rejected without reread_triggered", () => {
    const log = createRejectionLog();
    const result = screenQuestion(expressionFixture, log);

    expect(result.route).toBe("rejected");
    if (result.route !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("expression");
    expect(result.rejection.reread_triggered).toBe(false);
  });

  test("two-fixture contrast: entailment reread=true vs expression reread=false", () => {
    const log = createRejectionLog();
    const entailment = screenQuestion(entailmentFixture, log);
    const expression = screenQuestion(expressionFixture, log);
    if (entailment.route !== "rejected" || expression.route !== "rejected") {
      throw new Error("both fixtures must be rejected for the contrast to hold");
    }

    expect(entailment.rejection.reread_triggered).toBe(true);
    expect(expression.rejection.reread_triggered).toBe(false);
    expect(entailment.rejection.reread_triggered).not.toBe(expression.rejection.reread_triggered);
  });
});

describe("ac-7 clause 3 — presupposition interrogation routes to world check, never to the user", () => {
  test("presupposition-tagged fixture routes to world_check and is not a user question", () => {
    const log = createRejectionLog();
    const result = screenQuestion(presuppositionFixture, log);

    expect(result.route).toBe("world_check");
    if (result.route !== "world_check") throw new Error("unreachable");
    // The routed check carries the question payload instead of asking the user.
    expect(result.check.question_text).toBe("기존 테스트 스위트는 어디에 있나요?");
    // Routing is not a rejection: nothing is enrolled in the rejection log.
    expect(listRejections(log).length).toBe(0);
  });

  test("world check success surfaces nothing to the user", () => {
    const outcome = runWorldCheck({
      question_text: presuppositionFixture.question_text,
      probe: () => true,
    });

    expect(outcome.passed).toBe(true);
    expect(outcome.surfaced).toBeNull();
  });

  test("world check failure is the only case that surfaces", () => {
    const outcome = runWorldCheck({
      question_text: presuppositionFixture.question_text,
      probe: () => false,
    });

    expect(outcome.passed).toBe(false);
    expect(typeof outcome.surfaced).toBe("string");
    if (typeof outcome.surfaced !== "string") throw new Error("unreachable");
    expect(outcome.surfaced.length).toBeGreaterThan(0);
  });
});

describe("ac-7 clause 4 — mixed rejection sequence: typed records, queryable by kind", () => {
  const buildMixedLog = () => {
    const log = createRejectionLog();
    screenQuestion(entailmentFixture, log);
    screenQuestion(expressionFixture, log);
    screenQuestion(secondEntailmentFixture, log);
    return log;
  };

  test("each rejection is a {kind, question_text, at} record, not an aggregate count", () => {
    const entries = listRejections(buildMixedLog());

    expect(entries.length).toBe(3);
    for (const entry of entries) {
      expect(typeof entry.kind).toBe("string");
      expect(typeof entry.question_text).toBe("string");
      expect(entry.question_text.length).toBeGreaterThan(0);
      expect(typeof entry.at).toBe("string");
      expect(Number.isNaN(Date.parse(entry.at))).toBe(false);
    }
  });

  test("records preserve firing order and each carries its own question text verbatim", () => {
    const entries = listRejections(buildMixedLog());

    expect(entries.map((e) => e.kind)).toEqual([
      "entailment_interrogation",
      "expression",
      "entailment_interrogation",
    ]);
    expect(entries.map((e) => e.question_text)).toEqual([
      "옛 src 지울까요?",
      "이거 그거 맞나요?",
      "기존 파일은 삭제해도 되나요?",
    ]);
  });

  test("querying by kind returns exactly the records of that kind", () => {
    const log = buildMixedLog();

    const entailments = queryRejectionsByKind(log, "entailment_interrogation");
    expect(entailments.length).toBe(2);
    expect(entailments.map((e) => e.question_text)).toEqual([
      "옛 src 지울까요?",
      "기존 파일은 삭제해도 되나요?",
    ]);

    const expressions = queryRejectionsByKind(log, "expression");
    expect(expressions.length).toBe(1);
    expect(expressions[0]?.question_text).toBe("이거 그거 맞나요?");

    expect(queryRejectionsByKind(log, "presupposition_interrogation")).toEqual([]);
  });
});

describe("ac-7 clause 5 — qualified discovery question carve-out", () => {
  test("revises_goal_predicate exempts the question from hygiene rejection", () => {
    const log = createRejectionLog();
    const result = screenQuestion(qualifiedDiscoveryFixture, log);

    // It passes through to the user instead of being hygiene-rejected...
    expect(result.route).toBe("ask_user");
    // ...and is not enrolled in the rejection log.
    expect(listRejections(log).length).toBe(0);
  });

  test("the same tag without qualification is still rejected (carve-out is the difference)", () => {
    const log = createRejectionLog();
    const unqualified = screenQuestion(
      {
        question_text: qualifiedDiscoveryFixture.question_text,
        hygiene_tag: qualifiedDiscoveryFixture.hygiene_tag,
      },
      log,
    );

    expect(unqualified.route).toBe("rejected");
    expect(listRejections(log).length).toBe(1);
  });
});

describe("ac-7 clause 6 — unknowns record the classifier circularity", () => {
  test("an unknowns entry names the entailment/presupposition/implicature classifier circularity (same prior)", () => {
    const unknowns = listUnknowns();
    expect(unknowns.length).toBeGreaterThan(0);

    const circularity = unknowns.filter((entry) => entry.description.includes("분류기 순환"));
    expect(circularity.length).toBe(1);

    const description = circularity[0]?.description ?? "";
    expect(description).toContain("같은 prior");
    expect(description).toContain("수반");
    expect(description).toContain("전제");
    expect(description).toContain("함축");
  });
});
