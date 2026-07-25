/**
 * Acceptance test for ac-G3 — cap-rejection regression guard: question count
 * alone can never terminate an interview, and the cap must not be reintroduced
 * into the termination / completion judgment (regression assertions layered on
 * ac-4 "completion == goal establishment" and ac-6 "convergence visibility").
 *
 * Oracle source: gate-a/rows/ac-G3.json (oracle_statement clauses 1-4):
 *  (1) cap cannot terminate — with the question count past a cap threshold, a
 *      termination attempt grounded ONLY on the question count returns a
 *      refusal and the session is not terminated;
 *  (2) cap-reintroduction regression guard — two fixtures with identical
 *      goal_state satisfaction that differ ONLY in question count (few vs past
 *      the cap) produce the identical termination decision, pinning the fact
 *      that the question count is not an input to that decision;
 *  (3) ac-4 regression — past the cap, a fixture with unsatisfied predicates
 *      still gets pass:false from goalStateGate AND is still blocked on both
 *      close paths (completion is never replaced or relaxed by the count);
 *  (4) ac-6 regression — past the cap, the IntentSummary render still
 *      enumerates the M unsatisfied predicates in remaining_gap with count == M
 *      (reaching the cap never erases the remaining-gap display).
 *
 * How the guard is kept non-vacuous:
 *  - the discriminating variable is asserted to actually survive session
 *    construction (a session builder that strips `questions_asked` would make
 *    every below-vs-past-cap equality trivially true, so that is checked
 *    directly before the equalities are trusted);
 *  - below-vs-past-cap "identical decision" is compared over the WHOLE
 *    termination result, not a hand-picked projection. Fields that are
 *    legitimately nondeterministic (generated ids, wall-clock stamps) are
 *    discovered empirically by concluding two sessions built from the same
 *    inputs and diffing them; only those paths are excused. Any count-derived
 *    difference anywhere else in the payload therefore fails the test.
 *
 * Frozen red test (piece 2). Every module imported below is planned and does
 * not exist yet; the piece-3 implementation must turn this file green without
 * editing it. `src/interview/close/work.ts` and `src/interview/close/stop.ts`
 * are not literally listed in ac-G3's own module_plan but are the close paths
 * named by oracle clause (3) ("goalStateGate가 여전히 pass:false로 close를
 * 차단한다"); they come from the module_plan of ac-4, which this row declares in
 * depends_on. Asserting the gate verdict alone would leave the close paths as
 * an uncovered site for exactly the cap reintroduction this criterion forbids.
 *
 * Residual: gate-a/rows/ac-G3.json declares residual: [] — the passage itself
 * states "전부 — cap→종결 불가 회귀 단언(순수 회귀 가드). 잔여: 없음", so every
 * clause above is asserted here. The only part of the oracle_statement not
 * assertable from inside this file is its method wrapper ("bun test ... exit
 * 0"), which is the gate's run, not a predicate of the code under test.
 */

import { describe, expect, test } from "bun:test";
import { closeStop } from "../src/interview/close/stop";
import { closeWork } from "../src/interview/close/work";
import { goalStateGate } from "../src/interview/goal-state-gate";
import { renderIntentSummary } from "../src/interview/intent-summary";
import { createInterviewSession } from "../src/interview/session";
import { concludeInterview } from "../src/interview/termination";

// --- Cap fixture constants ---------------------------------------------------
// The cap threshold lives ONLY in this fixture. Nothing in the implementation
// is allowed to consult it: that is the whole point of the regression guard.
// Both numbers are chosen so that their decimal spellings occur nowhere in the
// fixture data (no timestamp, id or Korean statement below contains "17" or
// "41"), which makes the leak assertions below meaningful rather than lucky.
const QUESTION_CAP = 17;
const BELOW_CAP_QUESTIONS = 3;
const OVER_CAP_QUESTIONS = 41;

if (!(BELOW_CAP_QUESTIONS < QUESTION_CAP && OVER_CAP_QUESTIONS > QUESTION_CAP)) {
  throw new Error("fixture invalid: one count must sit below the cap and one past it");
}

// --- Goal-state predicates (ac-6 render shape) -------------------------------

type RenderPredicate = {
  id: string;
  statement: string;
  verification_means: string;
  satisfied: boolean;
};

