/**
 * ac-16 acceptance — U6 original-request re-anchoring (Loftus).
 * Frozen red: src/interview/charter/directives.ts and
 * src/interview/anchor/original-reanchor.ts do not exist yet; the piece-3
 * implementation must turn this file green without editing it.
 *
 * Oracle (gate-a/rows/ac-16.json), covered clauses:
 *  (1) the revised interview charter/directive source text exported by
 *      src/interview/charter/directives.ts contains the U6 operative-cue —
 *      '범위·완료 전 원문 verbatim 재대면' and '요약 신뢰 금지' — asserted as
 *      deterministic substring grep, isolated to the U6 directive block so
 *      other cues sharing the surface cannot mask its absence, and the block
 *      itself must be a strict subrange of the exported charter text. The
 *      activation condition is NOT a separate phrase (unlike U1's '비단순
 *      요청만'): it is embedded in the cue itself as '범위·완료 전' and is
 *      detected by the same grep — no separate activation assertion is added.
 *  (2) original-supply structure (§8.3 alignment, deterministic): the stored
 *      original enters through an intake step and is retrieved by the
 *      re-anchor structure at the scope-judgment and completion-declaration
 *      thresholds — the original is never handed to the re-anchor call as an
 *      argument, so the store → threshold-retrieval path must actually run.
 *      The produced re-confrontation record carries the FULL stored original
 *      request text, string-identical (verbatim) to what was stored, and is
 *      keyed by session (a second session holding a different original must
 *      not bleed through). An implementation that only emits a "recall the
 *      original" instruction string without supplying the full original fails
 *      (this is supply, not a reminder); an implementation that substitutes a
 *      summary/reconstruction — including a summary that arrived on later
 *      turns — fails the identity assertion (the structural side of
 *      '요약 신뢰 금지'). With nothing stored, the re-anchor fails closed
 *      rather than fabricating a stand-in.
 *  (3) fixture-turn structural observation (semi-deterministic): one fixture
 *      turn tagged as the scope-judgment threshold and one tagged as the
 *      completion-declaration threshold each produce a recorded turn
 *      structure carrying a non-empty re-anchor firing record whose recorded
 *      threshold equals the turn's tag and whose supplied original equals the
 *      stored original — exactly one fixture per threshold named by the cue
 *      (범위, 완료). A non-threshold fixture turn must NOT fire, and over a
 *      mixed turn sequence the firing log must contain exactly the two
 *      threshold firings in order, so firing is tag-driven rather than
 *      constant.
 *
 * Residual (NOT tested here, per row residual):
 *  - Re-confrontation adequacy: whether the supplied original actually
 *    re-anchored the agent's judgment — or was read, as §8.3 warns, as
 *    evidence for its own self-narrative — is a human-judged predicate the
 *    contract itself declares residual ('cue 존재는 결정적, 재대면 적절성은
 *    잔여다').
 *  - Activation compliance outside fixtures: the fixture-turn observation is
 *    semi-deterministic — it only checks the structure of tagged fixture
 *    cases. Deciding whether a real conversational turn constitutes a
 *    scope-judgment or completion-declaration threshold is not mechanized;
 *    every threshold_tag below is fixture-given, never inferred from content.
 */
import { describe, expect, test } from "bun:test";
import {
  createAnchorStore,
  performOriginalReanchor,
  recordReanchoredTurn,
} from "../src/interview/anchor/original-reanchor";
import { CHARTER_DIRECTIVES, getDirectiveBlock } from "../src/interview/charter/directives";

const U6_CUE = "범위·완료 전 원문 verbatim 재대면";
const U6_NO_SUMMARY_CUE = "요약 신뢰 금지";
const U6_ACTIVATION_FRAGMENT = "범위·완료 전";

// A second directive that lives on the same charter surface. Used to pin
// id-dependence: getDirectiveBlock must answer about the id it was asked
// about, not return one constant (or the whole file).
const OTHER_DIRECTIVE_ID = "U2";

