/**
 * Acceptance test for ac-D2 — teach-back pointer + immediacy (extends ac-30):
 * (1) per-section immediate confirmation is forced — whenever an intent
 * section is settled, that section's teach-back confirmation is demanded
 * immediately; a fixture that accumulates several settled sections
 * unconfirmed and then batches the confirmations at the end (just before
 * lock) deterministically raises the `deferred_confirmation` violation flag,
 * while a fixture that confirms each section right after settling it raises
 * no flag (batched-violation / immediate-pass fixture pair);
 * (2) pointer lock gate — a fixture holding even one decision item without a
 * `teachback_confirmed` utterance pointer has its finalize (lock) attempt
 * refused fail-closed, while a fixture in which every decision item carries a
 * `teachback_confirmed` pointer to a recorded confirmation utterance is not
 * blocked by this gate (pointer-absent-refused / pointer-complete-passes
 * fixture pair);
 * (3) jurisdiction boundary — predictive confirmation (the anticipatory probe)
 * belongs to ac-33/C6, so this test neither requires nor scores the presence
 * or absence of predictive confirmation: a fixture with no prediction record
 * whatsoever passes as long as (1) and (2) hold, and interleaving prediction
 * events changes no verdict.
 *
 * Frozen red: the modules under src/interview/teachback/ named by the row's
 * module_plan (immediate-confirmation.ts, pointer-lock-gate.ts) do not exist
 * yet; the piece-3 implementation must turn this file green without editing
 * it.
 *
 * Oracle source: gate-a/rows/ac-D2.json (oracle_statement clauses 1-3).
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 * (a) teach-back quality — whether an immediately confirmed teach-back's
 *     "different words + example" is a genuine paraphrase is human judgment
 *     and belongs to ac-30 (the contract passage declares this itself);
 * (b) section segmentation — where one intent section begins and ends is
 *     LLM/human judgment; the fixtures fix the section boundaries and only the
 *     immediate-vs-deferred routing and the flag over those fixed boundaries
 *     are asserted (tag emission → pure gate routing pattern);
 * (c) the reality of the confirmation utterance a pointer points at — whether
 *     the pointed-to utterance is a real user understanding-check is not
 *     closed by pointer/field inspection and needs a real user answer;
 * (d) analogy-transfer efficacy — the transfer of clinical immediate teach-back
 *     to software interviews is a structural analogy whose efficacy stays
 *     unmeasured until the C4 harness (ac-40).
 */

import { describe, expect, test } from "bun:test";
import {
  DEFERRED_CONFIRMATION_FLAG,
  checkImmediateConfirmation,
} from "../src/interview/teachback/immediate-confirmation";
import { checkPointerLockGate } from "../src/interview/teachback/pointer-lock-gate";

// --- fixtures ----------------------------------------------------------------

// The session timeline is an ordered array; array order IS the timeline order.
// Only `section_settled` / `section_confirmed` events are confirmation-relevant.

const SETTLE_GOAL = { kind: "section_settled", section_id: "sec-goal" } as const;
const SETTLE_SCOPE = { kind: "section_settled", section_id: "sec-scope" } as const;
const SETTLE_NONGOAL = { kind: "section_settled", section_id: "sec-nongoal" } as const;

const CONFIRM_GOAL = {
  kind: "section_confirmed",
  section_id: "sec-goal",
  utterance_id: "utt-goal-ok",
} as const;
const CONFIRM_SCOPE = {
  kind: "section_confirmed",
  section_id: "sec-scope",
  utterance_id: "utt-scope-ok",
} as const;
const CONFIRM_NONGOAL = {
  kind: "section_confirmed",
  section_id: "sec-nongoal",
  utterance_id: "utt-nongoal-ok",
} as const;

// Fixture A — batched: three sections settled back to back, every confirmation
// deferred to the end of the session, immediately before the lock attempt.
const BATCHED_TIMELINE = [
  SETTLE_GOAL,
  SETTLE_SCOPE,
  SETTLE_NONGOAL,
  CONFIRM_GOAL,
  CONFIRM_SCOPE,
  CONFIRM_NONGOAL,
];

// Fixture B — immediate: each section is confirmed right after it is settled.
const IMMEDIATE_TIMELINE = [
  SETTLE_GOAL,
  CONFIRM_GOAL,
  SETTLE_SCOPE,
  CONFIRM_SCOPE,
  SETTLE_NONGOAL,
  CONFIRM_NONGOAL,
];

// --- clause 1 ----------------------------------------------------------------

