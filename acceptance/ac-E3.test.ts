/**
 * ac-E3 acceptance — MacKay AC-weighting + Howard dead-branch pruning
 * (ac-35/B5 extension): when interpretation branches are scheduled, every
 * branch that does not reach an AC (WHY-chain) is marked deprioritized and
 * placed after every AC-reaching branch; a question series whose ac-35
 * k-diff is fixture-fixed material=false (perfect information cannot change
 * the plan) is pruned (pruned=true, its questions excluded from schedule
 * emission) and the prune verdict must reference the grounding k-diff
 * record (reference-free pruning is rejected); both verdicts are pure
 * functions of {AC-reachability, material} — no model call, the same
 * fixture always yields the same output. Red-frozen.
 *
 * Oracle (gate-a/rows/ac-E3.json), covered clauses:
 *  (1) AC-weighted deprioritization — scheduleInterviewBranches
 *      (src/interview/schedule/branch-scheduler.ts) over a mixed fixture
 *      marks each non-AC-reaching branch deprioritized and orders every
 *      AC-reaching branch ahead of every non-reaching one; contrast side:
 *      an AC-reaching branch is never marked deprioritized and never trails
 *      a non-reaching branch, and an all-reaching fixture emits no
 *      deprioritized mark. assessAcWeight
 *      (src/interview/schedule/ac-weight.ts) is the per-branch verdict.
 *      Deprioritization postpones — it does not drop branches.
 *  (2) dead-branch pruning — assessDeadBranch
 *      (src/interview/schedule/dead-branch.ts) sets pruned=true on a series
 *      whose fixture-fixed k-diff is material=false, and the scheduler
 *      excludes that series' questions from emission; the material=true
 *      contrast series is not pruned and its questions stay in the emission
 *      (two contrast fixtures). The pruned verdict carries k_diff_ref to
 *      the grounding k-diff record, and checkPruneGrounds rejects a
 *      pruned=true verdict without that reference (fail-closed).
 *  (3) wiring determinism — deprioritized/pruned verdicts and the full
 *      schedule are pure functions of {AC-reachability, material}: the same
 *      fixture called repeatedly returns deep-equal output (no model call).
 *
 * Residual (NOT tested here, per row residual):
 *  - Whether perfect information genuinely cannot change the plan (the
 *    material judgment itself) — ac-35 k-diff's charge, inheriting its
 *    correlated-blind-spot residual; fixtures fix the material value and
 *    this file asserts only the pruning wiring above it.
 *  - Whether a branch semantically "reaches" an AC — the reachability input
 *    (WHY-chain / goal_predicate_ref wiring) inherits ac-3's residual;
 *    fixtures fix reaches_ac and this file checks only the deprioritization
 *    wiring above it.
 *  - Substantive safety of pruning (information loss on mis-pruning) — not
 *    mechanized; measurement belongs to the calibration loop (ac-40/C4) and
 *    real use.
 */
import { describe, expect, test } from "bun:test";
import { assessAcWeight } from "../src/interview/schedule/ac-weight";
import { scheduleInterviewBranches } from "../src/interview/schedule/branch-scheduler";
import { assessDeadBranch, checkPruneGrounds } from "../src/interview/schedule/dead-branch";

// Interpretation branches — reaches_ac is FIXED BY FIXTURE (whether the
// WHY-chain wiring behind it is semantically right is ac-3 residual). The
// input order interleaves reaching and non-reaching branches so the ordering
// assertion cannot pass by accident of input order.
const REACHING_BRANCH_A = {
  id: "branch-session-migration",
  reaches_ac: true,
  summary: "기존 파일 세션을 데이터베이스로 마이그레이션한다는 독해",
};
const REACHING_BRANCH_B = {
  id: "branch-session-expiry",
  reaches_ac: true,
  summary: "기존 파일 세션은 만료 후 폐기한다는 독해",
};
const NON_REACHING_BRANCH_A = {
  id: "branch-log-format",
  reaches_ac: false,
  summary: "로그 포맷을 함께 바꾼다는 독해 — 어떤 AC의 WHY-사슬에도 닿지 않음",
};
const NON_REACHING_BRANCH_B = {
  id: "branch-config-rename",
  reaches_ac: false,
  summary: "설정 키 이름을 정리한다는 독해 — 어떤 AC의 WHY-사슬에도 닿지 않음",
};
const MIXED_BRANCHES = [
  NON_REACHING_BRANCH_A,
  REACHING_BRANCH_A,
  NON_REACHING_BRANCH_B,
  REACHING_BRANCH_B,
];
const REACHING_IDS = [REACHING_BRANCH_A.id, REACHING_BRANCH_B.id];
const NON_REACHING_IDS = [NON_REACHING_BRANCH_A.id, NON_REACHING_BRANCH_B.id];

