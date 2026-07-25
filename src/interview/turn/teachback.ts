/**
 * U5 teach-back on a plan-presentation turn. Understanding is only shown by
 * saying the same thing in DIFFERENT words and grounding it in at least one
 * concrete instance; repeating the original proves the words were copied, and
 * an abstract agreement with no example is where two readings quietly diverge.
 *
 * The floor enforced here is mechanical: a non-empty restatement that is not a
 * literal echo, plus a countable list of at least one non-blank example. Each
 * violation throws with its own reason code so failures stay distinguishable.
 * Whether the restatement is a genuine paraphrase remains human judgment.
 */

export type TeachbackViolation =
  | "empty_restatement"
  | "echo_restatement"
  | "examples_not_enumerable"
  | "no_concrete_example"
  | "blank_example";

export class TeachbackViolationError extends Error {
  readonly violation: TeachbackViolation;

  constructor(violation: TeachbackViolation, detail: string) {
    super(`${violation}: ${detail}`);
    this.name = "TeachbackViolationError";
    this.violation = violation;
  }
}

export interface TeachbackTurnInput {
  turn_id: string;
  turn_tag: string;
  original: string;
  restatement?: string;
  examples?: unknown;
}

export interface TeachbackRecord {
  restatement: string;
  examples: string[];
}

export interface TeachbackTurn {
  turn_id: string;
  original: string;
  teachback_fired: boolean;
  teachback?: TeachbackRecord;
}

const TEACHBACK_TAG = "plan-presentation";

export function recordTeachbackTurn(input: TeachbackTurnInput): TeachbackTurn {
  if (input.turn_tag !== TEACHBACK_TAG) {
    return { turn_id: input.turn_id, original: input.original, teachback_fired: false };
  }

  const restatement = input.restatement;
  if (restatement === undefined || restatement.trim().length === 0) {
    throw new TeachbackViolationError("empty_restatement", "되말하기가 비어 있다");
  }
  if (restatement.trim() === input.original.trim()) {
    throw new TeachbackViolationError("echo_restatement", "원문을 그대로 되풀이한 에코다");
  }

  const examples = input.examples;
  if (!Array.isArray(examples)) {
    throw new TeachbackViolationError(
      "examples_not_enumerable",
      "구체 사례는 셀 수 있는 배열이어야 한다",
    );
  }
  if (examples.length === 0) {
    throw new TeachbackViolationError("no_concrete_example", "구체 사례가 최소 1개 있어야 한다");
  }
  const blank = examples.findIndex(
    (example) => typeof example !== "string" || example.trim().length === 0,
  );
  if (blank >= 0) {
    throw new TeachbackViolationError("blank_example", `비어 있는 사례가 있다 (index ${blank})`);
  }

  return {
    turn_id: input.turn_id,
    original: input.original,
    teachback_fired: true,
    teachback: { restatement, examples: examples as string[] },
  };
}
