/**
 * ac-27 acceptance — A3 lock hardening: the acceptanceTestable gate is moved
 * in front of intent write, and user confirmation is bound to the sha256
 * digest of the confirmed statement (port of the prism finalize pattern).
 * Red-frozen.
 *
 * Oracle (gate-a/rows/ac-27.json), covered clauses:
 *  (1) gate ordering (deterministic): in the new interview lock path the
 *      acceptanceTestable gate (src/interview/lock/acceptance-testable.ts)
 *      stands before intent write (src/interview/lock/intent-write.ts) — a
 *      gate-failing statement (one containing vague terms, or one carrying no
 *      observable predicate) is refused before any write happens (write
 *      absence asserted via a fixture sink, fail-closed), the refusal reason
 *      points at the gate, and a gate-passing statement proceeds to write;
 *      the write path takes the gate-pass result as a required input, so a
 *      non-pass gate result is refused without writing.
 *  (2) hash binding (deterministic): the user confirmation record
 *      (src/interview/lock/statement-digest.ts) carries the sha256 digest of
 *      the confirmed statement as a required field (missing digest is a
 *      parse refusal, parse-or-refuse), and the lock is accepted only when
 *      the current statement's sha256 digest equals the confirmed digest —
 *      a one-byte change after confirmation is refused by digest mismatch
 *      while the identical statement is accepted; the exported write path
 *      enforces the same binding on its own, so a gate-passing statement with
 *      a non-matching (or digest-less) confirmation is refused without
 *      writing; sha256 itself is verified against known input -> known digest
 *      fixed vectors and against its output shape.
 *  (3) approximate regex fixture behavior (deterministic checks): fixture
 *      statements carrying vague terms match VAGUE_TERMS and fail the gate;
 *      the observable fixture statement satisfies OBSERVABLE and passes;
 *      fixture statements that carry no vague term but also no observable
 *      predicate do NOT match OBSERVABLE and fail the gate, so OBSERVABLE is
 *      load-bearing in the gate rather than decorative. This pins regex
 *      behavior on these fixtures only — it is not a formal guarantee.
 *
 * Expected module contract (these modules do not exist yet; this test
 * defines them):
 *  - acceptance-testable.ts: VAGUE_TERMS: RegExp; OBSERVABLE: RegExp;
 *    acceptanceTestable(statement) -> { ok: true, pass: { statement } }
 *    | { ok: false, reason } with the reason naming "acceptanceTestable".
 *  - statement-digest.ts: sha256Hex(text) -> lowercase hex of the UTF-8
 *    bytes; confirmationRecordSchema with safeParse requiring a
 *    statement_digest field shaped like a sha256 hex digest.
 *  - intent-write.ts: lockIntent({ statement, confirmation, sink }) runs
 *    gate -> digest binding -> write; writeIntent({ gate, confirmation,
 *    sink }) is the write path that requires the gate-pass result AND a
 *    confirmation whose digest matches the gate-passed statement, and writes
 *    that statement verbatim to sink.write.
 *
 * Residual (NOT tested here, per row residual):
 *  - Approximateness of vagueness judgment — VAGUE_TERMS/OBSERVABLE are
 *    approximations, not formal guarantees; whether arbitrary statements
 *    outside these fixtures are actually testable or vague is not closed by
 *    this criterion.
 *  - The actual act of user confirmation — digest binding only guarantees
 *    byte identity of the confirmed statement; whether the record reflects
 *    real user understanding and consent is a human-judged predicate
 *    (fixture confirmation records are used here).
 *  - Fidelity of the prism finalize port — only the sha256 digest-binding
 *    semantics are reproduced; verbatim comparison with the prism source is
 *    out of scope.
 */
import { describe, expect, test } from "bun:test";
import {
  OBSERVABLE,
  VAGUE_TERMS,
  acceptanceTestable,
} from "../src/interview/lock/acceptance-testable";
import { lockIntent, writeIntent } from "../src/interview/lock/intent-write";
import { confirmationRecordSchema, sha256Hex } from "../src/interview/lock/statement-digest";