const P_TRIGGER: RenderPredicate = {
  id: "pred-trigger-monday",
  statement: "매주 월요일 09시에 발송 파이프라인이 자동 실행된다",
  verification_means: "스케줄러 로그에 월요일 09시 실행 기록 확인",
  satisfied: true,
};

const P_RETRY: RenderPredicate = {
  id: "pred-retry-policy",
  statement: "발송 실패는 최대 3회까지 재시도된다",
  verification_means: "재시도 카운터가 3에서 멈추는지 확인",
  satisfied: false,
};

const P_LOCALE: RenderPredicate = {
  id: "pred-locale-korean",
  statement: "알림 본문이 한국어로 렌더된다",
  verification_means: "발송 본문 첫 문단 언어 검사",
  satisfied: false,
};

// M = 2 unsatisfied predicates out of 3.
const TWO_GAP_PREDICATES: RenderPredicate[] = [P_TRIGGER, P_RETRY, P_LOCALE];
// M = 3 — same set, nothing satisfied.
const THREE_GAP_PREDICATES: RenderPredicate[] = [
  { ...P_TRIGGER, satisfied: false },
  P_RETRY,
  P_LOCALE,
];
// M = 0 — the goal is fully established.
const ZERO_GAP_PREDICATES: RenderPredicate[] = TWO_GAP_PREDICATES.map((predicate) => ({
  ...predicate,
  satisfied: true,
}));

type InterviewSession = { questions_asked?: unknown } & Record<string, unknown>;

const buildSession = (predicates: RenderPredicate[], questionsAsked: number): InterviewSession =>
  createInterviewSession({
    source_request: "매주 월요일 아침 팀에 발송 리포트를 보내줘",
    questions_asked: questionsAsked,
    goal_state: {
      derived_at: "2026-07-25T08:59:00.000Z",
      confirmed: true,
      predicates,
    },
    confirmations: [
      {
        predicate_id: P_TRIGGER.id,
        utterance: "네, 월요일 09시 자동 실행이면 됩니다",
        confirmed_at: "2026-07-25T09:00:00.000Z",
      },
    ],
    autonomous_decisions: [
      {
        decided_at: "2026-07-25T09:05:00.000Z",
        description: "발송 본문 인코딩은 UTF-8로 자율 결정",
        fork_class: "other",
      },
    ],
  }) as InterviewSession;

// --- Whole-payload comparison utilities --------------------------------------
// `diffPaths` lists every leaf path at which two values disagree; `prune`
// replaces the listed paths with a sentinel so that two payloads can be
// compared in full while excusing exactly the paths that are nondeterministic
// by construction (discovered, not guessed — see `volatilePathsOfTermination`).

const VOLATILE = "<volatile>";

const childPath = (prefix: string, key: string) => (prefix ? `${prefix}.${key}` : key);

const isPlainContainer = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const diffPaths = (left: unknown, right: unknown, prefix = ""): string[] => {
  if (Object.is(left, right)) return [];
  if (!isPlainContainer(left) || !isPlainContainer(right)) return [prefix];
  if (Array.isArray(left) !== Array.isArray(right)) return [prefix];
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].flatMap((key) => diffPaths(left[key], right[key], childPath(prefix, key)));
};

const prune = (value: unknown, volatile: ReadonlySet<string>, prefix = ""): unknown => {
  if (volatile.has(prefix)) return VOLATILE;
  if (!isPlainContainer(value)) return value;
  if (Array.isArray(value)) {
    return value.map((entry, index) => prune(entry, volatile, childPath(prefix, String(index))));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      prune(entry, volatile, childPath(prefix, key)),
    ]),
  );
};

// --- Termination decision projection -----------------------------------------
// Kept only for the field-by-field assertions; the below-vs-past-cap equality
// checks compare the FULL payload (see above).

type TerminationResult = {
  concluded: boolean;
  outcome?: string;
  reason?: string | null;
  exit?: string | null;
};

const decisionOf = (result: TerminationResult) => ({
  concluded: result.concluded,
  outcome: result.outcome ?? null,
  reason: result.reason ?? null,
  exit: result.exit ?? null,
});

const DECISION_FIELDS = ["concluded", "outcome", "reason", "exit"] as const;

const GOAL_BASIS = { exit: "build", basis: "goal_state" } as const;

const conclude = (predicates: RenderPredicate[], questionsAsked: number): TerminationResult =>
  concludeInterview(buildSession(predicates, questionsAsked), GOAL_BASIS);

