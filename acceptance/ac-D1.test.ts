/**
 * Acceptance test for ac-D1 — Habermas truthfulness channel (added to ac-31's
 * fact channel and the is-ought justification channel): when a stated
 * preference and in-session behavior diverge ("quality first" while rejecting
 * every quality cost), the divergence is surfaced ONLY as a question carrying
 * concrete instances — never as blame — and it is routed to the truthfulness
 * channel, which is a distinct value from the fact (B2) and justification
 * (is-ought) channels.
 *
 * Frozen red: the three modules named in gate-a/rows/ac-D1.json module_plan
 * (src/interview/channels/validity-channel.ts,
 *  src/interview/sincerity/mismatch-record.ts,
 *  src/interview/sincerity/concrete-instance-question.ts) do not exist yet;
 * the piece-3 implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-D1.json, oracle_statement clauses (1)-(4).
 * The divergence JUDGMENT is residual, so every assertion runs on top of
 * test-injected deterministic detection records (a stated-preference utterance
 * pointer plus pointers to behavior records tagged as diverging); only the
 * machine properties downstream of those records are graded:
 *  (1) surfacing takes question form only — the output of surfacing an
 *      injected mismatch fixture is a question record holding >= 1 stated
 *      preference pointer and >= 1 concrete behavior-instance pointer, all of
 *      which resolve to real records; a surfacing attempt with zero instance
 *      pointers is deterministically refused;
 *  (2) not blame + the exclusivity of "only" — the surfacing record carries no
 *      blame/assertion tag and no verdict field about the user, and a fixture
 *      expressing the same mismatch in any form other than a question
 *      emission (an assertion record, an evaluation/blame tag) fails the gate;
 *  (3) channel distinction — fact / justification / truthfulness exist as
 *      three mutually distinct channel values; the injected statement-behavior
 *      mismatch routes to truthfulness and to neither of the other two, while
 *      two contrast fixtures (a cross-answer fact contradiction from the ac-31
 *      B2 pass, and an is-ought justification item) route to fact and to
 *      justification respectively and never into truthfulness;
 *  (4) determinism — the same detection record always yields the same channel
 *      routing and the same question emission.
 *
 * Two independent mismatch fixtures with disjoint pointer sets and different
 * pointer counts (1 stated / 2 behavior vs. 2 stated / 1 behavior, the second
 * listed out of store order) are used everywhere a surfacing output is graded,
 * so a constant question record cannot satisfy clause 1, the clause-3 channel
 * stamp, or the clause-4 emission determinism.
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 *  - Divergence judgment: whether a stated preference and the session behavior
 *    really diverge is LLM/human judgment (the contract statement declares it
 *    residual itself); the fixtures inject the detection record.
 *  - Detection quality of the production detector (missed / spurious
 *    divergences): a run with zero detections can still pass structurally, so
 *    quality belongs to the retro/calibration loop (bundle 7).
 *  - Whether the question prose is genuinely non-accusatory in tone: only the
 *    absence of blame/assertion tags and verdict fields plus the question form
 *    are checked; sentence wording and tone are not graded.
 *  - Whether a given utterance truly belongs in the fact / justification /
 *    truthfulness channel: routing above the fixture tag is deterministic, but
 *    the tagging itself inherits the divergence-judgment residual.
 */

import { describe, expect, test } from "bun:test";
import {
  VALIDITY_CHANNELS,
  routeDetectionToChannel,
} from "../src/interview/channels/validity-channel";
import {
  checkSurfacingRecord,
  surfaceMismatchAsQuestion,
} from "../src/interview/sincerity/concrete-instance-question";
import {
  mismatchRecordSchema,
  resolveMismatchPointers,
} from "../src/interview/sincerity/mismatch-record";

// --- Fixtures ---------------------------------------------------------------

