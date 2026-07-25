import type { GlossaryEntry } from "./entry";

/**
 * Renders a concept onto the user-facing surface by CONSUMING the glossary
 * anchor rather than translating the concept itself. The distinction matters:
 * a built-in translation would keep producing its own wording after the user
 * and the agent agreed on a different one, quietly overriding the agreement.
 * Re-anchoring the entry therefore changes the output, and nothing else does.
 */

export class UnanchoredConceptError extends Error {
  constructor(concept: string) {
    super(`용어집에 앵커가 없는 개념은 표면에 렌더할 수 없다: ${concept}`);
    this.name = "UnanchoredConceptError";
  }
}

export function renderConceptSurface(glossary: GlossaryEntry[], concept: string): string {
  const entry = glossary.find((candidate) => candidate.concept === concept);
  if (entry === undefined) {
    throw new UnanchoredConceptError(concept);
  }
  return entry.korean;
}