// Two sessions built from identical inputs must yield the same decision; the
// paths at which their results still disagree are the implementation's own
// nondeterminism (generated ids, wall-clock stamps) and are the ONLY paths
// excused from the below-vs-past-cap comparison.
const volatilePathsOfTermination = (
  predicates: RenderPredicate[],
  questionsAsked: number,
): ReadonlySet<string> =>
  new Set(diffPaths(conclude(predicates, questionsAsked), conclude(predicates, questionsAsked)));

const assertVolatilityIsNarrow = (volatile: ReadonlySet<string>) => {
  // The root itself must be stable, otherwise pruning would blank everything.
  expect(volatile.has("")).toBe(false);
  for (const field of DECISION_FIELDS) {
    expect(volatile.has(field)).toBe(false);
  }
};

// --- Gate fixtures (ac-4 item shape) -----------------------------------------

const passingCompletion = {
  contract_id: "cc-acG3-pass",
  criteria: [{ id: "cc-1", status: "pass", evidence: ["test"] }],
};

const gateGoalState = (satisfiedIds: string[]) => ({
  derived_at: "2026-07-25T08:59:00.000Z",
  confirmed: true,
  predicates: [P_TRIGGER, P_RETRY, P_LOCALE].map((predicate) => ({
    id: predicate.id,
    statement: predicate.statement,
    verification_means: predicate.verification_means,
    judge: "oracle",
  })),
  _satisfied: satisfiedIds,
});

const buildGateItem = (satisfiedIds: string[], questionsAsked: number) => {
  const goal_state = gateGoalState(satisfiedIds);
  const { _satisfied, ...persisted } = goal_state;
  return {
    id: `wi-acG3-count-${satisfiedIds.length}`,
    questions_asked: questionsAsked,
    goal_state: persisted,
    oracle_satisfaction: persisted.predicates.map((predicate) => ({
      predicate_id: predicate.id,
      satisfied: _satisfied.includes(predicate.id),
      checked_at: "2026-07-25T10:00:00.000Z",
    })),
    user_judgments: [],
  };
};

type CloseResult = { closed: boolean; blocked_by: string | null };

const closeVerdict = (result: CloseResult) => ({
  closed: result.closed,
  blocked_by: result.blocked_by,
});

const SATISFIED_ALL = [P_TRIGGER.id, P_RETRY.id, P_LOCALE.id];
const SATISFIED_ONLY_TRIGGER = [P_TRIGGER.id];

// =============================================================================
// Clause 1 — question count alone cannot terminate
// =============================================================================

