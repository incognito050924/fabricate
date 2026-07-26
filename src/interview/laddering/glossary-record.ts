/**
 * Landing a captured construct in the agreed vocabulary. A bipolar pair that
 * stays inside the laddering module is a note; recorded as a glossary entry it
 * becomes something later surfaces can be checked against.
 *
 * The entry is a real ac-21 entry, not the pair under another name — the two
 * poles become the positive and negative examples, which is exactly the shape
 * the glossary already demands (what the term covers, and what it does not).
 * Both poles are carried verbatim, in the user's own words, because a reworded
 * pole is a different construct.
 *
 * The record check matches on the poles, never on the dimension: two constructs
 * can live on one dimension, and a dimension-only match would accept a decoy
 * that agreed about nothing.
 */

import { type GlossaryEntry, glossaryEntrySchema } from "../glossary/entry";
import { type BipolarPair, assessBipolarPair } from "./bipolar-pair";

export class IncompleteBipolarPairError extends Error {
  constructor(missingFields: string[]) {
    super(`미완성 양극 쌍은 glossary에 기록할 수 없다 — 빠진 필드: ${missingFields.join(", ")}`);
    this.name = "IncompleteBipolarPairError";
  }
}

/**
 * The concept key of a recorded construct. A dimension can hold several
 * constructs — "feedback tone" is warm/cold AND terse/expansive — so keying the
 * entry on the dimension alone makes the second construct overwrite the first
 * in every lookup. The grouped pole is what distinguishes them.
 *
 * Both halves are verbatim user text, so the separator can occur inside them:
 * ("tone", "warm — plain") and ("tone — warm", "plain") would otherwise mint one
 * key for two different constructs, and the record check — whose whole job is
 * detecting ABSENCE — would answer "recorded" about a construct nobody
 * recorded. Doubling the separator inside each half removes the ambiguity
 * without refusing anything the user actually said.
 */
const SEPARATOR = "—";

const escapeSeparator = (text: string): string => text.replaceAll(SEPARATOR, SEPARATOR + SEPARATOR);

export const conceptOf = (dimension: string, grouped_pole: string): string =>
  `${escapeSeparator(dimension)} ${SEPARATOR} ${escapeSeparator(grouped_pole)}`;

export function recordBipolarPairToGlossary(pair: BipolarPair): GlossaryEntry {
  const assessment = assessBipolarPair(pair);
  if (!assessment.complete) {
    throw new IncompleteBipolarPairError(assessment.missing_fields);
  }

  const grouped = pair.grouped_pole as string;
  const opposite = pair.opposite_pole as string;

  return {
    concept: conceptOf(pair.dimension, grouped),
    korean: grouped,
    positive_examples: [grouped],
    negative_examples: [opposite],
    avoid: [],
  };
}

function textsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textsOf);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(textsOf);
  }
  return [];
}

export type GlossaryRecordCheck = {
  verdict: "pass" | "fail";
  reason?: string;
};

export function checkBipolarGlossaryRecord(
  pair: BipolarPair,
  glossary: readonly unknown[],
): GlossaryRecordCheck {
  const assessment = assessBipolarPair(pair);
  if (!assessment.complete) {
    return { verdict: "fail", reason: "미완성 쌍 — 기록 대상이 아니다" };
  }

  const grouped = pair.grouped_pole as string;
  const opposite = pair.opposite_pole as string;

  // Entry-hood first: "glossary 항목으로 기록되어" means an entry that satisfies
  // the ac-21 schema, not any object that happens to contain the two strings.
  const recorded = glossary.some((candidate) => {
    const parsed = glossaryEntrySchema.safeParse(candidate);
    if (!parsed.success) return false;

    const entry = parsed.data;
    if (entry.concept !== conceptOf(pair.dimension, grouped)) return false;

    // The poles keep their sides: the grouped pole is what the term covers, the
    // opposite is what it does not. Swapped, the entry says the reverse.
    return (
      textsOf(entry.positive_examples).some((text) => text.includes(grouped)) &&
      textsOf(entry.negative_examples).some((text) => text.includes(opposite))
    );
  });

  return recorded
    ? { verdict: "pass" }
    : {
        verdict: "fail",
        reason:
          "채록한 두 극을 담은 glossary 항목이 없다 — 항목성(다섯 필드)·개념 키·극의 자리 중 하나가 어긋난다",
      };
}
