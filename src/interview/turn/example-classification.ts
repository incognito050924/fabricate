import { GLOSSARY_LANDING_PATH } from "../glossary/landing";

/**
 * U8 term clarification by example classification. Asking a user to DEFINE a
 * blurry term invites an abstract answer that both sides read differently;
 * asking them to judge concrete cases as inside or outside the term produces a
 * boundary that can actually be checked later. So a term-blur turn emits
 * classified examples, not a definition question.
 *
 * The resulting term record lands in the product glossary — never in personal
 * memory, which would make the agreement invisible to the next session.
 * Whether a term is genuinely blurry is human judgment; the tag fixes it.
 */

export type BlurTag = "term-blur" | "none";
export type ExampleClassification = "양성" | "음성";

export interface ClassifiedExample {
  example: string;
  classification: ExampleClassification;
}

export interface ExampleClassificationTurnInput {
  turn_id: string;
  blur_tag: BlurTag;
  term: string;
  examples: ClassifiedExample[];
}

export interface Clarification {
  kind: "example-classification";
  examples: ClassifiedExample[];
}

export interface TermRecord {
  term: string;
  /** Product artifacts this agreement was written to. */
  written_to: string[];
}

export interface ExampleClassificationTurn {
  turn_id: string;
  clarification_fired: boolean;
  clarification?: Clarification;
  term_record?: TermRecord;
}

export function recordExampleClassificationTurn(
  input: ExampleClassificationTurnInput,
): ExampleClassificationTurn {
  if (input.blur_tag !== "term-blur") {
    return { turn_id: input.turn_id, clarification_fired: false };
  }
  return {
    turn_id: input.turn_id,
    clarification_fired: true,
    clarification: { kind: "example-classification", examples: input.examples },
    term_record: { term: input.term, written_to: [GLOSSARY_LANDING_PATH] },
  };
}