// Fixture statements. Each vague fixture carries a term the VAGUE_TERMS
// approximation must catch; the observable fixture carries a concrete
// trigger -> countable-outcome predicate the OBSERVABLE approximation must
// accept. Vagueness judgment outside these fixtures is residual.
const VAGUE_STATEMENTS = [
  "응답이 적절히 처리되면 된다",
  "화면이 빠르게 뜨면 된다",
  "데이터가 충분히 쌓이면 된다",
] as const;
const VAGUE_STATEMENT = VAGUE_STATEMENTS[0];

const OBSERVABLE_STATEMENT = "저장 버튼을 누르면 목록에 새 항목이 1건 표시된다";
// Differs from OBSERVABLE_STATEMENT by exactly one byte ("1건" -> "2건").
const TAMPERED_STATEMENT = "저장 버튼을 누르면 목록에 새 항목이 2건 표시된다";
// Observable in shape, but contains the vague term "적절히".
const MIXED_STATEMENT = "저장 버튼을 누르면 목록이 적절히 갱신되어 새 항목이 1건 표시된다";
// Carry no vague term at all, yet state no observable trigger -> countable
// outcome predicate either. These are the negative direction of OBSERVABLE:
// they force the gate to consult OBSERVABLE, since a gate implemented as
// "no vague term => pass" would wrongly accept them.
const NON_OBSERVABLE_STATEMENTS = ["시스템이 동작한다", "로그인 기능을 제공한다"] as const;
const NON_OBSERVABLE_STATEMENT = NON_OBSERVABLE_STATEMENTS[0];

// sha256 fixed vectors (UTF-8 bytes -> lowercase hex).
const SHA256_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const SHA256_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA256_OBSERVABLE_STATEMENT =
  "ad876819c9110323d3756e14077174cd0089e6e89f60760ad08525bc486d3d36";
const SHA256_TAMPERED_STATEMENT =
  "687a78f86060c7defd1717b5f268cf5499834fb5a60dc1429204f4703f42bf6c";
const SHA256_MIXED_STATEMENT = "1a18e599a8b6afe9182dcef35babdfe07e42b156260430667e1d609a3ea1d194";
const SHA256_VAGUE_STATEMENTS = [
  "b0e99923420e5f7e4b6b06cca40ad44cdd81fab748c620bc98c71ef5a4edcd4f",
  "d65bd5e7f5f6cf450015f0b13fcc18d43c8b26022ae0795b414dd33405f06181",
  "b4e26dd89b44f70b8af40727b38f332cae3561b4935cdcaebeb8facb549f1fa6",
] as const;
const SHA256_NON_OBSERVABLE_STATEMENTS = [
  "b06bc46f8338e4c16cdc9b302f01709d590bc8ada08394ea427e69eebd2d42b5",
  "6d58a9d9c87e4dfab634d27905e57bf0858dc88647818dc53c67ac9668abc2fb",
] as const;
const SHA256_HEX_SHAPE = /^[0-9a-f]{64}$/;

type IntentRecord = { statement: string };

// Fixture sink: collects every write so the tests can assert write absence
// (fail-closed) and verbatim preservation of the locked statement.
const makeSink = () => {
  const writes: IntentRecord[] = [];
  return {
    writes,
    sink: {
      write(record: IntentRecord) {
        writes.push(record);
      },
    },
  };
};

const confirmationFor = (statement: string) => ({ statement_digest: sha256Hex(statement) });

