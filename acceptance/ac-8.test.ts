/**
 * ac-8 acceptance (red, frozen) — dogfood interview log rescan.
 *
 * This test is NOT a means of producing judgment evidence by itself: it is the
 * rescan executor (method: rescan, evidence: file) over the already-produced
 * dogfood interview log at the single fixed path the recorder module writes
 * (dogfood/interview-session.log.jsonl). The evidence remains the log file.
 * It machine-rechecks three deterministic predicates:
 *   (1) the file exists at the fixed path and its byte length is > 0;
 *   (2) the four span markers appear in exactly this order — restatement
 *       marker → user_confirmation.confirmed=true record → remaining-gap
 *       render marker → goalStateGate call record marker (any missing marker
 *       or inverted order fails), with the marker strings held in the single
 *       definition src/interview/log/markers.ts shared by recorder and
 *       scanner so string drift is blocked;
 *   (3) the count of user_confirmation records is >= 1.
 *
 * RESIDUAL — declared in gate-a/rows/ac-8.json and deliberately NOT tested:
 * - Whether the log records a GENUINE dogfood session (vs a synthetic or
 *   forged log) is a human-judged predicate; the contract's evidence
 *   vocabulary for ac-8 is log(→file/rescan) only, so this criterion cannot
 *   close it.
 * - The semantic reality of the four spans (whether the marked restatement,
 *   confirmation, gap render, and gate call were meaningful events) — the
 *   judgment here stops at marker existence + order (log-evidence AC, not a
 *   gate: artifact existence + markers only).
 * - Producing the log requires an actual dogfood interview run with real user
 *   answers; this rescan only inspects the already-produced file and cannot
 *   force the run itself.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanDogfoodLog } from "../src/interview/log/dogfood-scan";
import {
  GOAL_STATE_GATE_MARKER,
  REMAINING_GAP_MARKER,
  RESTATEMENT_MARKER,
  SPAN_MARKER_ORDER,
  USER_CONFIRMATION_MARKER,
} from "../src/interview/log/markers";
import {
  DOGFOOD_LOG_PATH,
  recordGoalStateGateCall,
  recordRemainingGap,
  recordRestatement,
  recordUserConfirmation,
} from "../src/interview/log/session-log";

const REPO_ROOT = join(import.meta.dir, "..");

function freshLogPath(): string {
  return join(mkdtempSync(join(tmpdir(), "ac8-")), "interview-session.log.jsonl");
}

/** Writes a full, correctly ordered session through the recorder module. */
function writeWellFormedLog(path: string): void {
  recordRestatement(path, "요청을 이렇게 이해했습니다: 인터뷰 하네스의 목표 상태를 확정한다.");
  recordUserConfirmation(path, true);
  recordRemainingGap(path, ["predicate-2 미충족"]);
  recordGoalStateGateCall(path, false);
}

describe("ac-8 markers: single shared definition (src/interview/log/markers.ts)", () => {
  test("defines four distinct non-empty span marker strings", () => {
    const markers = [
      RESTATEMENT_MARKER,
      USER_CONFIRMATION_MARKER,
      REMAINING_GAP_MARKER,
      GOAL_STATE_GATE_MARKER,
    ];
    for (const marker of markers) {
      expect(typeof marker).toBe("string");
      expect(marker.length).toBeGreaterThan(0);
    }
    expect(new Set(markers).size).toBe(4);
  });

  test("SPAN_MARKER_ORDER encodes exactly restatement → confirmation → remaining-gap → gate", () => {
    expect(SPAN_MARKER_ORDER).toEqual([
      RESTATEMENT_MARKER,
      USER_CONFIRMATION_MARKER,
      REMAINING_GAP_MARKER,
      GOAL_STATE_GATE_MARKER,
    ]);
  });
});

