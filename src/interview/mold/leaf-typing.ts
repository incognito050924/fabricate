import { type MoldLeaf, completeExamplesOf } from "./example-record";

/**
 * Hard or soft, declared on every leaf. Hard leaves are machine-judged; soft
 * leaves are the ones only the user can call satisfied ("the refusal message
 * should feel considerate"), and they carry sufficiency_judge='user' to say so.
 *
 * A soft leaf may not be promoted into a machine-judged acceptance criterion.
 * The promotion does not make the machine able to judge it — it makes a
 * mechanical proxy pass while the thing the user actually cared about goes
 * unchecked, and the green result then argues against reopening it. That is the
 * fake AC this gate refuses.
 *
 * Which leaves are truly hard is a human judgment; the gate enforces that the
 * declaration exists and that soft leaves keep their judge.
 */

export type TypingResult = {
  approved: boolean;
  reason?: string;
};

export function gateLeafTyping(leaf: MoldLeaf): TypingResult {
  if (leaf.type !== "hard" && leaf.type !== "soft") {
    return { approved: false, reason: "잎에 hard/soft 타이핑이 없다" };
  }
  if (leaf.type === "soft" && leaf.sufficiency_judge !== "user") {
    return { approved: false, reason: "soft 잎의 충분성 판정자는 사용자여야 한다" };
  }
  return { approved: true };
}

export type PromotionResult = {
  promoted: boolean;
  rejection?: { kind: "fake_ac" | "untyped_leaf" | "example_floor"; reason: string };
};

export function promoteLeafToMachineAc(leaf: MoldLeaf): PromotionResult {
  if (leaf.type === "soft") {
    return {
      promoted: false,
      rejection: {
        kind: "fake_ac",
        reason: "soft 잎을 기계-판정 AC로 승격할 수 없다 — 기계가 대신 볼 수 있는 것이 아니다",
      },
    };
  }
  if (leaf.type !== "hard") {
    return {
      promoted: false,
      rejection: { kind: "untyped_leaf", reason: "타입 없는 잎은 승격하지 않는다" },
    };
  }
  if (completeExamplesOf(leaf).length === 0) {
    return {
      promoted: false,
      rejection: { kind: "example_floor", reason: "예시 없는 hard 잎은 승격하지 않는다" },
    };
  }
  return { promoted: true };
}
