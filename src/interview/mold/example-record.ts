import { z } from "zod";

/**
 * The example floor. A hard leaf — one a machine is supposed to judge — cannot
 * lock without at least one user-verdict example. A statement everyone nodded
 * at means whatever each reader filled in; an example the user ruled on fixes
 * one concrete case, and one fixed case is worth more agreement than a
 * paragraph of assent.
 *
 * All four fields are required together. An example with no expected outcome
 * says what happened but not what should; one with no verdict records the
 * machine's guess about the user's judgment rather than the judgment.
 *
 * Whether the example represents the leaf well is the user's call, not the
 * schema's.
 */

export const exampleRecordSchema = z
  .object({
    id: z.string().min(1),
    input: z.string().min(1),
    expected: z.string().min(1),
    /** The user's ruling on this case. */
    verdict: z.string().min(1),
    at: z.string().datetime(),
  })
  .strict();
export type ExampleRecord = z.infer<typeof exampleRecordSchema>;

export type MoldLeaf = {
  id: string;
  statement: string;
  type?: string;
  examples?: unknown[];
  sufficiency_judge?: string;
  evidence_required?: string[];
};

export type LeafLockResult = {
  locked: boolean;
  rejection?: { kind: "example_floor" | "untyped_leaf"; reason: string };
};

/** The examples of this leaf that actually parse as complete records. */
export function completeExamplesOf(leaf: MoldLeaf): ExampleRecord[] {
  const parsed = (leaf.examples ?? []).map((example) => exampleRecordSchema.safeParse(example));
  return parsed.flatMap((result) => (result.success ? [result.data] : []));
}

export function gateLeafLock(leaf: MoldLeaf): LeafLockResult {
  if (leaf.type === "soft") {
    return { locked: true };
  }
  if (leaf.type !== "hard") {
    return {
      locked: false,
      rejection: { kind: "untyped_leaf", reason: "타입 없는 잎은 잠그지 않는다" },
    };
  }

  // evidence_required does not waive this — it names how a claim would be
  // evidenced, which is a different question from what the leaf means.
  if (completeExamplesOf(leaf).length === 0) {
    return {
      locked: false,
      rejection: {
        kind: "example_floor",
        reason: "hard 잎에 사용자-판정 예시가 없다 — 합의된 것이 무엇인지 고정되지 않았다",
      },
    };
  }

  return { locked: true };
}
