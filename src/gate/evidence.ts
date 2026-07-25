import { z } from "zod";
import type { VerificationMethod } from "../intent/criterion";

/**
 * Gate ③ — evidence-kind matching. An oracle is satisfiable only by evidence
 * of the class its verification method demands: run → test/command, rescan →
 * file, human → observation/repro. Fail-closed: zero evidence, or evidence of
 * only foreign kinds, always blocks — a green test can never close a rescan
 * oracle, and an artifact can never close a run oracle.
 */

export const evidenceKind = z.enum(["test", "command", "file", "observation", "repro"]);
export type EvidenceKind = z.infer<typeof evidenceKind>;

export const evidence = z
  .object({
    kind: evidenceKind,
    /** A pointer (path / command line / hash) — never inline content. */
    ref: z.string().min(1),
    summary: z.string().min(1),
  })
  .strict();
export type Evidence = z.infer<typeof evidence>;

export interface GateResult {
  decision: "pass" | "block";
  reason: string;
}

const ACCEPTED_KINDS: Record<VerificationMethod, readonly EvidenceKind[]> = {
  run: ["test", "command"],
  rescan: ["file"],
  human: ["observation", "repro"],
};

export function matchEvidence(method: VerificationMethod, offered: Evidence[]): GateResult {
  const accepted = ACCEPTED_KINDS[method];
  const match = offered.find((e) => accepted.includes(e.kind));
  if (match === undefined) {
    return {
      decision: "block",
      reason:
        offered.length === 0
          ? `증거가 없다 — ${method} 판정은 증거 없이 통과할 수 없다`
          : `증거 종류 불일치 — ${method} 판정은 ${accepted.join("·")} 증거만 받는다 (제출됨: ${offered.map((e) => e.kind).join(", ")})`,
    };
  }
  return {
    decision: "pass",
    reason: `${method} 판정을 ${match.kind} 증거가 충족 (${match.ref}): ${match.summary}`,
  };
}
