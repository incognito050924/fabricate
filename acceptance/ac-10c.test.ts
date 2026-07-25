/**
 * ac-10c acceptance — mischief four-question record + Skinner intervention
 * reading (round-0 reading pass, procedure 7). Red-frozen.
 *
 * Oracle (gate-a/rows/ac-10c.json), covered clauses:
 *  (1) running the round-0 reading pass on a request fixture yields a
 *      mischief four-question record whose four fields — prior_state,
 *      defect, prescription, prescription_rationale — are all present and
 *      non-empty (the request read as the defect it fixes), preserved
 *      verbatim from the fixture; a fixture with a missing field or an
 *      empty-valued field is judged incomplete by the completeness check
 *      (contrast fixtures).
 *  (2) defect_removed_check exists and checks plan terminal state |= defect
 *      removal deterministically (plan-entailment predicate family, no prose
 *      grading): a terminal-state fixture that actually removes the defect
 *      routes to pass; a "partial move" (partial fulfilment) terminal-state
 *      fixture routes to fail with the defect alive (two contrast fixtures);
 *      identical inputs yield identical results; the check's verdict equals
 *      direct plan-entailment evaluation of the predicate it carries, over a
 *      (predicate x terminal state) matrix — a control predicate over a
 *      different terminal-state path inverts the routing of the same states,
 *      so a check that ignores its predicate (hard-coded path, or prose
 *      grading of the request text) cannot pass.
 *  (3) the Skinner intervention reading artifact exists —
 *      situation_snapshot is exactly 3 newline-split lines (1-, 2-, 4- and
 *      5-line snapshots are all rejected: exactly 3, not "at least 3"),
 *      intervention is exactly 1 line, resolution_check is present; the
 *      deterministic shape check rejects wrong line counts and a missing
 *      resolution_check.
 *
 * Residual (NOT tested here, per row residual):
 *  - The content of defect identification: whether the recorded defect is
 *    the defect the request actually fixes, and whether the formalization of
 *    the defect-removal predicate captures that defect correctly, remain
 *    human judgment. Fixtures fix the content; this file asserts field
 *    completeness and check pass/fail routing only.
 *  - The semantic adequacy of the Skinner situation_snapshot, intervention,
 *    and resolution_check (whether the snapshot summarizes the situation
 *    correctly, whether the intervention reads the request's intervention
 *    correctly) is not closed by presence/line-count checks and is not
 *    asserted here.
 */
import { describe, expect, test } from "bun:test";
import { evaluatePlanEntailment } from "../src/interview/plan-entailment";
import { runDefectRemovedCheck } from "../src/interview/reading/defect-removed-check";
import { checkMischiefCompleteness } from "../src/interview/reading/mischief";
import { runRound0Reading } from "../src/interview/reading/round0-reading";
import { checkSkinnerShape } from "../src/interview/reading/skinner";

// The fixture fixes all reading content; the round-0 pass records it into
// artifacts, and the tests assert presence, completeness, and deterministic
// pass/fail routing only (never the adequacy of the content itself).
const completeMischief = {
  prior_state: "유틸 함수가 폐기 예정 경로 src/legacy에 흩어져 있다",
  defect: "새 코드가 폐기 예정 경로 src/legacy를 계속 참조하게 된다",
  prescription: "src/legacy의 유틸 전부를 src/shared로 이동한다",
  prescription_rationale: "전부 이동해야 폐기 경로 참조가 사라져 결함이 제거되기 때문이다",
} as const;

// Plan-entailment predicate (structured data, not prose): the defect is
// removed exactly when the set of files left at the legacy path is empty.
const defectRemovedPredicate = {
  kind: "set_empty",
  path: "files_at_legacy_path",
} as const;

// Control predicate of the same family over a different terminal-state path.
// It exists only to pin that the check evaluates the predicate it was given:
// on the control terminal states below it must route the opposite way from
// defectRemovedPredicate.
const targetPathEmptyPredicate = {
  kind: "set_empty",
  path: "files_at_target_path",
} as const;

