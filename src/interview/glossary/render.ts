import { scanAvoidViolations } from "./avoid-scan";
import { assertGlossaryConsistent } from "./consistency";
import type { GlossaryEntry } from "./entry";

/**
 * Renders a concept onto the user-facing surface by CONSUMING the glossary
 * anchor rather than translating the concept itself. The distinction matters:
 * a built-in translation would keep producing its own wording after the user
 * and the agent agreed on a different one, quietly overriding the agreement.
 * Re-anchoring the entry therefore changes the output, and nothing else does.
 *
 * Two refusals stand in front of the return. The glossary must be coherent as a
 * set — rendering out of a glossary holding two entries on one concept would
 * pick a winner by array order — and the surface about to be emitted is greped
 * against that entry's own avoid list, so a rejected wording cannot leave
 * through the very path that exists to honour the agreement.
 */

export class UnanchoredConceptError extends Error {
  constructor(concept: string) {
    super(`용어집에 앵커가 없는 개념은 표면에 렌더할 수 없다: ${concept}`);
    this.name = "UnanchoredConceptError";
  }
}

export class AvoidViolationInSurfaceError extends Error {
  constructor(readonly violations: readonly { concept: string; term: string }[]) {
    super(`표면 출력에 avoid 용어가 있다: ${violations.map((v) => v.term).join(", ")}`);
    this.name = "AvoidViolationInSurfaceError";
  }
}

export function renderConceptSurface(glossary: GlossaryEntry[], concept: string): string {
  assertGlossaryConsistent(glossary);

  const entry = glossary.find((candidate) => candidate.concept === concept);
  if (entry === undefined) {
    throw new UnanchoredConceptError(concept);
  }

  // Scoped to THIS entry's avoid list — the oracle says "그 항목의 avoid 목록".
  // Cross-entry leakage is a different fault, and consistency.ts owns it.
  const violations = scanAvoidViolations([entry], entry.korean);
  if (violations.length > 0) {
    throw new AvoidViolationInSurfaceError(violations);
  }
  return entry.korean;
}