// The record store the pointers must resolve into. Text is kept verbatim so a
// resolution can be compared field-for-field against the stored record.
const STATED_PREFERENCE_TEXT = "품질이 최우선입니다. 느려도 좋으니 제대로 만들어 주세요.";
const BEHAVIOR_TEXT_TESTS = "테스트 작성 시간은 이번 주 일정에서 빼주세요.";
const BEHAVIOR_TEXT_REVIEW = "리뷰 단계는 생략하고 바로 배포합시다.";
const STATED_STABILITY_TEXT = "속도보다 안정성이 먼저입니다.";
const STATED_NO_SHORTCUT_TEXT = "지름길은 절대 쓰지 않겠습니다.";
const BEHAVIOR_TEXT_FORCE_PUSH = "그냥 강제 푸시로 넘기고 정리는 다음 분기에 하죠.";

const RECORDS = [
  {
    id: "utt-quality-first",
    kind: "stated_preference_utterance",
    text: STATED_PREFERENCE_TEXT,
    at: "2026-07-25T10:00:00.000Z",
  },
  {
    id: "beh-drop-tests",
    kind: "session_behavior",
    text: BEHAVIOR_TEXT_TESTS,
    at: "2026-07-25T10:12:00.000Z",
  },
  {
    id: "beh-skip-review",
    kind: "session_behavior",
    text: BEHAVIOR_TEXT_REVIEW,
    at: "2026-07-25T10:31:00.000Z",
  },
  {
    id: "ans-nightly-export",
    kind: "answer",
    text: "보고서는 매일 밤 자동으로 내보내 주세요.",
    at: "2026-07-25T10:40:00.000Z",
  },
  {
    id: "ans-never-auto",
    kind: "answer",
    text: "확인 없이 파일을 쓰는 동작은 절대 하지 마세요.",
    at: "2026-07-25T10:44:00.000Z",
  },
  {
    id: "ans-ought-claim",
    kind: "answer",
    text: "다들 그렇게 하니까 우리도 그렇게 해야 합니다.",
    at: "2026-07-25T10:52:00.000Z",
  },
  {
    id: "utt-stability-first",
    kind: "stated_preference_utterance",
    text: STATED_STABILITY_TEXT,
    at: "2026-07-25T11:05:00.000Z",
  },
  {
    id: "utt-no-shortcuts",
    kind: "stated_preference_utterance",
    text: STATED_NO_SHORTCUT_TEXT,
    at: "2026-07-25T11:07:00.000Z",
  },
  {
    id: "beh-force-push",
    kind: "session_behavior",
    text: BEHAVIOR_TEXT_FORCE_PUSH,
    at: "2026-07-25T11:20:00.000Z",
  },
];

// Injected deterministic detection record — the divergence judgment itself is
// residual, so it arrives pre-made and only its downstream routing is graded.
const MISMATCH_DETECTION = {
  id: "detect-mismatch-1",
  kind: "statement_behavior_mismatch",
  stated_preference_refs: ["utt-quality-first"],
  behavior_instance_refs: ["beh-drop-tests", "beh-skip-review"],
  detected_at: "2026-07-25T10:35:00.000Z",
};

// Second, fully disjoint mismatch fixture: two stated-preference pointers (in
// the reverse of their store order) and a single behavior instance. A surfacing
// implementation that returns a constant question cannot satisfy both fixtures.
const SECOND_MISMATCH_DETECTION = {
  id: "detect-mismatch-2",
  kind: "statement_behavior_mismatch",
  stated_preference_refs: ["utt-no-shortcuts", "utt-stability-first"],
  behavior_instance_refs: ["beh-force-push"],
  detected_at: "2026-07-25T11:25:00.000Z",
};

// Contrast fixture 1 — a cross-answer fact contradiction (the ac-31 B2 pass).
const FACT_CONTRADICTION_DETECTION = {
  id: "detect-fact-1",
  kind: "cross_answer_fact_contradiction",
  conflict_refs: ["ans-nightly-export", "ans-never-auto"],
  detected_at: "2026-07-25T10:46:00.000Z",
};