// The stored original request text: deliberately multi-line and detail-heavy
// (paths, schedule, exclusions, failure handling) so that any summary or
// reconstruction necessarily differs from it and the verbatim string-identity
// assertions below cannot be satisfied by paraphrase.
const STORED_ORIGINAL = [
  "지난주에 말한 백업 스크립트 말인데, 매일 자정에 ~/work/tmp 아래의 임시 파일을",
  "외장 디스크의 backup/2026 폴더로 옮기고, 옮긴 뒤에는 원본을 지워 줘.",
  "단, .lock 파일은 절대 건드리지 말고, 옮기다 실패하면 중단하고 나한테 메일로 알려줘.",
].join("\n");

// A different session's original: if the store is not session-keyed (or is a
// last-write-wins global), retrieval for the first session returns this.
const OTHER_SESSION_ORIGINAL = "회의록 폴더를 정리하고 중복 파일만 지워 줘.";

// The lossy summary that accumulates over the conversation — exactly the
// thing §8.3 forbids trusting in place of the original. It drops the .lock
// exclusion and the failure handling.
const DRIFTED_SUMMARY = "임시 파일을 백업 폴더로 옮기고 원본을 지우는 작업";

type ThresholdTag = "scope" | "completion" | "none";

function makeFixtureTurn(threshold_tag: ThresholdTag, turn_id: string) {
  const content =
    threshold_tag === "scope"
      ? "이번 조각의 범위는 이동 스크립트까지로 판단합니다"
      : threshold_tag === "completion"
        ? "요청하신 백업 이동 작업을 완료했습니다"
        : `정리하면 ${DRIFTED_SUMMARY}입니다`;
  return { turn_id, threshold_tag, content };
}

// Intake step: the original is stored once, up front, and never passed to a
// re-anchor call afterwards.
function storeWithOriginal(session_id: string, original_request: string) {
  const store = createAnchorStore();
  store.storeOriginal({ session_id, original_request });
  return store;
}

// Everything on the charter surface except the U6 block itself.
function charterOutsideU6Block(): string {
  const block = getDirectiveBlock("U6");
  if (!CHARTER_DIRECTIVES.includes(block)) {
    throw new Error("expected the U6 block to be a substring of the charter text");
  }
  return CHARTER_DIRECTIVES.split(block).join("");
}

describe("ac-16 clause 1 — U6 operative-cue exists in the revised directives (deterministic grep)", () => {
  test("the U6 directive block carries both cue strings verbatim", () => {
    const block = getDirectiveBlock("U6");

    expect(block).toContain(U6_CUE);
    expect(block).toContain(U6_NO_SUMMARY_CUE);
  });

  test("the activation condition is embedded in the cue itself ('범위·완료 전')", () => {
    // Unlike U1's separate '비단순 요청만' phrase, U6's activation gating is
    // carried by the cue's own leading '범위·완료 전' — the same grep detects
    // it; no separate activation-condition string is required or asserted.
    expect(getDirectiveBlock("U6")).toContain(U6_ACTIVATION_FRAGMENT);
  });

  test("the returned block is the U6 block: it names U6 and is a strict subrange of the charter", () => {
    const block = getDirectiveBlock("U6");

    expect(block).toContain("U6");
    // The cue must live in the injected directive text, not in a detached
    // constant that never reaches the interview surface.
    expect(CHARTER_DIRECTIVES).toContain(block);
    // Strict: returning the whole charter (which would collapse every
    // block-scoped grep into a whole-file grep) is a failure.
    expect(block).not.toBe(CHARTER_DIRECTIVES);
    expect(block.length).toBeLessThan(CHARTER_DIRECTIVES.length);
  });

  test("the block depends on the requested id and is disjoint from another directive's block", () => {
    const u6Block = getDirectiveBlock("U6");
    const otherBlock = getDirectiveBlock(OTHER_DIRECTIVE_ID);

    // An argument-ignoring constant fails here.
    expect(otherBlock).not.toBe(u6Block);
    expect(otherBlock).toContain(OTHER_DIRECTIVE_ID);
    expect(CHARTER_DIRECTIVES).toContain(otherBlock);

    // Neither block swallows the other: they are separate pieces of the
    // surface, so a block grep really is narrower than a file grep.
    expect(u6Block).not.toContain(otherBlock);
    expect(otherBlock).not.toContain(u6Block);
    expect(otherBlock).not.toContain(U6_CUE);
    expect(otherBlock).not.toContain(U6_NO_SUMMARY_CUE);
  });

  test("the U6 cue occurs nowhere outside the U6 block (whole-file grep cannot stand in)", () => {
    // The charter is more than the U6 cue: another directive block lives in
    // the remainder, so the surface is a real multi-directive text.
    const outside = charterOutsideU6Block();
    expect(outside).toContain(getDirectiveBlock(OTHER_DIRECTIVE_ID));

    // Isolation, enforced: if the U6 block ever loses the cue, no other cue
    // on the surface can mask that loss.
    expect(outside).not.toContain(U6_CUE);
    expect(outside).not.toContain(U6_NO_SUMMARY_CUE);
    expect(CHARTER_DIRECTIVES).toContain(U6_CUE);
    expect(CHARTER_DIRECTIVES).toContain(U6_NO_SUMMARY_CUE);
  });
});

