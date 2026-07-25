import { z } from "zod";
import type { Oracle, VerificationMethod } from "../intent/criterion";

/**
 * Gate ③ — evidence matching: binding first, kind second. Every piece of
 * evidence is bound to exactly one criterion (criterion_id is mandatory), so
 * one green test cannot be reused to close 69 criteria. Among the evidence
 * bound to THIS criterion, only the class its verification method demands
 * satisfies: run → test/command, rescan → file, human → observation/repro.
 * Fail-closed: zero evidence, foreign-bound evidence, or bound evidence of
 * only foreign kinds always blocks.
 */

export const evidenceKind = z.enum(["test", "command", "file", "observation", "repro"]);
export type EvidenceKind = z.infer<typeof evidenceKind>;

export const evidence = z
  .object({
    /** The one criterion this evidence testifies for — unbound evidence is refused. */
    criterion_id: z.string().min(1),
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

export function matchEvidence(
  oracle: Pick<Oracle, "criterion_id" | "method">,
  offered: Evidence[],
): GateResult {
  if (offered.length === 0) {
    return {
      decision: "block",
      reason: `증거가 없다 — ${oracle.method} 판정은 증거 없이 통과할 수 없다`,
    };
  }

  const bound = offered.filter((e) => e.criterion_id === oracle.criterion_id);
  if (bound.length === 0) {
    return {
      decision: "block",
      reason: `조건 ${oracle.criterion_id}에 결속된 증거가 없다 — 다른 조건의 증거 ${offered.length}건으로는 이 조건을 닫을 수 없다`,
    };
  }

  const accepted = ACCEPTED_KINDS[oracle.method];
  const match = bound.find((e) => accepted.includes(e.kind));
  if (match === undefined) {
    return {
      decision: "block",
      reason: `증거 종류 불일치 — ${oracle.method} 판정은 ${accepted.join("·")} 증거만 받는다 (조건 ${oracle.criterion_id}에 제출됨: ${bound.map((e) => e.kind).join(", ")})`,
    };
  }

  return {
    decision: "pass",
    reason: `조건 ${oracle.criterion_id}의 ${oracle.method} 판정을 ${match.kind} 증거가 충족 (${match.ref}): ${match.summary}`,
  };
}
