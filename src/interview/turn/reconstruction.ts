/**
 * U1 request reconstruction on a turn. For a non-simple request the agent must
 * state, in one line, the situation or problem the request answers — reading
 * the request back at the level of what it is FOR, before any question is
 * asked. Firing is driven by the complexity tag alone, so supplying a line for
 * a simple request does not smuggle the step in, and a non-simple request
 * without a line is refused rather than recorded as if the step happened.
 *
 * Whether a request truly is non-simple, and whether the line captures the
 * right problem, are human judgments and stay residual — this records only
 * that the step fired and carries a non-empty line.
 */

export type ComplexityTag = "simple" | "non_simple";

export interface ReconstructionInput {
  request_text: string;
  complexity_tag: ComplexityTag;
  situation_problem_line?: string;
}

export interface ReconstructionRecord {
  request_text: string;
  u1_fired: boolean;
  situation_problem_line?: string;
}

export type ReconstructionResult =
  | { accepted: true; record: ReconstructionRecord }
  | { accepted: false; reason: "missing_reconstruction_line" };

export function recordTurnReconstruction(input: ReconstructionInput): ReconstructionResult {
  if (input.complexity_tag !== "non_simple") {
    return { accepted: true, record: { request_text: input.request_text, u1_fired: false } };
  }

  // '비어있지 않게' is a whitespace-blind floor, as it is for the teachback
  // restatement (turn/teachback.ts): a line of spaces is not a reconstruction.
  // The recorded value stays verbatim — the floor decides admission, it does
  // not rewrite what the turn said.
  const line = input.situation_problem_line;
  if (line === undefined || line.trim().length === 0) {
    return { accepted: false, reason: "missing_reconstruction_line" };
  }

  return {
    accepted: true,
    record: { request_text: input.request_text, u1_fired: true, situation_problem_line: line },
  };
}
