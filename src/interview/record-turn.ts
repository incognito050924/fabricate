import type { GoalState } from "./goal-state";

/**
 * Round-0 precedence gate on turn recording. A fired question may not be asked
 * before the goal state exists (principle 0 — the goal stands first), and once
 * it does exist the goal must have been derived strictly earlier than the
 * question was asked. Both refusals are fail-closed and carry distinct reasons,
 * so "no goal yet" is never mistaken for "asked out of order". Non-fired turns
 * (user replies) are recordable at any time — the gate targets fired questions.
 */

export interface FiredQuestionTurn {
  kind: "fired_question";
  question_text: string;
  asked_at: string;
}

export interface UserReplyTurn {
  kind: "user_reply";
  content: string;
  at: string;
}

export type Turn = FiredQuestionTurn | UserReplyTurn;

export interface TurnState {
  goal_state: GoalState | null;
  turns: Turn[];
}

export type RecordTurnResult =
  | { accepted: true; state: TurnState }
  | { accepted: false; reason: string };

const ABSENT_GOAL_STATE =
  "goal_state가 부재한 상태에서는 fired 질문 턴을 기록할 수 없다 — 라운드 0 선행 게이트(fail-closed)";

const OUT_OF_ORDER =
  "goal_state.derived_at는 fired 질문의 asked_at보다 엄격히 앞서야 한다 — 목표보다 먼저 던져진 질문은 거부된다";

/** Pure: returns a new state on acceptance and never mutates the input. */
export function recordTurn(state: TurnState, turn: Turn): RecordTurnResult {
  if (turn.kind === "fired_question") {
    if (state.goal_state === null) {
      return { accepted: false, reason: ABSENT_GOAL_STATE };
    }
    if (!(state.goal_state.derived_at < turn.asked_at)) {
      return { accepted: false, reason: OUT_OF_ORDER };
    }
  }
  return { accepted: true, state: { ...state, turns: [...state.turns, turn] } };
}