describe("ac-D2 clause 1 — per-section immediate confirmation is forced; batching to the end raises deferred_confirmation", () => {
  test("the violation flag is the literal `deferred_confirmation`", () => {
    expect(DEFERRED_CONFIRMATION_FLAG).toBe("deferred_confirmation");
  });

  test("batched fixture: every section whose confirmation was deferred is flagged deferred_confirmation", () => {
    const result = checkImmediateConfirmation({ events: BATCHED_TIMELINE });

    expect(result.passed).toBe(false);
    expect(result.violations.map((violation) => violation.section_id)).toEqual([
      "sec-goal",
      "sec-scope",
      "sec-nongoal",
    ]);
    expect(result.violations.map((violation) => violation.flag)).toEqual([
      "deferred_confirmation",
      "deferred_confirmation",
      "deferred_confirmation",
    ]);

    // deterministic: the same timeline yields the same verdict
    expect(checkImmediateConfirmation({ events: BATCHED_TIMELINE })).toEqual(result);
  });

  test("immediate fixture: confirming each section right after settling it raises no flag at all", () => {
    const result = checkImmediateConfirmation({ events: IMMEDIATE_TIMELINE });

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  test("the flag is per-section: an immediately confirmed section is not flagged alongside a deferred one", () => {
    const mixed = [SETTLE_GOAL, CONFIRM_GOAL, SETTLE_SCOPE, SETTLE_NONGOAL, CONFIRM_NONGOAL];

    const result = checkImmediateConfirmation({ events: mixed });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([{ section_id: "sec-scope", flag: "deferred_confirmation" }]);
  });

  test("fail-closed: a settled section that is never confirmed at all counts as deferred, not as clean", () => {
    const result = checkImmediateConfirmation({
      events: [SETTLE_GOAL, CONFIRM_GOAL, SETTLE_SCOPE],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([{ section_id: "sec-scope", flag: "deferred_confirmation" }]);
  });

  test("order is enforced: a confirmation recorded before its section is settled does not satisfy immediacy", () => {
    const result = checkImmediateConfirmation({
      events: [CONFIRM_GOAL, SETTLE_GOAL],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([{ section_id: "sec-goal", flag: "deferred_confirmation" }]);
  });

  test("an empty timeline settles nothing and therefore defers nothing", () => {
    expect(checkImmediateConfirmation({ events: [] })).toEqual({ passed: true, violations: [] });
  });
});

// --- clause 2 ----------------------------------------------------------------

describe("ac-D2 clause 2 — finalize is refused fail-closed unless every decision item carries a teachback_confirmed pointer", () => {
  const CONFIRMATION_UTTERANCES = [
    { utterance_id: "utt-goal-ok", speaker: "user", text: "네, 그 이해가 맞아요" },
    { utterance_id: "utt-scope-ok", speaker: "user", text: "맞아요, 그 범위예요" },
  ];

  const POINTERED_GOAL_ITEM = {
    item_id: "item-goal",
    decision: true,
    teachback_confirmed: "utt-goal-ok",
  };
  const POINTERED_SCOPE_ITEM = {
    item_id: "item-scope",
    decision: true,
    teachback_confirmed: "utt-scope-ok",
  };
  const UNPOINTERED_NONGOAL_ITEM = {
    item_id: "item-nongoal",
    decision: true,
  };

  test("pointer-absent fixture: one decision item without the pointer refuses the lock and names the blocking item", () => {
    const result = checkPointerLockGate({
      action: "finalize",
      items: [POINTERED_GOAL_ITEM, POINTERED_SCOPE_ITEM, UNPOINTERED_NONGOAL_ITEM],
      confirmation_utterances: CONFIRMATION_UTTERANCES,
    });

    expect(result.allowed).toBe(false);
    expect(result.blocking_item_ids).toEqual(["item-nongoal"]);
    expect(result.reason).toBe("missing_teachback_confirmed_pointer");
  });

  test("fail-closed: a blank pointer value is treated as no pointer, not as a satisfied gate", () => {
    const result = checkPointerLockGate({
      action: "finalize",
      items: [POINTERED_GOAL_ITEM, { ...UNPOINTERED_NONGOAL_ITEM, teachback_confirmed: "" }],
      confirmation_utterances: CONFIRMATION_UTTERANCES,
    });

    expect(result.allowed).toBe(false);
    expect(result.blocking_item_ids).toEqual(["item-nongoal"]);
    expect(result.reason).toBe("missing_teachback_confirmed_pointer");
  });

  test("fail-closed: a pointer that resolves to no recorded confirmation utterance does not satisfy the gate", () => {
    const result = checkPointerLockGate({
      action: "finalize",
      items: [
        POINTERED_GOAL_ITEM,
        { ...UNPOINTERED_NONGOAL_ITEM, teachback_confirmed: "utt-ghost" },
      ],
      confirmation_utterances: CONFIRMATION_UTTERANCES,
    });

    expect(result.allowed).toBe(false);
    expect(result.blocking_item_ids).toEqual(["item-nongoal"]);
    expect(result.reason).toBe("dangling_teachback_confirmed_pointer");
  });

  test("pointer-complete fixture: when every decision item points at a recorded confirmation utterance the gate does not block the lock", () => {
    const result = checkPointerLockGate({
      action: "finalize",
      items: [POINTERED_GOAL_ITEM, POINTERED_SCOPE_ITEM],
      confirmation_utterances: CONFIRMATION_UTTERANCES,
    });

    expect(result.allowed).toBe(true);
    expect(result.blocking_item_ids).toEqual([]);
  });

  test("the gate covers decision items only: a non-decision note without a pointer does not block the lock", () => {
    const result = checkPointerLockGate({
      action: "finalize",
      items: [
        POINTERED_GOAL_ITEM,
        { item_id: "item-note", decision: false, text: "사용자는 CI 안에서 실행할 것으로 보인다" },
      ],
      confirmation_utterances: CONFIRMATION_UTTERANCES,
    });

    expect(result.allowed).toBe(true);
    expect(result.blocking_item_ids).toEqual([]);
  });

  test("every unpointered decision item is reported, and the refusal is deterministic", () => {
    const input = {
      action: "finalize" as const,
      items: [
        POINTERED_GOAL_ITEM,
        UNPOINTERED_NONGOAL_ITEM,
        { item_id: "item-retention", decision: true },
      ],
      confirmation_utterances: CONFIRMATION_UTTERANCES,
    };

    const result = checkPointerLockGate(input);

    expect(result.allowed).toBe(false);
    expect(result.blocking_item_ids).toEqual(["item-nongoal", "item-retention"]);
    expect(checkPointerLockGate(input)).toEqual(result);
  });
});

// --- clause 3 ----------------------------------------------------------------

describe("ac-D2 clause 3 — predictive confirmation is ac-33/C6 jurisdiction: neither required nor scored here", () => {
  test("a session with no prediction record whatsoever passes both gates on clauses (1) and (2) alone", () => {
    const immediate = checkImmediateConfirmation({ events: IMMEDIATE_TIMELINE });
    expect(immediate.passed).toBe(true);
    expect(immediate.violations).toEqual([]);

    const lock = checkPointerLockGate({
      action: "finalize",
      items: [{ item_id: "item-goal", decision: true, teachback_confirmed: "utt-goal-ok" }],
      confirmation_utterances: [
        { utterance_id: "utt-goal-ok", speaker: "user", text: "네, 그 이해가 맞아요" },
      ],
    });
    expect(lock.allowed).toBe(true);
    expect(lock.blocking_item_ids).toEqual([]);
  });

  test("interleaving predictive probe events changes no immediacy verdict — they are not scored here", () => {
    const withProbes = [
      { kind: "prediction_probe", section_id: "sec-goal", text: "다음에 무슨 일이 일어날까요?" },
      SETTLE_GOAL,
      CONFIRM_GOAL,
      { kind: "prediction_probe", section_id: "sec-scope", text: "어떤 파일이 남을까요?" },
      SETTLE_SCOPE,
      CONFIRM_SCOPE,
      SETTLE_NONGOAL,
      CONFIRM_NONGOAL,
    ];

    expect(checkImmediateConfirmation({ events: withProbes })).toEqual(
      checkImmediateConfirmation({ events: IMMEDIATE_TIMELINE }),
    );
  });

  test("a predictive probe standing between a settlement and its confirmation neither excuses nor causes a deferral", () => {
    const probeInsideBatch = [
      SETTLE_GOAL,
      { kind: "prediction_probe", section_id: "sec-goal", text: "무엇이 압축될까요?" },
      CONFIRM_GOAL,
    ];

    expect(checkImmediateConfirmation({ events: probeInsideBatch })).toEqual({
      passed: true,
      violations: [],
    });

    const probeInsideDeferral = [
      SETTLE_GOAL,
      { kind: "prediction_probe", section_id: "sec-goal", text: "무엇이 압축될까요?" },
      SETTLE_SCOPE,
      CONFIRM_GOAL,
      CONFIRM_SCOPE,
    ];

    expect(checkImmediateConfirmation({ events: probeInsideDeferral })).toEqual({
      passed: false,
      violations: [
        { section_id: "sec-goal", flag: "deferred_confirmation" },
        { section_id: "sec-scope", flag: "deferred_confirmation" },
      ],
    });
  });
});
