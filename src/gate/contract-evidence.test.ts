import { describe, expect, test } from "bun:test";
import { CONTRACT_EVIDENCE_KIND, evidenceKind } from "./evidence";

/**
 * Pins decision 0001 (decisions/0001-contract-evidence-mapping.md) against the
 * founding contract itself: every evidence vocabulary word criteria.json uses
 * must have a fixed gate-kind translation. A new word appearing in the
 * contract breaks this test and forces an explicit mapping (and a revision of
 * the decision record) — never an ad-hoc choice at oracle-authoring time.
 */

const contract = (await Bun.file(
  new URL("../../contract/criteria.json", import.meta.url),
).json()) as {
  count: number;
  criteria: Array<{ id: string; evidence_required: string[] }>;
};

describe("decision 0001 — contract evidence vocabulary is fully mapped", () => {
  test("the contract still holds 69 criteria", () => {
    expect(contract.count).toBe(69);
    expect(contract.criteria.length).toBe(69);
  });

  test("every evidence_required word in the contract has a mapping", () => {
    const used = new Set(contract.criteria.flatMap((c) => c.evidence_required));
    const unmapped = [...used].filter((word) => !(word in CONTRACT_EVIDENCE_KIND));
    expect(unmapped).toEqual([]);
  });

  test("every mapped target is a valid gate evidence kind", () => {
    for (const target of Object.values(CONTRACT_EVIDENCE_KIND)) {
      expect(evidenceKind.safeParse(target).success).toBe(true);
    }
  });

  test("the decided translations hold: test→test, doc→file, log→file", () => {
    expect(CONTRACT_EVIDENCE_KIND).toEqual({ test: "test", doc: "file", log: "file" });
  });
});