// Contrast fixture 2 — an is-ought justification item.
const JUSTIFICATION_DETECTION = {
  id: "detect-ought-1",
  kind: "is_ought_justification",
  claim_refs: ["ans-ought-claim"],
  detected_at: "2026-07-25T10:54:00.000Z",
};

// Every mismatch fixture paired with the pointer sets its emitted question must
// carry and the verbatim record text each pointer must resolve to.
const MISMATCH_CASES = [
  {
    label: "detect-mismatch-1",
    detection: MISMATCH_DETECTION,
    statedRefs: ["utt-quality-first"],
    behaviorRefs: ["beh-drop-tests", "beh-skip-review"],
    statedTexts: [STATED_PREFERENCE_TEXT],
    behaviorTexts: [BEHAVIOR_TEXT_TESTS, BEHAVIOR_TEXT_REVIEW],
  },
  {
    label: "detect-mismatch-2",
    detection: SECOND_MISMATCH_DETECTION,
    statedRefs: ["utt-no-shortcuts", "utt-stability-first"],
    behaviorRefs: ["beh-force-push"],
    statedTexts: [STATED_NO_SHORTCUT_TEXT, STATED_STABILITY_TEXT],
    behaviorTexts: [BEHAVIOR_TEXT_FORCE_PUSH],
  },
];

// --- Local helpers (self-contained; nothing is shared with other test files) --

type AnyRecord = Record<string, unknown>;

function surfaceOrThrow(detection: AnyRecord) {
  const result = surfaceMismatchAsQuestion({ detection, records: RECORDS });
  if (!result.surfaced) {
    throw new Error(`expected ${String(detection.id)} to be surfaced`);
  }
  return result.question;
}

function identity(record: AnyRecord) {
  return { id: record.id, kind: record.kind, text: record.text };
}

