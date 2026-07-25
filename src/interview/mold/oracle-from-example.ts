import { type MoldLeaf, completeExamplesOf } from "./example-record";

/**
 * The oracle is generated FROM the examples, and carries refs back to them.
 *
 * That reference is what blocks consensus↔verification drift. An oracle written
 * beside the examples starts as a restatement of them and slowly becomes a
 * second, unagreed standard — and since it is the one the machine actually
 * checks, the drift is invisible until something the user approved fails.
 *
 * So an oracle with no example ref does not attach, and an oracle naming an
 * example this leaf does not own does not attach either: a ref that points
 * elsewhere is a ref to a case nobody agreed for THIS leaf.
 */

export type GeneratedOracle = {
  leaf_ref: string;
  example_refs: string[];
  statement: string;
};

export function generateOracleFromExamples(leaf: MoldLeaf): GeneratedOracle {
  const examples = completeExamplesOf(leaf);
  return {
    leaf_ref: leaf.id,
    example_refs: examples.map((example) => example.id),
    statement: leaf.statement,
  };
}

export type OracleAttachment = {
  attached: boolean;
  rejection?: {
    kind: "missing_example_ref" | "unknown_example_ref" | "leaf_ref_mismatch";
    reason: string;
  };
};

export function attachOracleToLeaf(
  leaf: MoldLeaf,
  oracle: { leaf_ref?: string; example_refs?: unknown },
): OracleAttachment {
  const refs = Array.isArray(oracle.example_refs) ? (oracle.example_refs as string[]) : [];
  if (refs.length === 0) {
    return {
      attached: false,
      rejection: {
        kind: "missing_example_ref",
        reason: "예시 참조 없는 oracle은 붙이지 않는다 — 검증이 합의에서 떨어져 나간다",
      },
    };
  }

  if (oracle.leaf_ref !== leaf.id) {
    return {
      attached: false,
      rejection: {
        kind: "leaf_ref_mismatch",
        reason: `다른 잎을 가리키는 oracle이다: ${String(oracle.leaf_ref)}`,
      },
    };
  }

  const ownExampleIds = new Set(completeExamplesOf(leaf).map((example) => example.id));
  const foreign = refs.filter((ref) => !ownExampleIds.has(ref));
  if (foreign.length > 0) {
    return {
      attached: false,
      rejection: {
        kind: "unknown_example_ref",
        reason: `이 잎이 갖고 있지 않은 예시 참조: ${foreign.join(", ")}`,
      },
    };
  }

  return { attached: true };
}