const skinnerReading = {
  situation_snapshot: [
    "유틸이 src/legacy와 src/shared 두 경로에 걸쳐 있다",
    "새 코드가 어느 경로를 참조할지 갈린다",
    "사용자가 유틸 전부 이동을 요청했다",
  ].join("\n"),
  intervention: "요청은 폐기 경로 참조를 끊는 개입으로 읽힌다",
  resolution_check:
    "종결 상태에서 src/legacy에 유틸 파일이 하나도 남아 있지 않으면 개입이 해소된 것이다",
} as const;

const requestFixture = {
  request_text: "src/legacy에 있는 유틸을 전부 src/shared로 옮겨줘",
  mischief: completeMischief,
  defect_removed_predicate: defectRemovedPredicate,
  skinner: skinnerReading,
} as const;

// Terminal-state contrast fixtures: structured plan terminal states.
// Every util moved — the defect (legacy-path references) is actually gone.
const defectRemovedTerminalState = {
  files_at_legacy_path: [],
  files_at_target_path: ["date.ts", "format.ts", "parse.ts"],
} as const;

// "Partial move": one util still lives at the legacy path — defect alive.
const partialMoveTerminalState = {
  files_at_legacy_path: ["parse.ts"],
  files_at_target_path: ["date.ts", "format.ts"],
} as const;

// Control terminal state: nothing moved at all. Under defectRemovedPredicate
// this is a fail; under targetPathEmptyPredicate it is a pass — the inversion
// that a predicate-ignoring check cannot reproduce.
const nothingMovedTerminalState = {
  files_at_legacy_path: ["date.ts", "format.ts", "parse.ts"],
  files_at_target_path: [],
} as const;

// Same request, control predicate: the round-0 pass must carry this predicate
// into the check it emits.
const controlPredicateRequestFixture = {
  ...requestFixture,
  defect_removed_predicate: targetPathEmptyPredicate,
} as const;

describe("ac-10c clause 1 — mischief four-question record is present and complete", () => {
  test("round-0 pass emits the record with all four answers verbatim from the fixture", () => {
    const output = runRound0Reading(requestFixture);

    expect(output.mischief.prior_state).toBe("유틸 함수가 폐기 예정 경로 src/legacy에 흩어져 있다");
    expect(output.mischief.defect).toBe("새 코드가 폐기 예정 경로 src/legacy를 계속 참조하게 된다");
    expect(output.mischief.prescription).toBe("src/legacy의 유틸 전부를 src/shared로 이동한다");
    expect(output.mischief.prescription_rationale).toBe(
      "전부 이동해야 폐기 경로 참조가 사라져 결함이 제거되기 때문이다",
    );
  });

  test("each of the four fields is a non-empty string", () => {
    const output = runRound0Reading(requestFixture);
    const fields = ["prior_state", "defect", "prescription", "prescription_rationale"] as const;

    for (const field of fields) {
      expect(typeof output.mischief[field]).toBe("string");
      expect(output.mischief[field].length).toBeGreaterThan(0);
    }
  });

  test("the complete record passes the completeness check", () => {
    const result = checkMischiefCompleteness(completeMischief);

    expect(result.complete).toBe(true);
    expect(result.missing_fields).toEqual([]);
  });

  test("a record missing one field is judged incomplete (contrast fixture)", () => {
    const { prescription_rationale: _dropped, ...missingRationale } = completeMischief;
    const result = checkMischiefCompleteness(missingRationale);

    expect(result.complete).toBe(false);
    expect(result.missing_fields).toContain("prescription_rationale");
  });

  test("a record with one empty-valued field is judged incomplete (contrast fixture)", () => {
    const result = checkMischiefCompleteness({ ...completeMischief, defect: "" });

    expect(result.complete).toBe(false);
    expect(result.missing_fields).toContain("defect");
  });
});