describe("ac-16 clause 2 — re-confrontation record supplies the stored original verbatim (§8.3: supply, not reminder)", () => {
  test("the scope-judgment threshold retrieves the stored original from the session, not from the call", () => {
    const store = storeWithOriginal("s-backup", STORED_ORIGINAL);
    // A second session stores a different original after the first one: a
    // non-keyed or last-write-wins store returns the wrong text below.
    store.storeOriginal({ session_id: "s-minutes", original_request: OTHER_SESSION_ORIGINAL });

    const record = performOriginalReanchor({
      store,
      session_id: "s-backup",
      threshold: "scope",
    });

    expect(record.threshold).toBe("scope");
    // The record supplies the original request text in full. A reminder-only
    // implementation (an instruction string such as '원문을 떠올려라' with no
    // original text) has no field equal to the stored original and fails
    // here; a summary in place of the original also fails string identity.
    expect(record.supplied_original).toBe(STORED_ORIGINAL);
    expect(record.supplied_original).not.toBe(OTHER_SESSION_ORIGINAL);

    // The other session's re-anchor supplies its own original: the retrieval
    // is keyed, not a single remembered value.
    const otherRecord = performOriginalReanchor({
      store,
      session_id: "s-minutes",
      threshold: "scope",
    });
    expect(otherRecord.supplied_original).toBe(OTHER_SESSION_ORIGINAL);
  });

  test("the completion-declaration threshold supplies the original verbatim despite intervening summaries", () => {
    const store = storeWithOriginal("s-backup", STORED_ORIGINAL);

    // Conversation drifts: two non-threshold turns carry only the lossy
    // summary. The stored original must survive them untouched.
    recordReanchoredTurn({ store, session_id: "s-backup", turn: makeFixtureTurn("none", "t-1") });
    recordReanchoredTurn({ store, session_id: "s-backup", turn: makeFixtureTurn("none", "t-2") });

    const record = performOriginalReanchor({
      store,
      session_id: "s-backup",
      threshold: "completion",
    });

    expect(record.threshold).toBe("completion");
    expect(record.supplied_original).toBe(STORED_ORIGINAL);
    expect(record.supplied_original).not.toBe(DRIFTED_SUMMARY);
    expect(record.supplied_original).not.toContain(DRIFTED_SUMMARY);

    // Full text, not a head/truncation: the details the summary dropped are
    // present, and the line structure is intact.
    expect(record.supplied_original).toContain(".lock 파일은 절대 건드리지 말고");
    expect(record.supplied_original).toContain("실패하면 중단하고 나한테 메일로 알려줘");
    expect(record.supplied_original.split("\n").length).toBe(3);
    expect(record.supplied_original.length).toBe(STORED_ORIGINAL.length);
  });

  test("with no original stored, the re-anchor fails closed instead of fabricating a stand-in", () => {
    const store = createAnchorStore();

    // Nothing was stored for this session, so there is no original to supply.
    // Returning a reminder string (or an empty/placeholder original) would be
    // exactly the reminder-not-supply failure §8.3 rules out.
    expect(() =>
      performOriginalReanchor({ store, session_id: "s-unknown", threshold: "scope" }),
    ).toThrow();
  });
});

