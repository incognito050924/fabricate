/**
 * Acceptance test for ac-B6 — artifact_anchor on main intent claims
 * [forced-artifact]: the main intent claim record schema carries an
 * artifact_anchor field whose value, when present, holds
 * kind ∈ {로그, 파일, 재현물} plus a non-empty reference
 * (location / path / identifier), and zod parsing rejects out-of-enum kinds
 * and empty references (negative fixtures); feeding a main intent claim
 * WITHOUT an artifact_anchor to the tagging procedure deterministically
 * attaches the abstract_only=true '추상-전용' weak-weighting tag, and a claim
 * record with neither an anchor nor the abstract_only tag is rejected
 * fail-closed by parsing — "attach when absent" is a total function, not an
 * option; 2-state contrast — a claim WITH an artifact_anchor never receives
 * abstract_only=true (an anchored claim is not demoted to abstract-only), so
 * the tagging rule is a pure function of anchor presence.
 *
 * Frozen red: the modules under src/interview/anchor/ do not exist yet; the
 * piece-3 implementation must turn this file green without editing it.
 *
 * Oracle source: gate-a/rows/ac-B6.json (oracle_statement clauses 1-3).
 *
 * Residual — deliberately NOT tested here, per the row's residual declaration:
 * (a) anchor reality — whether the log / file / reproduction the anchor points
 *     at actually exists and actually supports the claim is declared residual
 *     by the contract text itself; only the anchor value's schema (kind enum +
 *     non-empty reference) and the tagging routing are machine-checked;
 * (b) identification of "main" intent claims — which claims count as main
 *     intent claims is not machined; the fixtures below fix each record as a
 *     main claim by construction, and only field enforcement and tagging
 *     rules are asserted on top of them;
 * (c) downstream weak weighting — whether abstract_only=true is actually
 *     weighted weakly by later judgment (consumption of the tag) is not
 *     closed by this criterion; only the deterministic attachment rule is
 *     checked.
 */

import { describe, expect, test } from "bun:test";
import { tagAbstractOnly } from "../src/interview/anchor/abstract-only-tagger";
import {
  artifactAnchorSchema,
  mainIntentClaimSchema,
} from "../src/interview/anchor/artifact-anchor";

const LOG_ANCHOR = {
  kind: "로그",
  reference: "logs/2026-07-21-interview-session.ndjson",
};

const FILE_ANCHOR = {
  kind: "파일",
  reference: "src/interview/driver.ts:42",
};

const REPRO_ANCHOR = {
  kind: "재현물",
  reference: "bun test acceptance/ac-12.test.ts --seed 7",
};

// Fixtures are fixed as MAIN intent claims by construction (residual b):
// no main-claim classifier is exercised in this file.
const ANCHORLESS_CLAIM = {
  id: "claim-1",
  statement: "the intent lock must refuse while an agent assumption remains",
};

const ANCHORED_CLAIM = {
  id: "claim-2",
  statement: "the interview driver replays the whole session from the log",
  artifact_anchor: LOG_ANCHOR,
};