// Question series — the k-diff material verdict is FIXED BY FIXTURE (the
// judgment itself is ac-35's residual). material=false means perfect
// information about the answer cannot change the plan: a dead branch.
const DEAD_K_DIFF = { id: "kdiff-retry-count", material: false };
const LIVE_K_DIFF = { id: "kdiff-rollback-scope", material: true };
const DEAD_SERIES = {
  id: "series-retry-count",
  k_diff: DEAD_K_DIFF,
  questions: [
    { id: "q-retry-1", text: "재시도 횟수를 3회로 할까요, 5회로 할까요?" },
    { id: "q-retry-2", text: "재시도 간격은 고정으로 할까요, 지수 백오프로 할까요?" },
  ],
};
const LIVE_SERIES = {
  id: "series-rollback-scope",
  k_diff: LIVE_K_DIFF,
  questions: [
    { id: "q-rollback-1", text: "부분 실패 시 전체 롤백인가요, 부분 커밋 후 재시도인가요?" },
  ],
};

const FULL_FIXTURE = {
  branches: MIXED_BRANCHES,
  series: [DEAD_SERIES, LIVE_SERIES],
};

describe("ac-E3 clause 1 — non-AC-reaching branches are deprioritized and scheduled last", () => {
  test("every non-AC-reaching branch carries a deprioritized mark in the schedule output", () => {
    const schedule = scheduleInterviewBranches(FULL_FIXTURE);

    for (const id of NON_REACHING_IDS) {
      const entry = schedule.order.find((slot) => slot.branch_id === id);
      expect(entry?.deprioritized).toBe(true);
    }
  });

  test("an AC-reaching branch is never marked deprioritized (contrast fixture side)", () => {
    const schedule = scheduleInterviewBranches(FULL_FIXTURE);

    for (const id of REACHING_IDS) {
      const entry = schedule.order.find((slot) => slot.branch_id === id);
      expect(entry?.deprioritized).toBe(false);
    }
  });

  test("all AC-reaching branches precede every non-reaching branch in schedule order", () => {
    const schedule = scheduleInterviewBranches(FULL_FIXTURE);
    const orderIds = schedule.order.map((slot) => slot.branch_id);

    const reachingIndices = REACHING_IDS.map((id) => orderIds.indexOf(id));
    const nonReachingIndices = NON_REACHING_IDS.map((id) => orderIds.indexOf(id));
    for (const index of [...reachingIndices, ...nonReachingIndices]) {
      expect(index).toBeGreaterThanOrEqual(0);
    }
    expect(Math.max(...reachingIndices)).toBeLessThan(Math.min(...nonReachingIndices));
  });

  test("deprioritization postpones, it does not drop — all four branches stay scheduled", () => {
    const schedule = scheduleInterviewBranches(FULL_FIXTURE);
    const orderIds = schedule.order.map((slot) => slot.branch_id);

    expect([...orderIds].sort()).toEqual([...REACHING_IDS, ...NON_REACHING_IDS].sort());
  });

  test("an all-reaching fixture emits no deprioritized mark at all", () => {
    const schedule = scheduleInterviewBranches({
      branches: [REACHING_BRANCH_A, REACHING_BRANCH_B],
      series: [],
    });

    expect(schedule.order.length).toBe(2);
    for (const slot of schedule.order) {
      expect(slot.deprioritized).toBe(false);
    }
  });
});