describe("ac-16 clause 3 — fixture-turn structure: re-anchor fires at both cue-named thresholds", () => {
  test("a scope-judgment fixture turn records a non-empty re-anchor firing record", () => {
    const store = storeWithOriginal("s-backup", STORED_ORIGINAL);
    const turn = makeFixtureTurn("scope", "t-scope-1");

    const recorded = recordReanchoredTurn({ store, session_id: "s-backup", turn });

    expect(recorded.reanchor_fired).toBe(true);
    const reanchor = recorded.reanchor;
    if (!reanchor) throw new Error("expected the re-anchor record on a scope-threshold turn");

    // The firing record names the threshold it fired at, so the two fixtures
    // are distinguishable to the implementation, not just to the test.
    expect(reanchor.threshold).toBe("scope");
    // Non-empty firing record with supplied original = stored original, and
    // not the turn's own text.
    expect(reanchor.supplied_original.length).toBeGreaterThan(0);
    expect(reanchor.supplied_original).toBe(STORED_ORIGINAL);
    expect(reanchor.supplied_original).not.toBe(turn.content);
    expect(recorded.turn_id).toBe("t-scope-1");
    expect(recorded.threshold_tag).toBe("scope");
  });

  test("a completion-declaration fixture turn records a non-empty re-anchor firing record", () => {
    const store = storeWithOriginal("s-backup", STORED_ORIGINAL);
    const turn = makeFixtureTurn("completion", "t-completion-1");

    const recorded = recordReanchoredTurn({ store, session_id: "s-backup", turn });

    expect(recorded.reanchor_fired).toBe(true);
    const reanchor = recorded.reanchor;
    if (!reanchor) throw new Error("expected the re-anchor record on a completion-threshold turn");

    expect(reanchor.threshold).toBe("completion");
    expect(reanchor.supplied_original.length).toBeGreaterThan(0);
    expect(reanchor.supplied_original).toBe(STORED_ORIGINAL);
    expect(reanchor.supplied_original).not.toBe(turn.content);
    expect(recorded.turn_id).toBe("t-completion-1");
    expect(recorded.threshold_tag).toBe("completion");
  });

  test("a non-threshold fixture turn does not fire the re-anchor", () => {
    const store = storeWithOriginal("s-backup", STORED_ORIGINAL);

    const recorded = recordReanchoredTurn({
      store,
      session_id: "s-backup",
      turn: makeFixtureTurn("none", "t-ordinary-1"),
    });

    // Firing is gated by the threshold tag: a constant `true` fails here.
    expect(recorded.reanchor_fired).toBe(false);
    expect(recorded.reanchor ?? null).toBeNull();
    expect(recorded.turn_id).toBe("t-ordinary-1");
    expect(recorded.threshold_tag).toBe("none");
  });

  test("over a mixed turn sequence exactly the two threshold turns are logged, in order", () => {
    const store = storeWithOriginal("s-backup", STORED_ORIGINAL);

    for (const turn of [
      makeFixtureTurn("none", "t-1"),
      makeFixtureTurn("scope", "t-2"),
      makeFixtureTurn("none", "t-3"),
      makeFixtureTurn("completion", "t-4"),
    ]) {
      recordReanchoredTurn({ store, session_id: "s-backup", turn });
    }

    const log = store.reanchorLog("s-backup");

    // One firing per cue-named threshold, in the order the turns arrived —
    // neither always-fire (4) nor never-fire (0).
    expect(log.length).toBe(2);
    expect(log.map((entry) => entry.threshold)).toEqual(["scope", "completion"]);
    expect(log.map((entry) => entry.turn_id)).toEqual(["t-2", "t-4"]);
    for (const entry of log) {
      expect(entry.supplied_original).toBe(STORED_ORIGINAL);
    }

    // A session that never had a threshold turn has an empty log.
    store.storeOriginal({ session_id: "s-minutes", original_request: OTHER_SESSION_ORIGINAL });
    recordReanchoredTurn({
      store,
      session_id: "s-minutes",
      turn: makeFixtureTurn("none", "t-m1"),
    });
    expect(store.reanchorLog("s-minutes").length).toBe(0);
  });
});
