/**
 * Whether a glossary can be trusted as a whole, not entry by entry. A single
 * entry parses on its own, but a set of them can still be incoherent: two
 * entries claiming the same concept make lookup pick a winner nobody chose, and
 * an anchor that another entry already rejected means the agreement contradicts
 * itself — every surface built from it would be a violation on arrival.
 *
 * Only the anchor is scanned, and only against OTHER entries' avoid lists. The
 * examples are exempt on purpose — a negative example's job is to SHOW the
 * rejected wording, so scanning them would refuse the entries that document
 * best. And an anchor hitting its own list is caught where the surface is
 * actually emitted (render.ts), so neither guard is a copy of the other.
 */

import { scanAvoidViolations } from "./avoid-scan";
import { type GlossaryEntry, glossaryEntrySchema } from "./entry";

export type GlossaryProblem =
  | { kind: "not_an_entry"; index: number }
  | { kind: "duplicate_concept"; concept: string }
  | {
      kind: "anchor_hits_avoid";
      concept: string;
      /** The entry whose avoid list the anchor lands on — possibly the same one. */
      conflicting_concept: string;
      term: string;
    };

export type GlossaryConsistencyReport = {
  ok: boolean;
  problems: GlossaryProblem[];
};

export class InconsistentGlossaryError extends Error {
  constructor(readonly problems: GlossaryProblem[]) {
    super(`용어집이 정합하지 않다: ${JSON.stringify(problems)}`);
    this.name = "InconsistentGlossaryError";
  }
}

export function checkGlossaryConsistency(
  candidates: readonly unknown[],
): GlossaryConsistencyReport {
  const problems: GlossaryProblem[] = [];
  const entries: GlossaryEntry[] = [];

  candidates.forEach((candidate, index) => {
    const parsed = glossaryEntrySchema.safeParse(candidate);
    if (parsed.success) {
      entries.push(parsed.data);
    } else {
      problems.push({ kind: "not_an_entry", index });
    }
  });

  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.concept)) {
      problems.push({ kind: "duplicate_concept", concept: entry.concept });
    }
    seen.add(entry.concept);

    const others = entries.filter((candidate) => candidate !== entry);
    for (const violation of scanAvoidViolations(others, entry.korean)) {
      problems.push({
        kind: "anchor_hits_avoid",
        concept: entry.concept,
        conflicting_concept: violation.concept,
        term: violation.term,
      });
    }
  }

  return { ok: problems.length === 0, problems };
}

export function assertGlossaryConsistent(candidates: readonly unknown[]): void {
  const report = checkGlossaryConsistency(candidates);
  if (!report.ok) {
    throw new InconsistentGlossaryError(report.problems);
  }
}