describe("ac-E3 clause 2 — material=false question series are pruned as dead branches", () => {
  test("a series whose k-diff is material=false gets pruned=true", () => {
    const verdict = assessDeadBranch({ series_id: DEAD_SERIES.id, k_diff: DEAD_K_DIFF });

    expect(verdict.series_id).toBe(DEAD_SERIES.id);
    expect(verdict.pruned).toBe(true);
  });

  test("the pruned series' questions are excluded from schedule emission", () => {
    const schedule = scheduleInterviewBranches(FULL_FIXTURE);
    const emittedQuestionIds = schedule.emitted_questions.map((q) => q.question_id);
    const emittedSeriesIds = schedule.emitted_questions.map((q) => q.series_id);

    const deadVerdict = schedule.prune_verdicts.find((v) => v.series_id === DEAD_SERIES.id);
    expect(deadVerdict?.pruned).toBe(true);
    expect(emittedQuestionIds).not.toContain("q-retry-1");
    expect(emittedQuestionIds).not.toContain("q-retry-2");
    expect(emittedSeriesIds).not.toContain(DEAD_SERIES.id);
  });

  test("the material=true contrast series is not pruned and its questions remain emitted", () => {
    const verdict = assessDeadBranch({ series_id: LIVE_SERIES.id, k_diff: LIVE_K_DIFF });
    expect(verdict.pruned).toBe(false);

    const schedule = scheduleInterviewBranches(FULL_FIXTURE);
    const liveVerdict = schedule.prune_verdicts.find((v) => v.series_id === LIVE_SERIES.id);
    expect(liveVerdict?.pruned).toBe(false);
    expect(schedule.emitted_questions.map((q) => q.question_id)).toContain("q-rollback-1");
  });

  test("the pruned verdict references the grounding k-diff record", () => {
    const verdict = assessDeadBranch({ series_id: DEAD_SERIES.id, k_diff: DEAD_K_DIFF });

    expect(verdict.k_diff_ref).toBe(DEAD_K_DIFF.id);
  });

  test("a pruned=true verdict without a k-diff reference is rejected — no grounds, no pruning", () => {
    const gate = checkPruneGrounds({ series_id: DEAD_SERIES.id, pruned: true });

    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("expected the reference-free pruning to be rejected");
    expect(gate.reason).toContain("k-diff");
  });

  test("a grounded pruned verdict passes the gate; a non-pruning verdict needs no reference", () => {
    const grounded = assessDeadBranch({ series_id: DEAD_SERIES.id, k_diff: DEAD_K_DIFF });
    expect(checkPruneGrounds(grounded).ok).toBe(true);

    expect(checkPruneGrounds({ series_id: LIVE_SERIES.id, pruned: false }).ok).toBe(true);
  });
});

describe("ac-E3 clause 3 — verdicts are pure functions of {AC-reachability, material}", () => {
  test("assessAcWeight repeated on the same reachability input yields deep-equal verdicts", () => {
    for (const reaches_ac of [true, false]) {
      const input = { branch_id: "branch-repeat-probe", reaches_ac };
      const first = assessAcWeight(input);
      const second = assessAcWeight(input);

      expect(second).toEqual(first);
      expect(first.deprioritized).toBe(!reaches_ac);
    }
  });

  test("assessDeadBranch repeated on the same material input yields deep-equal verdicts", () => {
    for (const k_diff of [DEAD_K_DIFF, LIVE_K_DIFF]) {
      const input = { series_id: "series-repeat-probe", k_diff };
      const first = assessDeadBranch(input);
      const second = assessDeadBranch(input);

      expect(second).toEqual(first);
      expect(first.pruned).toBe(!k_diff.material);
    }
  });

  test("the full schedule is deterministic — the same fixture repeated yields deep-equal output", () => {
    const first = scheduleInterviewBranches(FULL_FIXTURE);
    const second = scheduleInterviewBranches(FULL_FIXTURE);

    expect(second).toEqual(first);
  });
});