describe("ac-8 recorder: single fixed path and shared-marker emission", () => {
  test("DOGFOOD_LOG_PATH is the single fixed path dogfood/interview-session.log.jsonl", () => {
    expect(DOGFOOD_LOG_PATH).toBe("dogfood/interview-session.log.jsonl");
  });

  test("recorder emits the shared marker strings verbatim as JSONL records", () => {
    const path = freshLogPath();
    writeWellFormedLog(path);

    const content = readFileSync(path, "utf8");
    expect(content).toContain(RESTATEMENT_MARKER);
    expect(content).toContain(USER_CONFIRMATION_MARKER);
    expect(content).toContain(REMAINING_GAP_MARKER);
    expect(content).toContain(GOAL_STATE_GATE_MARKER);

    const lines = content.trim().split("\n");
    expect(lines.length).toBe(4);
    for (const line of lines) {
      // Every record must be a parseable JSON object (JSONL discipline).
      expect(typeof JSON.parse(line)).toBe("object");
    }

    // Records are appended in call order, one span marker per line, so the
    // physical line order is the span order the scanner later reads.
    for (let i = 0; i < SPAN_MARKER_ORDER.length; i++) {
      expect(lines[i]).toContain(SPAN_MARKER_ORDER[i]);
    }
  });
});

describe("ac-8 rescan predicate 1: existence and non-empty byte length", () => {
  test("a missing log file fails the scan (fail-closed)", () => {
    const missing = join(mkdtempSync(join(tmpdir(), "ac8-")), "no-such.log.jsonl");
    const result = scanDogfoodLog(missing);
    expect(result.pass).toBe(false);
    expect(result.file_exists).toBe(false);
  });

  test("an existing but zero-byte log file fails the scan", () => {
    const path = freshLogPath();
    writeFileSync(path, "");
    const result = scanDogfoodLog(path);
    expect(result.file_exists).toBe(true);
    expect(result.byte_length).toBe(0);
    expect(result.pass).toBe(false);
  });
});