function expectedIdentities(ids: string[]) {
  return ids.map((id) => {
    const stored = RECORDS.find((record) => record.id === id);
    if (!stored) throw new Error(`fixture store is missing ${id}`);
    return identity(stored as unknown as AnyRecord);
  });
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

// Values that legitimately look like timestamps: they come from the fixtures.
const FIXTURE_TIMESTAMPS = new Set<string>([
  ...RECORDS.map((record) => record.at),
  MISMATCH_DETECTION.detected_at,
  SECOND_MISMATCH_DETECTION.detected_at,
  FACT_CONTRADICTION_DETECTION.detected_at,
  JUSTIFICATION_DETECTION.detected_at,
]);

// Any string in the emitted record that parses as a moment close to the wall
// clock is a non-deterministic field (created_at: new Date()...), which would
// make "the same detection always yields the same question" false across runs
// even though two same-millisecond calls compare equal.
function wallClockDerivedStrings(record: unknown): string[] {
  const now = Date.now();
  return collectStrings(record).filter((value) => {
    if (FIXTURE_TIMESTAMPS.has(value)) return false;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && Math.abs(parsed - now) < 10 * 60 * 1000;
  });
}

// Run fn with a shifted clock and a pinned Math.random so any dependency on
// ambient entropy shows up as a difference between the two results.
function withShiftedAmbient<T>(fn: () => T): T {
  const realNow = Date.now;
  const realRandom = Math.random;
  Date.now = () => Date.parse("2031-03-04T05:06:07.008Z");
  Math.random = () => 0.4242424242;
  try {
    return fn();
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
  }
}

// --- Clause 1: surfacing is a question record with resolvable instance pointers

describe("ac-D1 clause 1: surfacing emits a concrete-instance question with resolvable pointers", () => {
  for (const testCase of MISMATCH_CASES) {
    test(`${testCase.label}: the surfacing output is a question record, not a statement about the user`, () => {
      const result = surfaceMismatchAsQuestion({
        detection: testCase.detection,
        records: RECORDS,
      });
      expect(result.surfaced).toBe(true);
      if (!result.surfaced) throw new Error("expected the mismatch to be surfaced");
      expect(result.question.kind).toBe("concrete_instance_question");
      expect(typeof result.question.question_text).toBe("string");
      expect(result.question.question_text.length).toBeGreaterThan(0);
      expect(result.question.question_text.trim().endsWith("?")).toBe(true);
    });

    test(`${testCase.label}: the emitted pointers are exactly the pointers of that detection`, () => {
      const question = surfaceOrThrow(testCase.detection);
      expect(question.stated_preference_refs.length).toBeGreaterThanOrEqual(1);
      expect(question.behavior_instance_refs.length).toBeGreaterThanOrEqual(1);
      expect(question.stated_preference_refs).toEqual(testCase.statedRefs);
      expect(question.behavior_instance_refs).toEqual(testCase.behaviorRefs);
    });

    test(`${testCase.label}: every pointer of the emitted question resolves to the real record, verbatim`, () => {
      const question = surfaceOrThrow(testCase.detection);
      const resolution = resolveMismatchPointers({ question, records: RECORDS });
      expect(resolution.resolved).toBe(true);
      if (!resolution.resolved) throw new Error("expected every pointer to resolve");
      expect(resolution.stated_preferences.map(identity)).toEqual(
        expectedIdentities(testCase.statedRefs),
      );
      expect(resolution.behavior_instances.map(identity)).toEqual(
        expectedIdentities(testCase.behaviorRefs),
      );
      expect(resolution.stated_preferences.map((r: AnyRecord) => r.text)).toEqual(
        testCase.statedTexts,
      );
      expect(resolution.behavior_instances.map((r: AnyRecord) => r.text)).toEqual(
        testCase.behaviorTexts,
      );
    });
  }

  test("the two disjoint detections produce two different questions", () => {
    const first = surfaceOrThrow(MISMATCH_DETECTION);
    const second = surfaceOrThrow(SECOND_MISMATCH_DETECTION);
    expect(second).not.toEqual(first);
    expect(second.stated_preference_refs).not.toEqual(first.stated_preference_refs);
    expect(second.behavior_instance_refs).not.toEqual(first.behavior_instance_refs);
  });

  test("resolution follows the pointer order given, not the record-store order", () => {
    const resolution = resolveMismatchPointers({
      question: {
        id: "q-reordered",
        kind: "concrete_instance_question",
        channel: VALIDITY_CHANNELS.truthfulness,
        question_text: "이 두 장면을 어떻게 이어 보면 좋을까요?",
        stated_preference_refs: ["utt-stability-first", "utt-quality-first"],
        behavior_instance_refs: ["beh-skip-review", "beh-force-push", "beh-drop-tests"],
      },
      records: RECORDS,
    });
    expect(resolution.resolved).toBe(true);
    if (!resolution.resolved) throw new Error("expected every pointer to resolve");
    expect(resolution.stated_preferences.map((r: AnyRecord) => r.text)).toEqual([
      STATED_STABILITY_TEXT,
      STATED_PREFERENCE_TEXT,
    ]);
    expect(resolution.behavior_instances.map((r: AnyRecord) => r.text)).toEqual([
      BEHAVIOR_TEXT_REVIEW,
      BEHAVIOR_TEXT_FORCE_PUSH,
      BEHAVIOR_TEXT_TESTS,
    ]);
  });

  test("resolution against a store missing one record fails, naming the unresolved pointer", () => {
    const thinnedStore = RECORDS.filter((record) => record.id !== "beh-skip-review");
    const resolution = resolveMismatchPointers({
      question: surfaceOrThrow(MISMATCH_DETECTION),
      records: thinnedStore,
    });
    expect(resolution.resolved).toBe(false);
    if (resolution.resolved) throw new Error("expected the missing record to fail resolution");
    expect(resolution.reason).toContain("beh-skip-review");
  });

  test("a dangling behavior pointer fails resolution instead of silently dropping", () => {
    const resolution = resolveMismatchPointers({
      question: {
        id: "q-dangling",
        kind: "concrete_instance_question",
        channel: VALIDITY_CHANNELS.truthfulness,
        question_text: "이 경우엔 어떻게 볼까요?",
        stated_preference_refs: ["utt-quality-first"],
        behavior_instance_refs: ["beh-does-not-exist"],
      },
      records: RECORDS,
    });
    expect(resolution.resolved).toBe(false);
    if (resolution.resolved) throw new Error("expected the dangling pointer to fail resolution");
    expect(resolution.reason).toContain("beh-does-not-exist");
  });

  test("a dangling stated-preference pointer fails resolution too", () => {
    const resolution = resolveMismatchPointers({
      question: {
        id: "q-dangling-stated",
        kind: "concrete_instance_question",
        channel: VALIDITY_CHANNELS.truthfulness,
        question_text: "이 대목은 어떻게 읽을까요?",
        stated_preference_refs: ["utt-never-said"],
        behavior_instance_refs: ["beh-force-push"],
      },
      records: RECORDS,
    });
    expect(resolution.resolved).toBe(false);
    if (resolution.resolved) throw new Error("expected the dangling pointer to fail resolution");
    expect(resolution.reason).toContain("utt-never-said");
  });

  test("a surfacing attempt with zero instance pointers is deterministically refused", () => {
    const noInstances = { ...MISMATCH_DETECTION, behavior_instance_refs: [] };
    const first = surfaceMismatchAsQuestion({ detection: noInstances, records: RECORDS });
    const second = surfaceMismatchAsQuestion({ detection: noInstances, records: RECORDS });
    expect(first.surfaced).toBe(false);
    if (first.surfaced) throw new Error("expected the instance-less surfacing to be refused");
    expect(first.reason).toContain("사례");
    expect(second).toEqual(first);
  });

  test("the second fixture with its instances stripped is refused as well", () => {
    const result = surfaceMismatchAsQuestion({
      detection: { ...SECOND_MISMATCH_DETECTION, behavior_instance_refs: [] },
      records: RECORDS,
    });
    expect(result.surfaced).toBe(false);
    if (result.surfaced) throw new Error("expected the instance-less surfacing to be refused");
    expect(result.reason).toContain("사례");
  });

  test("a detection whose instance pointer names no real record is refused", () => {
    const result = surfaceMismatchAsQuestion({
      detection: { ...MISMATCH_DETECTION, behavior_instance_refs: ["beh-ghost"] },
      records: RECORDS,
    });
    expect(result.surfaced).toBe(false);
    if (result.surfaced) throw new Error("expected the ghost pointer to be refused");
    expect(result.reason).toContain("beh-ghost");
  });

  test("a detection whose stated-preference pointer names no real record is refused", () => {
    const result = surfaceMismatchAsQuestion({
      detection: { ...SECOND_MISMATCH_DETECTION, stated_preference_refs: ["utt-phantom"] },
      records: RECORDS,
    });
    expect(result.surfaced).toBe(false);
    if (result.surfaced) throw new Error("expected the phantom pointer to be refused");
    expect(result.reason).toContain("utt-phantom");
  });

  test("surfacing against an empty record store is refused, not emitted blind", () => {
    const result = surfaceMismatchAsQuestion({ detection: MISMATCH_DETECTION, records: [] });
    expect(result.surfaced).toBe(false);
    if (result.surfaced) throw new Error("expected the empty store to be refused");
    expect(result.reason).toContain("utt-quality-first");
  });

  test("the detection schema requires both pointer kinds to be non-empty", () => {
    expect(mismatchRecordSchema.safeParse(MISMATCH_DETECTION).success).toBe(true);
    expect(mismatchRecordSchema.safeParse(SECOND_MISMATCH_DETECTION).success).toBe(true);
    expect(
      mismatchRecordSchema.safeParse({ ...MISMATCH_DETECTION, behavior_instance_refs: [] }).success,
    ).toBe(false);
    expect(
      mismatchRecordSchema.safeParse({ ...MISMATCH_DETECTION, stated_preference_refs: [] }).success,
    ).toBe(false);
    expect(
      mismatchRecordSchema.safeParse({
        ...SECOND_MISMATCH_DETECTION,
        behavior_instance_refs: [],
      }).success,
    ).toBe(false);
  });
});

// --- Clause 2: not blame, and "only as a question" is exclusive --------------

describe("ac-D1 clause 2: no blame tag, no verdict field, and question form is exclusive", () => {
  for (const testCase of MISMATCH_CASES) {
    test(`${testCase.label}: the emitted question record carries no verdict field about the user`, () => {
      const question = surfaceOrThrow(testCase.detection) as AnyRecord;
      expect("verdict" in question).toBe(false);
      expect("user_verdict" in question).toBe(false);
      expect(Object.keys(question).some((key) => /verdict|blame|judgment/i.test(key))).toBe(false);
    });

    test(`${testCase.label}: the emitted question record carries no blame or assertion tag and passes the gate`, () => {
      const question = surfaceOrThrow(testCase.detection);
      const tags = (question.tags ?? []) as string[];
      for (const forbidden of ["blame", "assertion", "evaluation", "비난", "단정"]) {
        expect(tags).not.toContain(forbidden);
      }
      expect(checkSurfacingRecord(question).ok).toBe(true);
    });
  }

  test("expressing the same mismatch as an assertion record fails the gate", () => {
    const verdict = checkSurfacingRecord({
      id: "surf-assertion",
      kind: "mismatch_assertion",
      channel: VALIDITY_CHANNELS.truthfulness,
      statement: "품질 우선이라고 하셨지만 실제로는 품질 비용을 전부 기각하셨습니다.",
      stated_preference_refs: ["utt-quality-first"],
      behavior_instance_refs: ["beh-drop-tests"],
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected the assertion form to be refused");
    expect(verdict.reason).toContain("질문");
  });

  test("a question-kind record whose text is not a question fails the gate", () => {
    const verdict = checkSurfacingRecord({
      ...(surfaceOrThrow(MISMATCH_DETECTION) as AnyRecord),
      question_text: "품질 비용을 전부 기각하셨습니다.",
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected the non-question text to be refused");
    expect(verdict.reason).toContain("질문");
  });

  test("every blame or assertion tag is refused by the gate, each named in the reason", () => {
    const base = surfaceOrThrow(MISMATCH_DETECTION) as AnyRecord;
    for (const forbidden of ["evaluation", "blame", "assertion", "비난", "단정"]) {
      const verdict = checkSurfacingRecord({ ...base, tags: [forbidden] });
      expect(verdict.ok).toBe(false);
      if (verdict.ok) throw new Error(`expected the ${forbidden} tag to be refused`);
      expect(verdict.reason).toContain(forbidden);
    }
  });

  test("a forbidden tag hidden among benign tags is still refused", () => {
    const base = surfaceOrThrow(SECOND_MISMATCH_DETECTION) as AnyRecord;
    const verdict = checkSurfacingRecord({
      ...base,
      tags: ["interview", "truthfulness", "비난", "follow_up"],
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected the hidden blame tag to be refused");
    expect(verdict.reason).toContain("비난");
  });

  test("benign tags alone keep the surfacing record acceptable", () => {
    const base = surfaceOrThrow(MISMATCH_DETECTION) as AnyRecord;
    expect(checkSurfacingRecord({ ...base, tags: ["interview", "follow_up"] }).ok).toBe(true);
  });

  test("a question record carrying a verdict field about the user fails the gate", () => {
    const base = surfaceOrThrow(MISMATCH_DETECTION) as AnyRecord;
    const verdict = checkSurfacingRecord({ ...base, verdict: "inconsistent" });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected the verdict field to be refused");
    expect(verdict.reason).toContain("verdict");
  });

  test("a question record carrying a user_verdict field fails the gate too", () => {
    const base = surfaceOrThrow(SECOND_MISMATCH_DETECTION) as AnyRecord;
    const verdict = checkSurfacingRecord({ ...base, user_verdict: "말과 행동이 다름" });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected the user_verdict field to be refused");
    expect(verdict.reason).toContain("verdict");
  });

  test("a question record without any concrete instance pointer fails the gate", () => {
    for (const testCase of MISMATCH_CASES) {
      const base = surfaceOrThrow(testCase.detection) as AnyRecord;
      const verdict = checkSurfacingRecord({ ...base, behavior_instance_refs: [] });
      expect(verdict.ok).toBe(false);
      if (verdict.ok) throw new Error("expected the instance-less question to be refused");
      expect(verdict.reason).toContain("사례");
    }
  });
});

// --- Clause 3: three distinct channels, mutually exclusive routing -----------

describe("ac-D1 clause 3: fact / justification / truthfulness are three distinct channels", () => {
  test("the channel value set holds three mutually distinct values", () => {
    expect(VALIDITY_CHANNELS.fact).toBe("fact");
    expect(VALIDITY_CHANNELS.justification).toBe("justification");
    expect(VALIDITY_CHANNELS.truthfulness).toBe("truthfulness");
    expect(
      new Set([
        VALIDITY_CHANNELS.fact,
        VALIDITY_CHANNELS.justification,
        VALIDITY_CHANNELS.truthfulness,
      ]).size,
    ).toBe(3);
  });

  test("both injected statement-behavior mismatches route to the truthfulness channel only", () => {
    for (const testCase of MISMATCH_CASES) {
      const routing = routeDetectionToChannel(testCase.detection);
      expect(routing.routed).toBe(true);
      if (!routing.routed) throw new Error("expected the mismatch to be routed");
      expect(routing.channel).toBe(VALIDITY_CHANNELS.truthfulness);
      expect(routing.channel).not.toBe(VALIDITY_CHANNELS.fact);
      expect(routing.channel).not.toBe(VALIDITY_CHANNELS.justification);
    }
  });

  test("contrast fixture 1: a cross-answer fact contradiction routes to the fact channel", () => {
    const routing = routeDetectionToChannel(FACT_CONTRADICTION_DETECTION);
    expect(routing.routed).toBe(true);
    if (!routing.routed) throw new Error("expected the fact contradiction to be routed");
    expect(routing.channel).toBe(VALIDITY_CHANNELS.fact);
    expect(routing.channel).not.toBe(VALIDITY_CHANNELS.truthfulness);
  });

  test("contrast fixture 2: an is-ought item routes to the justification channel", () => {
    const routing = routeDetectionToChannel(JUSTIFICATION_DETECTION);
    expect(routing.routed).toBe(true);
    if (!routing.routed) throw new Error("expected the is-ought item to be routed");
    expect(routing.channel).toBe(VALIDITY_CHANNELS.justification);
    expect(routing.channel).not.toBe(VALIDITY_CHANNELS.truthfulness);
  });

  test("the three fixtures land in three different channels (mutual exclusion)", () => {
    const channels = [
      MISMATCH_DETECTION,
      FACT_CONTRADICTION_DETECTION,
      JUSTIFICATION_DETECTION,
    ].map((detection) => {
      const routing = routeDetectionToChannel(detection);
      if (!routing.routed) throw new Error(`expected ${detection.id} to be routed`);
      return routing.channel;
    });
    expect(channels).toEqual([
      VALIDITY_CHANNELS.truthfulness,
      VALIDITY_CHANNELS.fact,
      VALIDITY_CHANNELS.justification,
    ]);
    expect(new Set(channels).size).toBe(3);
  });

  test("every emitted question is stamped with the channel its detection routes to", () => {
    for (const testCase of MISMATCH_CASES) {
      const question = surfaceOrThrow(testCase.detection);
      const routing = routeDetectionToChannel(testCase.detection);
      if (!routing.routed) throw new Error("expected the mismatch to be routed");
      expect(question.channel).toBe(VALIDITY_CHANNELS.truthfulness);
      expect(question.channel).toBe(routing.channel);
      expect(question.channel).not.toBe(VALIDITY_CHANNELS.fact);
      expect(question.channel).not.toBe(VALIDITY_CHANNELS.justification);
    }
  });

  test("surfacing refuses a detection that does not route to truthfulness", () => {
    const result = surfaceMismatchAsQuestion({
      detection: FACT_CONTRADICTION_DETECTION,
      records: RECORDS,
    });
    expect(result.surfaced).toBe(false);
    if (result.surfaced) throw new Error("expected the fact contradiction not to be surfaced here");
    expect(result.reason).toContain("cross_answer_fact_contradiction");
  });

  test("an unknown detection kind is refused rather than defaulting into a channel", () => {
    const routing = routeDetectionToChannel({
      id: "detect-unknown",
      kind: "vibes",
      detected_at: "2026-07-25T11:00:00.000Z",
    });
    expect(routing.routed).toBe(false);
    if (routing.routed) throw new Error("expected the unknown kind to be refused");
    expect(routing.reason).toContain("vibes");
  });
});

// --- Clause 4: determinism ---------------------------------------------------

describe("ac-D1 clause 4: the same detection record always yields the same routing and question", () => {
  test("routing maps the same detection to the same channel on every call", () => {
    for (const detection of [
      MISMATCH_DETECTION,
      SECOND_MISMATCH_DETECTION,
      FACT_CONTRADICTION_DETECTION,
      JUSTIFICATION_DETECTION,
    ]) {
      expect(routeDetectionToChannel(detection)).toEqual(routeDetectionToChannel(detection));
      expect(withShiftedAmbient(() => routeDetectionToChannel(detection))).toEqual(
        routeDetectionToChannel(detection),
      );
    }
  });

  test("surfacing maps the same detection to the same question record on every call", () => {
    for (const testCase of MISMATCH_CASES) {
      const input = { detection: testCase.detection, records: RECORDS };
      expect(surfaceMismatchAsQuestion(input)).toEqual(surfaceMismatchAsQuestion(input));
      expect(withShiftedAmbient(() => surfaceMismatchAsQuestion(input))).toEqual(
        surfaceMismatchAsQuestion(input),
      );
    }
  });

  test("the emitted question carries no wall-clock-derived field", () => {
    for (const testCase of MISMATCH_CASES) {
      expect(wallClockDerivedStrings(surfaceOrThrow(testCase.detection))).toEqual([]);
    }
  });

  test("emission does not depend on the order the record store happens to be in", () => {
    const shuffled = [...RECORDS].reverse();
    for (const testCase of MISMATCH_CASES) {
      expect(
        surfaceMismatchAsQuestion({ detection: testCase.detection, records: shuffled }),
      ).toEqual(surfaceMismatchAsQuestion({ detection: testCase.detection, records: RECORDS }));
    }
  });

  test("the refusal path is deterministic too", () => {
    const input = {
      detection: { ...MISMATCH_DETECTION, behavior_instance_refs: [] },
      records: RECORDS,
    };
    expect(surfaceMismatchAsQuestion(input)).toEqual(surfaceMismatchAsQuestion(input));
    expect(withShiftedAmbient(() => surfaceMismatchAsQuestion(input))).toEqual(
      surfaceMismatchAsQuestion(input),
    );
    expect(wallClockDerivedStrings(surfaceMismatchAsQuestion(input))).toEqual([]);
  });
});