describe("ac-G3 clause 1: a termination grounded only on the question count is refused", () => {
  test("past the cap, basis='question_count' is refused through exit='build'", () => {
    const session = buildSession(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const attempt: TerminationResult = concludeInterview(session, {
      exit: "build",
      basis: "question_count",
    });
    expect(attempt.concluded).toBe(false);
    expect(attempt.outcome).toBe("refused");
    expect(attempt.reason).toBe("question-count-alone-cannot-terminate");
  });

  test("past the cap, basis='question_count' is refused through exit='aporia_or_rescope' too", () => {
    const session = buildSession(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const attempt: TerminationResult = concludeInterview(session, {
      exit: "aporia_or_rescope",
      basis: "question_count",
    });
    expect(attempt.concluded).toBe(false);
    expect(attempt.outcome).toBe("refused");
    expect(attempt.reason).toBe("question-count-alone-cannot-terminate");
  });

  test("the refused attempt terminates nothing: no exit is taken and the session is untouched", () => {
    const session = buildSession(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const before = JSON.stringify(session);
    const attempt: TerminationResult = concludeInterview(session, {
      exit: "build",
      basis: "question_count",
    });
    expect(attempt.exit ?? null).toBeNull();
    expect(JSON.stringify(session)).toBe(before);
  });

  test("even with the goal fully established, the question count is still not a valid ground", () => {
    const session = buildSession(ZERO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const attempt: TerminationResult = concludeInterview(session, {
      exit: "build",
      basis: "question_count",
    });
    expect(attempt.concluded).toBe(false);
    expect(attempt.reason).toBe("question-count-alone-cannot-terminate");
  });
});

// =============================================================================
// Clause 2 — cap-reintroduction regression guard
// =============================================================================

describe("ac-G3 clause 2: the question count is not an input to the termination decision", () => {
  test("the discriminating variable really reaches the object under test", () => {
    // Without this, a session builder that drops `questions_asked` would make
    // every equality below vacuously true and pin nothing at all.
    const below = buildSession(TWO_GAP_PREDICATES, BELOW_CAP_QUESTIONS);
    const over = buildSession(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    expect(below.questions_asked).toBe(BELOW_CAP_QUESTIONS);
    expect(over.questions_asked).toBe(OVER_CAP_QUESTIONS);
    expect(diffPaths(below, over)).toContain("questions_asked");
    expect(JSON.stringify(over)).toContain(String(OVER_CAP_QUESTIONS));
  });

  test("goal established: few questions and past-cap questions yield the identical decision", () => {
    const below = conclude(ZERO_GAP_PREDICATES, BELOW_CAP_QUESTIONS);
    const over = conclude(ZERO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const volatile = volatilePathsOfTermination(ZERO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    assertVolatilityIsNarrow(volatile);
    // Whole payload, not a projection: a shortfall_disclosure, a warning entry
    // or a differing basis echo derived from the count fails here too.
    expect(prune(over, volatile)).toEqual(prune(below, volatile));
    expect(below.concluded).toBe(true);
    expect(over.concluded).toBe(true);
    expect(over.exit).toBe("build");
  });

  test("goal not established: few questions and past-cap questions yield the identical decision", () => {
    const below = conclude(TWO_GAP_PREDICATES, BELOW_CAP_QUESTIONS);
    const over = conclude(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const volatile = volatilePathsOfTermination(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    assertVolatilityIsNarrow(volatile);
    expect(prune(over, volatile)).toEqual(prune(below, volatile));
    expect(below.concluded).toBe(false);
    expect(over.concluded).toBe(false);
    expect(over.outcome).toBe("refused");
  });

  test("the decision is a real function of goal establishment, not a constant", () => {
    const established = conclude(ZERO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const unestablished = conclude(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    expect(decisionOf(established)).not.toEqual(decisionOf(unestablished));
  });

  test("no question count leaks into the termination payload", () => {
    const over = conclude(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    const volatile = volatilePathsOfTermination(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS);
    assertVolatilityIsNarrow(volatile);
    // Nondeterministic paths are blanked so a random id containing "41" cannot
    // make this flaky; everything the implementation actually decided remains.
    const serialized = JSON.stringify(prune(over, volatile));
    expect(serialized).not.toContain(String(OVER_CAP_QUESTIONS));
    expect(serialized).not.toContain(String(QUESTION_CAP));
    expect(serialized).not.toContain("questions_asked");
    expect(serialized.toLowerCase()).not.toContain("cap");
  });
});

// =============================================================================
// Clause 3 — ac-4 regression: completion is never relaxed by the question count
// =============================================================================

describe("ac-G3 clause 3: past the cap, unsatisfied predicates still block close", () => {
  test("gate stays pass:false and names every unsatisfied predicate", () => {
    const item = buildGateItem(SATISFIED_ONLY_TRIGGER, OVER_CAP_QUESTIONS);
    expect(item.questions_asked).toBe(OVER_CAP_QUESTIONS);
    const gate = goalStateGate(item, passingCompletion);
    expect(gate.pass).toBe(false);
    expect(gate.reasons.length).toBeGreaterThan(0);
    expect(gate.reasons.some((reason: string) => reason.includes(P_RETRY.id))).toBe(true);
    expect(gate.reasons.some((reason: string) => reason.includes(P_LOCALE.id))).toBe(true);
  });

  test("the gate verdict is identical below the cap and past it", () => {
    const below = goalStateGate(
      buildGateItem(SATISFIED_ONLY_TRIGGER, BELOW_CAP_QUESTIONS),
      passingCompletion,
    );
    const over = goalStateGate(
      buildGateItem(SATISFIED_ONLY_TRIGGER, OVER_CAP_QUESTIONS),
      passingCompletion,
    );
    expect({ pass: over.pass, reasons: over.reasons }).toEqual({
      pass: below.pass,
      reasons: below.reasons,
    });
  });

  test("past the cap, BOTH close paths are still blocked by the goal-state gate", () => {
    // The gate verdict alone is not enough: a cap sited in the close path
    // (e.g. closeWork short-circuiting the gate once the count passes a cap)
    // would leave the gate assertions above green while close proceeds.
    const item = buildGateItem(SATISFIED_ONLY_TRIGGER, OVER_CAP_QUESTIONS);
    const work: CloseResult = closeWork(item, passingCompletion);
    const stop: CloseResult = closeStop(item, passingCompletion);
    expect(work.closed).toBe(false);
    expect(work.blocked_by).toBe("goal_state_gate");
    expect(stop.closed).toBe(false);
    expect(stop.blocked_by).toBe("goal_state_gate");
  });

  test("the close verdict on both paths is identical below the cap and past it", () => {
    const belowItem = buildGateItem(SATISFIED_ONLY_TRIGGER, BELOW_CAP_QUESTIONS);
    const overItem = buildGateItem(SATISFIED_ONLY_TRIGGER, OVER_CAP_QUESTIONS);
    expect(closeVerdict(closeWork(overItem, passingCompletion))).toEqual(
      closeVerdict(closeWork(belowItem, passingCompletion)),
    );
    expect(closeVerdict(closeStop(overItem, passingCompletion))).toEqual(
      closeVerdict(closeStop(belowItem, passingCompletion)),
    );
  });

  test("past the cap, satisfying every predicate still closes: the count neither blocks nor closes", () => {
    const item = buildGateItem(SATISFIED_ALL, OVER_CAP_QUESTIONS);
    const work: CloseResult = closeWork(item, passingCompletion);
    const stop: CloseResult = closeStop(item, passingCompletion);
    expect(work.closed).toBe(true);
    expect(work.blocked_by).toBe(null);
    expect(stop.closed).toBe(true);
    expect(stop.blocked_by).toBe(null);
  });

  test("contrast: satisfying the predicates — not asking more questions — is what lifts the gate", () => {
    const stillBlocked = goalStateGate(
      buildGateItem(SATISFIED_ONLY_TRIGGER, OVER_CAP_QUESTIONS),
      passingCompletion,
    );
    const lifted = goalStateGate(
      buildGateItem(SATISFIED_ALL, BELOW_CAP_QUESTIONS),
      passingCompletion,
    );
    expect(stillBlocked.pass).toBe(false);
    expect(lifted.pass).toBe(true);
    expect(lifted.reasons).toEqual([]);
    expect(
      closeWork(buildGateItem(SATISFIED_ALL, BELOW_CAP_QUESTIONS), passingCompletion).closed,
    ).toBe(true);
  });
});

// =============================================================================
// Clause 4 — ac-6 regression: reaching the cap never erases the remaining gap
// =============================================================================

describe("ac-G3 clause 4: past the cap, remaining_gap still enumerates the M unsatisfied predicates", () => {
  test("M=2 past the cap: the two unsatisfied predicates are listed verbatim and count == 2", () => {
    const summary = renderIntentSummary(buildSession(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS));
    expect(summary.remaining_gap.count).toBe(2);
    const gapIds = summary.remaining_gap.predicates.map((p: { id: string }) => p.id).sort();
    expect(gapIds).toEqual([P_LOCALE.id, P_RETRY.id].sort());
    const gapStatements = summary.remaining_gap.predicates
      .map((p: { statement: string }) => p.statement)
      .sort();
    expect(gapStatements).toEqual(
      ["발송 실패는 최대 3회까지 재시도된다", "알림 본문이 한국어로 렌더된다"].sort(),
    );
  });

  test("M=3 past the cap: count follows M upward — no cap-driven truncation", () => {
    const summary = renderIntentSummary(buildSession(THREE_GAP_PREDICATES, OVER_CAP_QUESTIONS));
    expect(summary.remaining_gap.count).toBe(3);
    const gapIds = summary.remaining_gap.predicates.map((p: { id: string }) => p.id).sort();
    expect(gapIds).toEqual([P_LOCALE.id, P_RETRY.id, P_TRIGGER.id].sort());
  });

  test("the rendered gap is identical below the cap and past it", () => {
    const below = renderIntentSummary(buildSession(TWO_GAP_PREDICATES, BELOW_CAP_QUESTIONS));
    const over = renderIntentSummary(buildSession(TWO_GAP_PREDICATES, OVER_CAP_QUESTIONS));
    expect(over.remaining_gap).toEqual(below.remaining_gap);
  });
});
