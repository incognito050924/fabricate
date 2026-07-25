/**
 * ac-6 — convergence visibility: IntentSummary renders, in one single render,
 * the four surfaces goal_state / confirmed / remaining_gap / autonomous_decisions.
 *
 * Frozen red acceptance test. The modules imported below do not exist yet
 * (module_plan of gate-a/rows/ac-6.json); slice-3 implementation must make
 * this file green without modifying it.
 *
 * Deterministic clauses covered (oracle_statement of gate-a/rows/ac-6.json):
 *  (1) a SINGLE render output simultaneously contains the four keys
 *      goal_state, confirmed, remaining_gap, autonomous_decisions
 *      (scattering them over four separate renders must fail);
 *  (2) the goal_state section is non-empty;
 *  (3) the confirmed section exists and is preserved exactly as the
 *      confirmation records already made in the session;
 *  (4) remaining_gap enumerates the M unsatisfied predicates recorded in the
 *      fixture and its count equals exactly M — and count follows M when the
 *      fixture changes M (hardcoding a count is impossible);
 *  (5) autonomous_decisions has length >= 1 (log length is deterministic).
 *
 * Residual clauses intentionally NOT tested (declared residual in the row):
 *  - semantic completeness of the remaining gap — whether remaining_gap
 *    captures every real gap is a human judgment; the machine only checks the
 *    enumeration and count against the recorded unsatisfied predicate set;
 *  - semantic accuracy of autonomous_decisions entry contents — whether each
 *    log entry correctly describes a real autonomous decision is not checked;
 *    the contract declares only the log length deterministic.
 */
import { describe, expect, test } from "bun:test";
import { renderIntentSummary } from "../src/interview/intent-summary";
import { computeRemainingGap } from "../src/interview/remaining-gap";
import { createInterviewSession } from "../src/interview/session";

type FixturePredicate = {
  id: string;
  statement: string;
  verification_means: string;
  satisfied: boolean;
};

const PREDICATE_REPORT: FixturePredicate = {
  id: "pred-report-generated",
  statement: "주간 리포트 파일이 out/report.md에 생성된다",
  verification_means: "bun run report 실행 후 out/report.md 존재 확인",
  satisfied: true,
};

const PREDICATE_KOREAN: FixturePredicate = {
  id: "pred-summary-korean",
  statement: "리포트 본문이 한국어로 렌더된다",
  verification_means: "out/report.md 첫 문단 언어 검사",
  satisfied: false,
};

const PREDICATE_MAIL: FixturePredicate = {
  id: "pred-mail-sent",
  statement: "리포트 링크가 팀 메일로 발송된다",
  verification_means: "메일 발송 로그에 리포트 링크 존재 확인",
  satisfied: false,
};

const CONFIRMED_UTTERANCE = "네, 리포트는 out/report.md에 생기면 됩니다";

function buildSession(predicates: FixturePredicate[]) {
  return createInterviewSession({
    source_request: "매주 월요일 아침 팀에 주간 리포트를 보내줘",
    goal_state: {
      derived_at: "2026-07-25T08:59:00.000Z",
      confirmed: true,
      predicates,
    },
    confirmations: [
      {
        predicate_id: PREDICATE_REPORT.id,
        utterance: CONFIRMED_UTTERANCE,
        confirmed_at: "2026-07-25T09:00:00.000Z",
      },
    ],
    autonomous_decisions: [
      {
        decided_at: "2026-07-25T09:05:00.000Z",
        description: "리포트 파일 인코딩은 UTF-8로 자율 결정",
        fork_class: "other",
      },
      {
        decided_at: "2026-07-25T09:06:00.000Z",
        description: "메일 제목 접두사는 [weekly]로 자율 결정",
        fork_class: "other",
      },
    ],
  });
}

// Fixture A: M = 2 unsatisfied predicates out of 3.
const TWO_GAP_PREDICATES: FixturePredicate[] = [PREDICATE_REPORT, PREDICATE_KOREAN, PREDICATE_MAIL];

// Fixture B: M = 1 — same predicate set, one gap closed.
const ONE_GAP_PREDICATES: FixturePredicate[] = [
  PREDICATE_REPORT,
  { ...PREDICATE_KOREAN, satisfied: true },
  PREDICATE_MAIL,
];

