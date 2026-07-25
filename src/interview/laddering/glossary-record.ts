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

import type { GlossaryEntry } from "../glossary/entry";
import { type BipolarPair, assessBipolarPair } from "./bipolar-pair";

export class IncompleteBipolarPairError extends Error {
  constructor(missingFields: string[]) {
    super(`미완성 양극 쌍은 glossary에 기록할 수 없다 — 빠진 필드: ${missingFields.join(", ")}`);
    this.name = "IncompleteBipolarPairError";
  }
}

export function recordBipolarPairToGlossary(pair: BipolarPair): GlossaryEntry {
  const assessment = assessBipolarPair(pair);
  if (!assessment.complete) {
    throw new IncompleteBipolarPairError(assessment.missing_fields);
  }

  const grouped = pair.grouped_pole as string;
  const opposite = pair.opposite_pole as string;

  return {
    concept: pair.dimension,
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

  const recorded = glossary.some((entry) => {
    const texts = textsOf(entry);
    return (
      texts.some((text) => text.includes(grouped)) && texts.some((text) => text.includes(opposite))
    );
  });

  return recorded
    ? { verdict: "pass" }
    : { verdict: "fail", reason: "채록한 두 극을 담은 glossary 항목이 없다" };
}