describe("ac-27 clause 3 — VAGUE_TERMS / OBSERVABLE behavior pinned on fixtures (approximation, not a formal guarantee)", () => {
  test("each vague fixture statement matches VAGUE_TERMS", () => {
    for (const statement of VAGUE_STATEMENTS) {
      expect(statement).toMatch(VAGUE_TERMS);
    }
  });

  test("the observable fixture statement satisfies OBSERVABLE and is free of vague terms", () => {
    expect(OBSERVABLE_STATEMENT).toMatch(OBSERVABLE);
    expect(OBSERVABLE_STATEMENT).not.toMatch(VAGUE_TERMS);
  });

  test("each non-observable fixture statement fails OBSERVABLE while carrying no vague term", () => {
    for (const statement of NON_OBSERVABLE_STATEMENTS) {
      expect(statement).not.toMatch(OBSERVABLE);
      expect(statement).not.toMatch(VAGUE_TERMS);
    }
  });

  test("the gate refuses each vague fixture statement and names itself in the reason", () => {
    for (const statement of VAGUE_STATEMENTS) {
      const gate = acceptanceTestable(statement);
      expect(gate.ok).toBe(false);
      expect(gate.reason).toContain("acceptanceTestable");
    }
  });

  test("the gate refuses each non-observable fixture statement even though no vague term is present", () => {
    for (const statement of NON_OBSERVABLE_STATEMENTS) {
      const gate = acceptanceTestable(statement);
      expect(gate.ok).toBe(false);
      expect(gate.reason).toContain("acceptanceTestable");
    }
  });

  test("the gate passes the observable fixture statement and carries it verbatim in the pass result", () => {
    const gate = acceptanceTestable(OBSERVABLE_STATEMENT);
    expect(gate.ok).toBe(true);
    expect(gate.pass.statement).toBe(OBSERVABLE_STATEMENT);
  });

  test("a vague term inside an otherwise observable statement still fails the gate", () => {
    expect(MIXED_STATEMENT).toMatch(OBSERVABLE);
    expect(MIXED_STATEMENT).toMatch(VAGUE_TERMS);
    const gate = acceptanceTestable(MIXED_STATEMENT);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain("acceptanceTestable");
  });
});