// Fixture C: M = 3 — nothing satisfied yet.
const THREE_GAP_PREDICATES: FixturePredicate[] = [
  { ...PREDICATE_REPORT, satisfied: false },
  PREDICATE_KOREAN,
  PREDICATE_MAIL,
];

describe("ac-6 clause 1 — four keys coexist in one single render", () => {
  test("one renderIntentSummary call yields goal_state, confirmed, remaining_gap, autonomous_decisions together", () => {
    const summary = renderIntentSummary(buildSession(TWO_GAP_PREDICATES));
    const keys = Object.keys(summary);
    expect(keys).toContain("goal_state");
    expect(keys).toContain("confirmed");
    expect(keys).toContain("remaining_gap");
    expect(keys).toContain("autonomous_decisions");
  });
});

describe("ac-6 clause 2 — goal_state section is non-empty", () => {
  test("rendered goal_state carries the fixture's predicates, not an empty section", () => {
    const summary = renderIntentSummary(buildSession(TWO_GAP_PREDICATES));
    expect(summary.goal_state.predicates.length).toBe(3);
    const renderedIds = summary.goal_state.predicates.map((p: { id: string }) => p.id).sort();
    expect(renderedIds).toEqual(
      [PREDICATE_MAIL.id, PREDICATE_KOREAN.id, PREDICATE_REPORT.id].sort(),
    );
  });
});

describe("ac-6 clause 3 — confirmed section preserved as recorded", () => {
  test("rendered confirmed section reproduces the existing confirmation record verbatim", () => {
    const summary = renderIntentSummary(buildSession(TWO_GAP_PREDICATES));
    expect(summary.confirmed.length).toBe(1);
    expect(summary.confirmed[0].predicate_id).toBe(PREDICATE_REPORT.id);
    expect(summary.confirmed[0].utterance).toBe(CONFIRMED_UTTERANCE);
  });
});

describe("ac-6 clause 4 — remaining_gap enumerates M unsatisfied predicates with count == M", () => {
  test("M=2: gap lists exactly the two unsatisfied predicates and count is 2", () => {
    const session = buildSession(TWO_GAP_PREDICATES);
    const summary = renderIntentSummary(session);
    expect(summary.remaining_gap.count).toBe(2);
    const gapIds = summary.remaining_gap.predicates.map((p: { id: string }) => p.id).sort();
    expect(gapIds).toEqual([PREDICATE_MAIL.id, PREDICATE_KOREAN.id].sort());
    const gapStatements = summary.remaining_gap.predicates
      .map((p: { statement: string }) => p.statement)
      .sort();
    expect(gapStatements).toEqual([PREDICATE_MAIL.statement, PREDICATE_KOREAN.statement].sort());
  });

  test("rendered gap count agrees with computeRemainingGap over the same session", () => {
    const session = buildSession(TWO_GAP_PREDICATES);
    const summary = renderIntentSummary(session);
    const gap = computeRemainingGap(session);
    expect(gap.count).toBe(2);
    expect(summary.remaining_gap.count).toBe(gap.count);
  });

  test("M=1: count follows the fixture down — no hardcoded count survives", () => {
    const summary = renderIntentSummary(buildSession(ONE_GAP_PREDICATES));
    expect(summary.remaining_gap.count).toBe(1);
    expect(summary.remaining_gap.predicates.map((p: { id: string }) => p.id)).toEqual([
      PREDICATE_MAIL.id,
    ]);
  });

  test("M=3: count follows the fixture up — no hardcoded count survives", () => {
    const summary = renderIntentSummary(buildSession(THREE_GAP_PREDICATES));
    expect(summary.remaining_gap.count).toBe(3);
    const gapIds = summary.remaining_gap.predicates.map((p: { id: string }) => p.id).sort();
    expect(gapIds).toEqual([PREDICATE_MAIL.id, PREDICATE_KOREAN.id, PREDICATE_REPORT.id].sort());
  });
});

describe("ac-6 clause 5 — autonomous_decisions log length", () => {
  test("autonomous_decisions has at least one entry and reflects the fixture's log length", () => {
    const summary = renderIntentSummary(buildSession(TWO_GAP_PREDICATES));
    expect(summary.autonomous_decisions.length).toBeGreaterThanOrEqual(1);
    expect(summary.autonomous_decisions.length).toBe(2);
  });
});
