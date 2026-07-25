/**
 * ac-B4 acceptance — speech-act 6-force enum (ac-13/U3 extension): every
 * utterance record is force-tagged with force ∈ {제약, 선호, 예시, 가설,
 * 약속, 푸념}, and only binding forces (제약, 약속) qualify as AC grounding —
 * the gate rejects an AC grounding that references a non-binding utterance
 * ("X면 좋겠는데" cannot solidify into a requirement). Red-frozen.
 *
 * Oracle (gate-a/rows/ac-B4.json), covered clauses:
 *  (1) 6-force enum — utteranceRecordSchema (src/interview/force/
 *      speech-act-force.ts) accepts exactly the six Korean force values and
 *      keeps them verbatim; an utterance whose force field is missing or
 *      outside the enum is rejected by zod parsing (negative fixtures —
 *      per-utterance tagging is enforced as field requiredness).
 *  (2) non-binding force → AC-grounding blocked — evaluateAcGroundingGate
 *      (src/interview/force/ac-grounding-gate.ts) rejects an AC grounding
 *      whose referenced utterance has force ∉ {제약, 약속}: each of the four
 *      non-binding forces (선호, 예시, 가설, 푸념) used as grounding is
 *      rejected, and in particular the force='선호' utterance 'X면 좋겠는데'
 *      cannot solidify as requirement grounding — even when accompanied by a
 *      binding utterance the grounding is rejected, and the rejection names
 *      exactly the 선호 utterance.
 *  (3) binding-force qualification (2-state contrast) — a grounding whose
 *      utterances are all force ∈ {제약, 약속} (at least one of each) is NOT
 *      rejected on this ground: accepted === true with no rejected ids.
 *
 * Residual (NOT tested here, per row residual):
 *  - Force classification — whether a real utterance truly is a 제약/선호/
 *    예시/가설/약속/푸념 is a human-judged speech-act call; the fixtures fix
 *    the force labels, and this file asserts only enum enforcement and the
 *    gate's deterministic routing on top of those fixed labels.
 *  - Live tagging execution — whether every utterance of a live interview
 *    session actually passes through force tagging, and whether the labels
 *    reflect each utterance's real force, is not closed by this verdict; the
 *    machine checks only schema field requiredness (untagged utterances fail
 *    parsing) and the gate's deterministic blocking.
 */
import { describe, expect, test } from "bun:test";
import { evaluateAcGroundingGate } from "../src/interview/force/ac-grounding-gate";
import { utteranceRecordSchema } from "../src/interview/force/speech-act-force";

// One fixture utterance per force value. The force labels are fixed by the
// fixtures (classification correctness is residual).
const constraintUtterance = {
  utterance_id: "u-constraint",
  text: "로그인 없이는 결제 화면에 절대 접근할 수 없어야 합니다",
  force: "제약",
};

const commitmentUtterance = {
  utterance_id: "u-commitment",
  text: "테스트 계정은 제가 내일까지 준비해 두겠습니다",
  force: "약속",
};

// The exact utterance named by the locked criterion statement: a preference
// phrased as 'X면 좋겠는데' must not harden into a requirement.
const preferenceUtterance = {
  utterance_id: "u-preference",
  text: "X면 좋겠는데",
  force: "선호",
};

const exampleUtterance = {
  utterance_id: "u-example",
  text: "예를 들어 CSV로 내보내는 식이면 되지 않을까요",
  force: "예시",
};

const hypothesisUtterance = {
  utterance_id: "u-hypothesis",
  text: "만약 사용자가 만 명쯤 되면 캐시가 필요할지도 몰라요",
  force: "가설",
};

const complaintUtterance = {
  utterance_id: "u-complaint",
  text: "요즘 빌드가 너무 느려서 정말 힘드네요",
  force: "푸념",
};

const allSixForceUtterances = [
  constraintUtterance,
  preferenceUtterance,
  exampleUtterance,
  hypothesisUtterance,
  commitmentUtterance,
  complaintUtterance,
];

const nonBindingUtterances = [
  preferenceUtterance,
  exampleUtterance,
  hypothesisUtterance,
  complaintUtterance,
];

describe("ac-B4 clause 1 — utterance schema allows exactly the six force enum values", () => {
  test("each of the six force values parses, with the force value kept verbatim", () => {
    for (const utterance of allSixForceUtterances) {
      const result = utteranceRecordSchema.safeParse(utterance);

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("unreachable");
      expect(result.data.force).toBe(utterance.force);
    }
  });

  test("an utterance with no force field is refused — per-utterance tagging is required", () => {
    const untagged = {
      utterance_id: "u-untagged",
      text: "이건 태깅을 안 거친 발화입니다",
    };
    const result = utteranceRecordSchema.safeParse(untagged);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(
      result.error.issues.some((issue: { path: (string | number)[] }) =>
        issue.path.includes("force"),
      ),
    ).toBe(true);
  });

  test("force values outside the six-value enum are refused", () => {
    const outsideEnumForces = ["요구", "제약사항", "constraint", "PROMISE", "선호도", ""];

    for (const badForce of outsideEnumForces) {
      const result = utteranceRecordSchema.safeParse({
        utterance_id: "u-bad-force",
        text: "enum 밖 힘 값을 단 발화",
        force: badForce,
      });

      expect(result.success).toBe(false);
    }
  });
});

describe("ac-B4 clause 2 — non-binding force as AC grounding is rejected by the gate", () => {
  test("each of the four non-binding forces (선호, 예시, 가설, 푸념) is rejected as grounding", () => {
    for (const utterance of nonBindingUtterances) {
      const result = evaluateAcGroundingGate({
        ac_id: "ac-demo",
        grounding_utterances: [utterance],
      });

      expect(result.accepted).toBe(false);
      expect(result.rejected_utterance_ids).toContain(utterance.utterance_id);
    }
  });

  test("the force='선호' utterance 'X면 좋겠는데' cannot solidify as requirement grounding", () => {
    const result = evaluateAcGroundingGate({
      ac_id: "ac-demo",
      grounding_utterances: [preferenceUtterance],
    });

    expect(result.accepted).toBe(false);
    expect(result.rejected_utterance_ids).toContain("u-preference");
  });

  test("a binding companion does not launder the 선호 utterance — the grounding stays rejected", () => {
    const result = evaluateAcGroundingGate({
      ac_id: "ac-demo",
      grounding_utterances: [constraintUtterance, preferenceUtterance],
    });

    expect(result.accepted).toBe(false);
    // The rejection names exactly the non-binding utterance: the binding
    // 제약 utterance is not what disqualifies this grounding.
    expect(result.rejected_utterance_ids).toEqual(["u-preference"]);
  });
});

describe("ac-B4 clause 3 — all-binding grounding (제약·약속 each ≥ 1) is not rejected on this ground", () => {
  test("a grounding of one 제약 and one 약속 utterance passes the gate (2-state contrast)", () => {
    const result = evaluateAcGroundingGate({
      ac_id: "ac-demo",
      grounding_utterances: [constraintUtterance, commitmentUtterance],
    });

    expect(result.accepted).toBe(true);
    expect(result.rejected_utterance_ids).toEqual([]);
  });
});
