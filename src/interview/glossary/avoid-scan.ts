import type { GlossaryEntry } from "./entry";

/**
 * Deterministic grep of a surface text against every entry's avoid list. This
 * is what makes a terminology agreement enforceable instead of aspirational: a
 * rejected wording that reappears is reported with pointers to the entry and
 * the exact term, so the violation can be traced back to the agreement it
 * breaks. Detection is substring-based and order-stable — identical input
 * always yields an identical report.
 */

export interface AvoidViolation {
  concept: string;
  term: string;
}

export function scanAvoidViolations(glossary: GlossaryEntry[], text: string): AvoidViolation[] {
  const violations: AvoidViolation[] = [];
  for (const entry of glossary) {
    for (const term of entry.avoid) {
      if (text.includes(term)) {
        violations.push({ concept: entry.concept, term });
      }
    }
  }
  return violations;
}