describe("ac-8 rescan predicate 2: four span markers in exact order", () => {
  test("a log with all four spans in order and confirmed=true passes", () => {
    const path = freshLogPath();
    writeWellFormedLog(path);
    const result = scanDogfoodLog(path);
    expect(result.file_exists).toBe(true);
    expect(result.byte_length).toBeGreaterThan(0);
    expect(result.markers_in_order).toBe(true);
    expect(result.confirmation_count).toBeGreaterThanOrEqual(1);
    expect(result.pass).toBe(true);
  });

  test("a missing restatement marker fails the scan (span 1 omitted)", () => {
    const path = freshLogPath();
    // Restatement deliberately omitted; spans 2-4 are present and in order.
    recordUserConfirmation(path, true);
    recordRemainingGap(path, ["predicate-2 미충족"]);
    recordGoalStateGateCall(path, true);
    const content = readFileSync(path, "utf8");
    expect(content).not.toContain(RESTATEMENT_MARKER);
    expect(content).toContain(USER_CONFIRMATION_MARKER);
    expect(content).toContain(REMAINING_GAP_MARKER);
    expect(content).toContain(GOAL_STATE_GATE_MARKER);
    const result = scanDogfoodLog(path);
    // The confirmation span itself is intact, so the failure can only come
    // from the absent restatement marker.
    expect(result.confirmation_count).toBe(1);
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("a restatement recorded after the confirmation fails (span 1 displaced)", () => {
    const path = freshLogPath();
    recordUserConfirmation(path, true);
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordRemainingGap(path, []);
    recordGoalStateGateCall(path, true);
    const content = readFileSync(path, "utf8");
    // All four markers are present — only span 1's position is wrong.
    expect(content).toContain(RESTATEMENT_MARKER);
    expect(content).toContain(USER_CONFIRMATION_MARKER);
    expect(content).toContain(REMAINING_GAP_MARKER);
    expect(content).toContain(GOAL_STATE_GATE_MARKER);
    expect(content.indexOf(RESTATEMENT_MARKER)).toBeGreaterThan(
      content.indexOf(USER_CONFIRMATION_MARKER),
    );
    const result = scanDogfoodLog(path);
    expect(result.confirmation_count).toBe(1);
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("a missing remaining-gap marker fails the scan (span 3 omitted)", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordUserConfirmation(path, true);
    // remaining-gap render deliberately omitted.
    recordGoalStateGateCall(path, true);
    const content = readFileSync(path, "utf8");
    expect(content).not.toContain(REMAINING_GAP_MARKER);
    const result = scanDogfoodLog(path);
    expect(result.confirmation_count).toBe(1);
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("a gate-call marker placed before the remaining-gap render fails (span 4 displaced)", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordUserConfirmation(path, true);
    recordGoalStateGateCall(path, true);
    recordRemainingGap(path, ["predicate-3 미충족"]);
    const content = readFileSync(path, "utf8");
    // All four markers present; the gate marker merely precedes span 3.
    expect(content).toContain(RESTATEMENT_MARKER);
    expect(content).toContain(USER_CONFIRMATION_MARKER);
    expect(content).toContain(REMAINING_GAP_MARKER);
    expect(content).toContain(GOAL_STATE_GATE_MARKER);
    expect(content.indexOf(GOAL_STATE_GATE_MARKER)).toBeLessThan(
      content.indexOf(REMAINING_GAP_MARKER),
    );
    const result = scanDogfoodLog(path);
    expect(result.confirmation_count).toBe(1);
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("a gate-call marker placed before the confirmation fails (span 4 ahead of span 2)", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordGoalStateGateCall(path, true);
    recordUserConfirmation(path, true);
    recordRemainingGap(path, []);
    const content = readFileSync(path, "utf8");
    expect(content.indexOf(GOAL_STATE_GATE_MARKER)).toBeLessThan(
      content.indexOf(USER_CONFIRMATION_MARKER),
    );
    const result = scanDogfoodLog(path);
    expect(result.confirmation_count).toBe(1);
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("a missing marker fails the scan (gate-call record omitted)", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordUserConfirmation(path, true);
    recordRemainingGap(path, []);
    // goalStateGate call record deliberately omitted.
    const result = scanDogfoodLog(path);
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("inverted order fails the scan (remaining-gap before confirmation)", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordRemainingGap(path, ["predicate-1 미충족"]);
    recordUserConfirmation(path, true);
    recordGoalStateGateCall(path, true);
    const result = scanDogfoodLog(path);
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("a confirmed=false record does not satisfy the confirmation span", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordUserConfirmation(path, false);
    recordRemainingGap(path, []);
    recordGoalStateGateCall(path, true);
    const result = scanDogfoodLog(path);
    // The record itself still counts as a user_confirmation record...
    expect(result.confirmation_count).toBe(1);
    // ...but span 2 demands confirmed=true, so the ordered-span check fails.
    expect(result.markers_in_order).toBe(false);
    expect(result.pass).toBe(false);
  });
});

describe("ac-8 rescan predicate 3: user_confirmation record count", () => {
  test("zero user_confirmation records yields count 0 and fails", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordRemainingGap(path, []);
    recordGoalStateGateCall(path, true);
    const result = scanDogfoodLog(path);
    expect(result.confirmation_count).toBe(0);
    expect(result.pass).toBe(false);
  });

  test("multiple confirmation records are all counted", () => {
    const path = freshLogPath();
    recordRestatement(path, "요청을 이렇게 이해했습니다.");
    recordUserConfirmation(path, true);
    recordUserConfirmation(path, true);
    recordRemainingGap(path, []);
    recordGoalStateGateCall(path, true);
    const result = scanDogfoodLog(path);
    expect(result.confirmation_count).toBe(2);
    expect(result.pass).toBe(true);
  });
});

describe("ac-8 acceptance: rescan of the produced dogfood interview log", () => {
  const producedLog = join(REPO_ROOT, DOGFOOD_LOG_PATH);

  test("the dogfood log exists at the fixed path and is non-empty", () => {
    expect(existsSync(producedLog)).toBe(true);
    expect(statSync(producedLog).size).toBeGreaterThan(0);
  });

  test("the produced log passes the full rescan: markers in order, >=1 confirmation", () => {
    const result = scanDogfoodLog(producedLog);
    expect(result.file_exists).toBe(true);
    expect(result.byte_length).toBeGreaterThan(0);
    expect(result.markers_in_order).toBe(true);
    expect(result.confirmation_count).toBeGreaterThanOrEqual(1);
    expect(result.pass).toBe(true);
  });
});
