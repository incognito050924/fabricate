/**
 * The agreed vocabulary for the user-facing interview surface, and the single
 * place the avoid list is written down.
 *
 * It is written as a glossary rather than as a bare array of banned words
 * because a banned word with no anchor is unarguable: nobody can tell what to
 * say instead, and the list drifts into superstition. Each entry names the
 * concept, the wording that was agreed for it, an example on each side, and the
 * wordings that were rejected — so a gate that greps the rejected wordings can
 * point back at what should have been used.
 *
 * Consumers DERIVE their term list from here (`glossaryAvoidTerms`). A module
 * that retypes the terms owns a second list, and two lists that must agree are
 * one list plus a bug.
 */

import type { GlossaryEntry } from "./entry";

export const INTERVIEW_GLOSSARY: readonly GlossaryEntry[] = [
  {
    concept: "interview session",
    korean: "인터뷰",
    positive_examples: ["인터뷰를 시작합니다"],
    negative_examples: ["여정을 시작합니다"],
    // "journey" rendered literally — a product metaphor, not what is happening.
    avoid: ["여정"],
  },
  {
    concept: "addressing the user",
    korean: "높임 종결어미",
    positive_examples: ["한 문장으로 알려주세요"],
    negative_examples: ["당신은 무엇을 원하십니까", "귀하의 의견을 알려주십시오"],
    // Korean addresses by ending, not by pronoun; "you" carried over reads translated.
    avoid: ["당신", "귀하"],
  },
  {
    concept: "friction-free progress",
    korean: "막힘 없이",
    positive_examples: ["막힘 없이 이어집니다"],
    negative_examples: ["원활한 경험을 제공합니다"],
    avoid: ["원활한"],
  },
];

/**
 * The avoid terms of a glossary, deduplicated, in first-seen order. Order is
 * stable so a gate report built from it is comparable run to run.
 */
export function glossaryAvoidTerms(glossary: readonly GlossaryEntry[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const entry of glossary) {
    for (const term of entry.avoid) {
      if (!seen.has(term)) {
        seen.add(term);
        terms.push(term);
      }
    }
  }
  return terms;
}