describe("ac-27 clause 2 — user confirmation is bound to the statement's sha256 digest", () => {
  test("sha256Hex reproduces known fixed vectors (UTF-8 bytes -> lowercase hex)", () => {
    expect(sha256Hex("abc")).toBe(SHA256_ABC);
    expect(sha256Hex("")).toBe(SHA256_EMPTY);
    expect(sha256Hex(OBSERVABLE_STATEMENT)).toBe(SHA256_OBSERVABLE_STATEMENT);
    expect(sha256Hex(TAMPERED_STATEMENT)).toBe(SHA256_TAMPERED_STATEMENT);
    expect(sha256Hex(MIXED_STATEMENT)).toBe(SHA256_MIXED_STATEMENT);
    VAGUE_STATEMENTS.forEach((statement, index) => {
      expect(sha256Hex(statement)).toBe(SHA256_VAGUE_STATEMENTS[index]);
    });
    NON_OBSERVABLE_STATEMENTS.forEach((statement, index) => {
      expect(sha256Hex(statement)).toBe(SHA256_NON_OBSERVABLE_STATEMENTS[index]);
    });
  });

  test("sha256Hex is total: every input yields a 64-char lowercase hex digest, and a one-byte change changes it", () => {
    for (const text of ["", "abc", "a", " ", "🧪", OBSERVABLE_STATEMENT, MIXED_STATEMENT]) {
      expect(sha256Hex(text)).toMatch(SHA256_HEX_SHAPE);
    }
    expect(sha256Hex(OBSERVABLE_STATEMENT)).not.toBe(sha256Hex(TAMPERED_STATEMENT));
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });

  test("a confirmation record carries the statement digest as a required field (parse-or-refuse)", () => {
    expect(
      confirmationRecordSchema.safeParse({ statement_digest: SHA256_OBSERVABLE_STATEMENT }).success,
    ).toBe(true);
    expect(confirmationRecordSchema.safeParse({}).success).toBe(false);
    expect(
      confirmationRecordSchema.safeParse({ statement_digest: "not-a-sha256-hex" }).success,
    ).toBe(false);
  });

  test("the lock accepts when the current statement's digest equals the confirmed digest (byte identity)", () => {
    const { writes, sink } = makeSink();
    const result = lockIntent({
      statement: OBSERVABLE_STATEMENT,
      confirmation: confirmationFor(OBSERVABLE_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ statement: OBSERVABLE_STATEMENT });
  });

  test("a one-byte change after confirmation is refused by digest mismatch, and nothing is written", () => {
    // The tampered statement itself passes the gate, so the refusal below is
    // attributable to the digest binding alone, not to the gate.
    expect(acceptanceTestable(TAMPERED_STATEMENT).ok).toBe(true);
    const { writes, sink } = makeSink();
    const result = lockIntent({
      statement: TAMPERED_STATEMENT,
      confirmation: confirmationFor(OBSERVABLE_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).not.toContain("acceptanceTestable");
    expect(writes).toHaveLength(0);
  });

  test("a confirmation record missing the digest is refused in the lock path, and nothing is written", () => {
    const { writes, sink } = makeSink();
    const result = lockIntent({
      statement: OBSERVABLE_STATEMENT,
      // Missing statement_digest: must be refused by parse-or-refuse, never
      // treated as a matching confirmation.
      confirmation: {} as { statement_digest: string },
      sink,
    });
    expect(result.ok).toBe(false);
    expect(writes).toHaveLength(0);
  });

  test("the write path itself enforces the digest binding: gate pass + mismatching confirmation is refused, nothing written", () => {
    const gate = acceptanceTestable(OBSERVABLE_STATEMENT);
    expect(gate.ok).toBe(true);
    const { writes, sink } = makeSink();
    const result = writeIntent({
      gate,
      // Confirmation for a different statement: the gate says pass, so only
      // the digest binding can reject this.
      confirmation: confirmationFor(TAMPERED_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).not.toContain("acceptanceTestable");
    expect(writes).toHaveLength(0);
  });

  test("the write path refuses a digest-less confirmation even on a gate pass, and nothing is written", () => {
    const gate = acceptanceTestable(OBSERVABLE_STATEMENT);
    expect(gate.ok).toBe(true);
    const { writes, sink } = makeSink();
    const result = writeIntent({
      gate,
      confirmation: {} as { statement_digest: string },
      sink,
    });
    expect(result.ok).toBe(false);
    expect(writes).toHaveLength(0);
  });
});

describe("ac-27 clause 1 — acceptanceTestable gate stands before intent write (fail-closed ordering)", () => {
  test("a gate-failing statement is refused before any write, even when its digest confirmation matches", () => {
    const { writes, sink } = makeSink();
    const result = lockIntent({
      statement: VAGUE_STATEMENT,
      confirmation: confirmationFor(VAGUE_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("acceptanceTestable");
    expect(writes).toHaveLength(0);
  });

  test("a non-observable statement is refused by the gate before any write, even with a matching digest confirmation", () => {
    const { writes, sink } = makeSink();
    const result = lockIntent({
      statement: NON_OBSERVABLE_STATEMENT,
      confirmation: confirmationFor(NON_OBSERVABLE_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("acceptanceTestable");
    expect(writes).toHaveLength(0);
  });

  test("a gate-passing, digest-matching statement proceeds to write verbatim", () => {
    const { writes, sink } = makeSink();
    const result = lockIntent({
      statement: OBSERVABLE_STATEMENT,
      confirmation: confirmationFor(OBSERVABLE_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ statement: OBSERVABLE_STATEMENT });
  });

  test("the write path requires the gate-pass result as input: a non-pass gate result is refused, nothing written", () => {
    const failedGate = acceptanceTestable(VAGUE_STATEMENT);
    expect(failedGate.ok).toBe(false);
    const { writes, sink } = makeSink();
    const result = writeIntent({
      gate: failedGate,
      confirmation: confirmationFor(VAGUE_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("acceptanceTestable");
    expect(writes).toHaveLength(0);
  });

  test("the write path writes exactly the statement carried by the gate-pass result", () => {
    const gate = acceptanceTestable(OBSERVABLE_STATEMENT);
    expect(gate.ok).toBe(true);
    const { writes, sink } = makeSink();
    const result = writeIntent({
      gate,
      confirmation: confirmationFor(OBSERVABLE_STATEMENT),
      sink,
    });
    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ statement: OBSERVABLE_STATEMENT });
  });
});
