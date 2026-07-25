/**
 * ac-10j acceptance — skopos double gate: form_check ∧ effect_check verdicts
 * plus the deterministic routing table (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10j.json), covered clauses:
 *  (1) Existence — the round-0 reading output carries a skopos_gate whose two
 *      verdict fields form_check (was the source's content morphemes
 *      reflected?) and effect_check (does the user reading the plan recognize
 *      their intended outcome?) exist with pass/fail values; a skopos_gate
 *      missing either verdict is refused by zod parsing (fail-closed missing
 *      fixtures: no form_check, no effect_check, empty object), and values
 *      outside the pass/fail enum are refused too. skopos_gate is a required
 *      field of the round-0 reading output schema.
 *  (2) Routing table — with the verdict values themselves fixed as fixtures,
 *      form=pass ∧ effect=pass routes to the 채택 branch; form=pass ∧
 *      effect=fail routes to the 수리 branch whose routing target is labeled
 *      재렌더; form=fail ∧ effect=fail routes to the 폐기 branch whose routing
 *      target is labeled 재독해 (three combination fixtures). Determinism: the
 *      same verdict combination always yields the same branch.
 *
 * Routing surface fixed by this test (definition of done for piece 3):
 *  routeSkoposGate({ form_check, effect_check }) returns an object with
 *  `branch` ("채택" | "수리" | "폐기") and, on 수리/폐기, `routing_target`
 *  ("재렌더" | "재독해"). No routing target is asserted for the 채택 branch —
 *  the contract names none.
 *
 * Residual (NOT tested here, per row residual):
 *  - Morpheme-reflection judgment — whether the source's content morphemes are
 *    actually reflected in the rendered plan (the substantive correctness of
 *    form_check) is machine-undecidable; verdicts are fixture-fixed.
 *  - Effect-recognition judgment — whether the real user reading the plan
 *    recognizes their intended outcome (the substantive correctness of
 *    effect_check) is a human-judgment predicate; verdicts are fixture-fixed.
 *  - The form=fail ∧ effect=pass combination's routing — the contract's
 *    routing table specifies only pass/pass, pass/fail, and fail/fail, so this
 *    file asserts nothing about where fail/pass routes (no requirement is
 *    added beyond the contract text).
 */
import { describe, expect, test } from "bun:test";
import { round0ReadingSchema } from "../src/interview/reading/round0-reading";
import { routeSkoposGate, skoposGateSchema } from "../src/interview/reading/skopos-gate";

// The oracle fixes the verdict values themselves as fixtures: only existence
// and routing are asserted deterministically.
const adoptFixture = { form_check: "pass", effect_check: "pass" };
const repairFixture = { form_check: "pass", effect_check: "fail" };
const discardFixture = { form_check: "fail", effect_check: "fail" };

describe("ac-10j clause 1 — skopos_gate carries form_check and effect_check pass/fail verdicts", () => {
  test("each specified verdict-combination fixture parses with both verdicts kept verbatim", () => {
    for (const fixture of [adoptFixture, repairFixture, discardFixture]) {
      const result = skoposGateSchema.safeParse(fixture);

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("unreachable");
      expect(result.data.form_check).toBe(fixture.form_check);
      expect(result.data.effect_check).toBe(fixture.effect_check);
    }
  });

  test("a gate missing effect_check is refused, with the issue anchored at effect_check", () => {
    const result = skoposGateSchema.safeParse({ form_check: "pass" });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(
      result.error.issues.some((issue: { path: (string | number)[] }) =>
        issue.path.includes("effect_check"),
      ),
    ).toBe(true);
  });

  test("a gate missing form_check is refused, with the issue anchored at form_check", () => {
    const result = skoposGateSchema.safeParse({ effect_check: "fail" });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(
      result.error.issues.some((issue: { path: (string | number)[] }) =>
        issue.path.includes("form_check"),
      ),
    ).toBe(true);
  });

  test("a gate missing both verdicts (empty object) is refused — fail-closed", () => {
    expect(skoposGateSchema.safeParse({}).success).toBe(false);
  });

  test("verdict values outside the pass/fail enum are refused on either field", () => {
    for (const bad of ["ok", "통과", "PASS", ""]) {
      expect(skoposGateSchema.safeParse({ form_check: bad, effect_check: "pass" }).success).toBe(
        false,
      );
      expect(skoposGateSchema.safeParse({ form_check: "pass", effect_check: bad }).success).toBe(
        false,
      );
    }
  });
});

describe("ac-10j clause 2 — routing table: pass/pass routes to the 채택 branch", () => {
  test("form=pass ∧ effect=pass returns the 채택 branch", () => {
    const result = routeSkoposGate(adoptFixture);

    expect(result.branch).toBe("채택");
  });
});

describe("ac-10j clause 2 — routing table: pass/fail routes to 수리 with target 재렌더", () => {
  test("form=pass ∧ effect=fail returns the 수리 branch", () => {
    const result = routeSkoposGate(repairFixture);

    expect(result.branch).toBe("수리");
  });

  test("the 수리 branch's routing target is labeled 재렌더", () => {
    const result = routeSkoposGate(repairFixture);

    expect(result.routing_target).toBe("재렌더");
  });
});

describe("ac-10j clause 2 — routing table: fail/fail routes to 폐기 with target 재독해", () => {
  test("form=fail ∧ effect=fail returns the 폐기 branch", () => {
    const result = routeSkoposGate(discardFixture);

    expect(result.branch).toBe("폐기");
  });

  test("the 폐기 branch's routing target is labeled 재독해", () => {
    const result = routeSkoposGate(discardFixture);

    expect(result.routing_target).toBe("재독해");
  });
});

describe("ac-10j clause 2 — routing is deterministic per verdict combination", () => {
  test("the same verdict combination always yields the same branch (fresh, equal inputs)", () => {
    const combos = [
      { form_check: "pass", effect_check: "pass" },
      { form_check: "pass", effect_check: "fail" },
      { form_check: "fail", effect_check: "fail" },
    ];

    for (const combo of combos) {
      const first = routeSkoposGate({ ...combo });
      const second = routeSkoposGate({ ...combo });

      expect(second).toEqual(first);
    }
  });
});

describe("ac-10j clause 1 — skopos_gate is a required field of the round-0 reading output", () => {
  test("an output without skopos_gate is refused with an issue at that field", () => {
    const result = round0ReadingSchema.safeParse({});

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(
      result.error.issues.some(
        (issue: { path: (string | number)[] }) => issue.path[0] === "skopos_gate",
      ),
    ).toBe(true);
  });

  test("a complete skopos_gate raises no issue at the skopos_gate field", () => {
    const result = round0ReadingSchema.safeParse({ skopos_gate: adoptFixture });
    const gateIssues = result.success
      ? []
      : result.error.issues.filter(
          (issue: { path: (string | number)[] }) => issue.path[0] === "skopos_gate",
        );

    expect(gateIssues).toEqual([]);
  });

  test("a skopos_gate missing a verdict is refused inside the round-0 output — fail-closed", () => {
    const result = round0ReadingSchema.safeParse({ skopos_gate: { form_check: "pass" } });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(
      result.error.issues.some(
        (issue: { path: (string | number)[] }) => issue.path[0] === "skopos_gate",
      ),
    ).toBe(true);
  });
});
