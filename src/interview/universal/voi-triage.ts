/**
 * U4 — ask-vs-assume triage (Howard's value of information). Three branches,
 * and the surface has to carry all three: a directive that only says "ask when
 * it matters" leaves the other two branches to improvisation, so the
 * completeness check is all-or-nothing.
 *
 * Routing here reads the tag the model emitted and nothing else. Which item is
 * non-critical, low-risk, or high-risk·irreversible is a judgment this module
 * does not make and cannot check — what it can enforce is that the tag leads
 * where the directive says it leads, and that the assume branch never gets to
 * assume quietly.
 */

import type { RecordedAssumption, VisibleLogRecord } from "./assumption-visible-log";

/** Byte-exact cues; the wording is the contract (see charter/directives.ts U4). */
export const RECORD_CUE = "비중대 기록";
export const ASSUME_CUE = "저위험 가정+가시로그";
export const ASK_CUE = "고위험·비가역 질문";
export const VISIBLE_LOG_MANDATE = "가정은 반드시 보이게 로그";

const BRANCH_CUES: readonly string[] = [RECORD_CUE, ASSUME_CUE, ASK_CUE];

export type TriageCueResult = {
  ok: boolean;
  missing: string[];
};

/** '전부 존재': one missing branch fails the whole check. */
export function checkTriageCues(text: string): TriageCueResult {
  const missing = BRANCH_CUES.filter((cue) => !text.includes(cue));
  return { ok: missing.length === 0, missing };
}

export type VoiTag = "non-critical" | "low-risk" | "high-risk-irreversible";

export type TurnRecord = {
  turn_id: string;
  content: string;
};

export type EmittedQuestion = {
  turn_id: string;
  question: string;
};

export type TriagedTurn = {
  turn_id: string;
  content: string;
  voi_tag: string;
};

export type TriageRouting = {
  records: TurnRecord[];
  questions: EmittedQuestion[];
  assumptions: Array<RecordedAssumption & { turn_id: string }>;
  visible_log: VisibleLogRecord[];
};

export class UnknownVoiTagError extends Error {
  constructor(tag: string) {
    super(`알 수 없는 VoI 태그: ${tag} — 삼분류 밖의 태그는 라우팅하지 않는다`);
    this.name = "UnknownVoiTagError";
  }
}

export function routeTriagedTurn(turn: TriagedTurn): TriageRouting {
  const record: TurnRecord = { turn_id: turn.turn_id, content: turn.content };
  const routing: TriageRouting = {
    records: [record],
    questions: [],
    assumptions: [],
    visible_log: [],
  };

  switch (turn.voi_tag) {
    case "non-critical":
      // 결정을 바꾸지 않는 산출물은 기록으로 끝난다 — 승격도, 가정도 없다.
      return routing;

    case "low-risk": {
      // The assumption is tied to the turn that produced it, so two turns can
      // never collapse into one assumption sharing one log reference.
      const assumption = {
        id: `asm-${turn.turn_id}`,
        turn_id: turn.turn_id,
        statement: `${turn.content} — 저위험으로 보아 묻지 않고 이대로 가정하고 진행한다`,
      };
      routing.assumptions.push(assumption);
      routing.visible_log.push({
        assumption_id: assumption.id,
        entry: `가정: ${assumption.statement}`,
      });
      return routing;
    }

    case "high-risk-irreversible":
      // 되돌릴 수 없는 갈림길은 묻는다 — 그래서 이 가지는 아무것도 가정하지 않는다.
      routing.questions.push({
        turn_id: turn.turn_id,
        question: `${turn.content} — 되돌릴 수 없는 결정이다. 이대로 진행할까?`,
      });
      return routing;

    default:
      throw new UnknownVoiTagError(turn.voi_tag);
  }
}