describe("ac-10c clause 2 — defect_removed_check routes terminal states deterministically", () => {
  test("the check carries the fixture's plan-entailment predicate, not a prose grader", () => {
    const output = runRound0Reading(requestFixture);

    expect(output.defect_removed_check.predicate).toEqual({
      kind: "set_empty",
      path: "files_at_legacy_path",
    });
  });

  test("a terminal state that actually removes the defect returns pass", () => {
    const output = runRound0Reading(requestFixture);
    const result = runDefectRemovedCheck(output.defect_removed_check, defectRemovedTerminalState);

    expect(result.verdict).toBe("pass");
    expect(result.defect_alive).toBe(false);
  });

  test("a 'partial move' terminal state returns fail with the defect alive", () => {
    const output = runRound0Reading(requestFixture);
    const result = runDefectRemovedCheck(output.defect_removed_check, partialMoveTerminalState);

    expect(result.verdict).toBe("fail");
    expect(result.defect_alive).toBe(true);
  });

  test("the check is deterministic: identical inputs yield identical results", () => {
    const output = runRound0Reading(requestFixture);

    const firstFail = runDefectRemovedCheck(output.defect_removed_check, partialMoveTerminalState);
    const secondFail = runDefectRemovedCheck(output.defect_removed_check, partialMoveTerminalState);
    expect(secondFail).toEqual(firstFail);

    const firstPass = runDefectRemovedCheck(
      output.defect_removed_check,
      defectRemovedTerminalState,
    );
    const secondPass = runDefectRemovedCheck(
      output.defect_removed_check,
      defectRemovedTerminalState,
    );
    expect(secondPass).toEqual(firstPass);
  });

  test("a check carrying a different predicate routes the same terminal states the other way", () => {
    const ownCheck = runRound0Reading(requestFixture).defect_removed_check;
    const controlCheck = runRound0Reading(controlPredicateRequestFixture).defect_removed_check;

    expect(controlCheck.predicate).toEqual({
      kind: "set_empty",
      path: "files_at_target_path",
    });

    // Own predicate: legacy path empty => pass; nothing moved => fail.
    expect(runDefectRemovedCheck(ownCheck, nothingMovedTerminalState).verdict).toBe("fail");
    expect(runDefectRemovedCheck(ownCheck, nothingMovedTerminalState).defect_alive).toBe(true);

    // Control predicate over the same two states: exactly inverted.
    const controlOnRemoved = runDefectRemovedCheck(controlCheck, defectRemovedTerminalState);
    expect(controlOnRemoved.verdict).toBe("fail");
    expect(controlOnRemoved.defect_alive).toBe(true);

    const controlOnNothingMoved = runDefectRemovedCheck(controlCheck, nothingMovedTerminalState);
    expect(controlOnNothingMoved.verdict).toBe("pass");
    expect(controlOnNothingMoved.defect_alive).toBe(false);
  });

  test("the check's verdict equals direct plan-entailment evaluation of the predicate it carries", () => {
    // Pin the direct evaluations first, so the matrix below cannot be
    // satisfied by a constant-returning entailment evaluator.
    expect(evaluatePlanEntailment(defectRemovedPredicate, defectRemovedTerminalState)).toBe(true);
    expect(evaluatePlanEntailment(defectRemovedPredicate, partialMoveTerminalState)).toBe(false);
    expect(evaluatePlanEntailment(defectRemovedPredicate, nothingMovedTerminalState)).toBe(false);
    expect(evaluatePlanEntailment(targetPathEmptyPredicate, defectRemovedTerminalState)).toBe(
      false,
    );
    expect(evaluatePlanEntailment(targetPathEmptyPredicate, partialMoveTerminalState)).toBe(false);
    expect(evaluatePlanEntailment(targetPathEmptyPredicate, nothingMovedTerminalState)).toBe(true);

    const cases = [
      { fixture: requestFixture, predicate: defectRemovedPredicate },
      { fixture: controlPredicateRequestFixture, predicate: targetPathEmptyPredicate },
    ] as const;
    const terminalStates = [
      defectRemovedTerminalState,
      partialMoveTerminalState,
      nothingMovedTerminalState,
    ] as const;

    for (const { fixture, predicate } of cases) {
      const check = runRound0Reading(fixture).defect_removed_check;
      for (const terminalState of terminalStates) {
        const entailed = evaluatePlanEntailment(predicate, terminalState);
        const result = runDefectRemovedCheck(check, terminalState);

        expect(result.verdict).toBe(entailed ? "pass" : "fail");
        expect(result.defect_alive).toBe(!entailed);
      }
    }
  });
});

