import type { GroundingCitation } from "./grounding-citation";

/**
 * Which source decides. The glossary and the code drift apart, and when they
 * do, the code is what actually runs — so a challenge earns its force by citing
 * the current code, not the agreed wording that may describe last quarter's
 * behavior.
 *
 * "Current" is checked, not claimed. An excerpt that no longer appears in the
 * code content is a quotation of a past version, and a challenge built on it
 * argues against something that is no longer there.
 */

export type CodeSource = {
  path: string;
  content: string;
};

export function citationHasCurrentCodeAuthority(
  citation: GroundingCitation,
  currentCode: CodeSource,
): boolean {
  if (citation.authority !== "code") return false;
  if (citation.source_ref !== currentCode.path) return false;
  return currentCode.content.includes(citation.excerpt);
}