describe("ac-B6 clause 1: anchor field schema — kind enum {로그, 파일, 재현물} plus non-empty reference", () => {
  test("record schema accepts an anchored main claim for each kind and preserves kind and reference verbatim", () => {
    const logClaim = mainIntentClaimSchema.safeParse(ANCHORED_CLAIM);
    expect(logClaim.success).toBe(true);
    expect(logClaim.success ? logClaim.data.artifact_anchor?.kind : undefined).toBe("로그");
    expect(logClaim.success ? logClaim.data.artifact_anchor?.reference : undefined).toBe(
      "logs/2026-07-21-interview-session.ndjson",
    );

    const fileClaim = mainIntentClaimSchema.safeParse({
      ...ANCHORLESS_CLAIM,
      artifact_anchor: FILE_ANCHOR,
    });
    expect(fileClaim.success).toBe(true);
    expect(fileClaim.success ? fileClaim.data.artifact_anchor?.kind : undefined).toBe("파일");

    const reproClaim = mainIntentClaimSchema.safeParse({
      ...ANCHORLESS_CLAIM,
      artifact_anchor: REPRO_ANCHOR,
    });
    expect(reproClaim.success).toBe(true);
    expect(reproClaim.success ? reproClaim.data.artifact_anchor?.kind : undefined).toBe("재현물");
  });

  test("anchor schema rejects out-of-enum kinds (negative fixtures)", () => {
    const screenshot = artifactAnchorSchema.safeParse({
      kind: "스크린샷",
      reference: "shots/2026-07-21.png",
    });
    expect(screenshot.success).toBe(false);

    const english = artifactAnchorSchema.safeParse({
      kind: "log",
      reference: "logs/2026-07-21-interview-session.ndjson",
    });
    expect(english.success).toBe(false);

    const emptyKind = artifactAnchorSchema.safeParse({
      kind: "",
      reference: "logs/2026-07-21-interview-session.ndjson",
    });
    expect(emptyKind.success).toBe(false);
  });

  test("anchor schema rejects an empty or missing reference (negative fixtures)", () => {
    const emptyReference = artifactAnchorSchema.safeParse({ kind: "로그", reference: "" });
    expect(emptyReference.success).toBe(false);

    const missingReference = artifactAnchorSchema.safeParse({ kind: "파일" });
    expect(missingReference.success).toBe(false);
  });

  test("record schema rejects a claim whose nested anchor is malformed (negative fixtures)", () => {
    const outOfEnumNested = mainIntentClaimSchema.safeParse({
      ...ANCHORLESS_CLAIM,
      artifact_anchor: { kind: "스크린샷", reference: "shots/2026-07-21.png" },
    });
    expect(outOfEnumNested.success).toBe(false);

    const emptyReferenceNested = mainIntentClaimSchema.safeParse({
      ...ANCHORLESS_CLAIM,
      artifact_anchor: { kind: "재현물", reference: "" },
    });
    expect(emptyReferenceNested.success).toBe(false);
  });
});

describe("ac-B6 clause 2: no anchor → abstract_only=true is attached deterministically, and the untagged anchorless state is fail-closed", () => {
  test("tagging an anchorless main claim attaches abstract_only=true and preserves the claim verbatim", () => {
    const tagged = tagAbstractOnly(ANCHORLESS_CLAIM);
    expect(tagged.abstract_only).toBe(true);
    expect(tagged.id).toBe("claim-1");
    expect(tagged.statement).toBe("the intent lock must refuse while an agent assumption remains");
    expect(tagged.artifact_anchor).toBeUndefined();
  });

  test("the attachment is deterministic — repeated invocations produce identical tagged records", () => {
    const first = tagAbstractOnly(ANCHORLESS_CLAIM);
    const second = tagAbstractOnly(ANCHORLESS_CLAIM);
    expect(first.abstract_only).toBe(true);
    expect(second.abstract_only).toBe(true);
    expect(second).toEqual(first);
  });

  test("the tagger's output is gate-valid — it parses under the main claim record schema", () => {
    const tagged = tagAbstractOnly(ANCHORLESS_CLAIM);
    const parsed = mainIntentClaimSchema.safeParse(tagged);
    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.abstract_only : undefined).toBe(true);
  });

  test("a claim with neither artifact_anchor nor the abstract_only tag is rejected fail-closed by parsing", () => {
    const untagged = mainIntentClaimSchema.safeParse(ANCHORLESS_CLAIM);
    expect(untagged.success).toBe(false);

    const explicitlyFalse = mainIntentClaimSchema.safeParse({
      ...ANCHORLESS_CLAIM,
      abstract_only: false,
    });
    expect(explicitlyFalse.success).toBe(false);
  });
});

describe("ac-B6 clause 3: 2-state contrast — an anchored claim is never demoted to abstract-only", () => {
  test("tagging a claim with an artifact_anchor does not attach abstract_only=true and preserves the anchor verbatim", () => {
    const tagged = tagAbstractOnly(ANCHORED_CLAIM);
    expect(tagged.abstract_only).not.toBe(true);
    expect(tagged.artifact_anchor?.kind).toBe("로그");
    expect(tagged.artifact_anchor?.reference).toBe("logs/2026-07-21-interview-session.ndjson");
  });

  test("the tagging rule is a pure function of anchor presence — every anchor kind blocks the tag, absence forces it", () => {
    for (const anchor of [LOG_ANCHOR, FILE_ANCHOR, REPRO_ANCHOR]) {
      const tagged = tagAbstractOnly({ ...ANCHORLESS_CLAIM, artifact_anchor: anchor });
      expect(tagged.abstract_only).not.toBe(true);
    }

    const anchorless = tagAbstractOnly(ANCHORLESS_CLAIM);
    expect(anchorless.abstract_only).toBe(true);
  });
});