describe("ac-10c clause 3 — Skinner intervention reading artifact", () => {
  test("situation_snapshot is exactly 3 newline-split non-empty lines, verbatim", () => {
    const output = runRound0Reading(requestFixture);

    expect(output.skinner.situation_snapshot).toBe(skinnerReading.situation_snapshot);
    const lines = output.skinner.situation_snapshot.split("\n");
    expect(lines.length).toBe(3);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(0);
    }
  });

  test("intervention is exactly 1 line, verbatim", () => {
    const output = runRound0Reading(requestFixture);

    expect(output.skinner.intervention).toBe("요청은 폐기 경로 참조를 끊는 개입으로 읽힌다");
    expect(output.skinner.intervention.includes("\n")).toBe(false);
    expect(output.skinner.intervention.split("\n").length).toBe(1);
  });

  test("resolution_check is present as a non-empty string, verbatim", () => {
    const output = runRound0Reading(requestFixture);

    expect(typeof output.skinner.resolution_check).toBe("string");
    expect(output.skinner.resolution_check).toBe(
      "종결 상태에서 src/legacy에 유틸 파일이 하나도 남아 있지 않으면 개입이 해소된 것이다",
    );
    expect(output.skinner.resolution_check.length).toBeGreaterThan(0);
  });

  test("the shape check accepts the emitted artifact", () => {
    const output = runRound0Reading(requestFixture);
    const result = checkSkinnerShape(output.skinner);

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  test("a 2-line snapshot is rejected by the shape check (line counts are deterministic)", () => {
    const result = checkSkinnerShape({
      ...skinnerReading,
      situation_snapshot: "유틸이 두 경로에 걸쳐 있다\n사용자가 전부 이동을 요청했다",
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain("situation_snapshot");
  });

  test("snapshots of 1, 4 and 5 lines are rejected too — exactly 3, not 'at least 3'", () => {
    const offBySnapshots = [
      "유틸이 두 경로에 걸쳐 있다",
      [
        "유틸이 두 경로에 걸쳐 있다",
        "새 코드 참조가 갈린다",
        "전부 이동 요청이 있었다",
        "넷째 줄",
      ].join("\n"),
      [
        "유틸이 두 경로에 걸쳐 있다",
        "새 코드 참조가 갈린다",
        "전부 이동 요청이 있었다",
        "넷째 줄",
        "다섯째 줄",
      ].join("\n"),
    ];

    for (const situation_snapshot of offBySnapshots) {
      expect(situation_snapshot.split("\n").length).not.toBe(3);

      const result = checkSkinnerShape({ ...skinnerReading, situation_snapshot });

      expect(result.ok).toBe(false);
      expect(result.violations).toContain("situation_snapshot");
      // Only the snapshot is malformed in these fixtures.
      expect(result.violations).not.toContain("intervention");
      expect(result.violations).not.toContain("resolution_check");
    }
  });

  test("a multi-line intervention is rejected by the shape check", () => {
    const result = checkSkinnerShape({
      ...skinnerReading,
      intervention: "요청은 개입으로 읽힌다\n그리고 둘째 줄이 있다",
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain("intervention");
  });

  test("a missing resolution_check is rejected by the shape check", () => {
    const { resolution_check: _dropped, ...withoutResolution } = skinnerReading;
    const result = checkSkinnerShape(withoutResolution);

    expect(result.ok).toBe(false);
    expect(result.violations).toContain("resolution_check");
  });
});
