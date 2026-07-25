import { readdir } from "node:fs/promises";
import { CONTRACT_EVIDENCE_KIND, type EvidenceKind, matchEvidence } from "../src/gate/evidence";
import { type VerificationMethod, criterion } from "../src/intent/criterion";

/**
 * Piece-2 oracle-table validator. Machine-checks every row in gate-a/rows/
 * against the founding contract and the REAL gates — not a re-implementation:
 * rows must parse through the gate-① criterion schema, translate evidence
 * vocabulary exactly per decision 0001, be closable by their own method under
 * gate ③, and cover all 69 criteria with no extras. Exit 1 on any violation.
 */

const ROOT = new URL("..", import.meta.url);

interface ContractCriterion {
  id: string;
  statement: string;
  evidence_required: string[];
}

interface Row {
  criterion_id: string;
  oracle_statement: string;
  method: VerificationMethod;
  evidence_kinds: EvidenceKind[];
  module_plan: string[];
  red_test_path: string;
  depends_on: string[];
  residual: string[];
  draft_passage_found: string;
}

const contract = (await Bun.file(new URL("contract/criteria.json", ROOT)).json()) as {
  count: number;
  criteria: ContractCriterion[];
};
const byId = new Map(contract.criteria.map((c) => [c.id, c]));
const idSet = new Set(byId.keys());

const rowsDir = new URL("gate-a/rows/", ROOT);
const rowFiles = (await readdir(rowsDir)).filter((f) => f.endsWith(".json")).sort();

const violations: string[] = [];
const flag = (id: string, msg: string) => violations.push(`${id}: ${msg}`);

// coverage: exactly one row per contract id, no extras
const rowIds = rowFiles.map((f) => f.replace(/\.json$/, ""));
for (const id of idSet) {
  if (!rowIds.includes(id)) violations.push(`${id}: 행 파일 없음 (gate-a/rows/${id}.json)`);
}
for (const id of rowIds) {
  if (!idSet.has(id)) violations.push(`${id}: 계약에 없는 id의 행 파일`);
}

const translate = (evidenceRequired: string[]): EvidenceKind[] => {
  const mapped = evidenceRequired.map(
    (w) => CONTRACT_EVIDENCE_KIND[w as keyof typeof CONTRACT_EVIDENCE_KIND],
  );
  return [...new Set(mapped)].sort() as EvidenceKind[];
};

let checked = 0;
for (const file of rowFiles) {
  const id = file.replace(/\.json$/, "");
  const source = byId.get(id);
  if (source === undefined) continue;

  let row: Row;
  try {
    row = (await Bun.file(new URL(file, rowsDir)).json()) as Row;
  } catch (e) {
    flag(id, `JSON 파싱 실패: ${String(e)}`);
    continue;
  }

  // gate ① — the row must survive the real criterion/oracle schema (forward, id match)
  const parsed = criterion.safeParse({
    id: source.id,
    statement: source.statement,
    oracle: {
      criterion_id: row.criterion_id,
      statement: row.oracle_statement,
      method: row.method,
      direction: "forward",
    },
  });
  if (!parsed.success) {
    flag(id, `게이트① 스키마 거부: ${parsed.error.issues.map((i) => i.message).join(" / ")}`);
  }

  // decision 0001 — exact translation of the contract's evidence vocabulary
  const expected = translate(source.evidence_required);
  const actual = [...new Set(row.evidence_kinds ?? [])].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    flag(
      id,
      `증거 종류가 결정 0001 번역과 불일치: 기대 [${expected.join(",")}] ≠ 실제 [${actual.join(",")}]`,
    );
  }

  // gate ③ — the oracle must be closable by at least one of its own kinds
  const closable = actual.some(
    (kind) =>
      matchEvidence({ criterion_id: id, method: row.method }, [
        { criterion_id: id, kind, ref: "probe", summary: "probe" },
      ]).decision === "pass",
  );
  if (!closable) {
    flag(id, `method=${row.method}는 evidence_kinds [${actual.join(",")}]로 닫을 수 없다`);
  }

  if (row.red_test_path !== `acceptance/${id}.test.ts`) {
    flag(id, `red_test_path 규약 위반: ${row.red_test_path}`);
  }

  for (const dep of row.depends_on ?? []) {
    if (!idSet.has(dep)) flag(id, `depends_on에 계약에 없는 id: ${dep}`);
    if (dep === id) flag(id, "자기 자신에 의존");
  }

  if ((row.module_plan ?? []).some((m) => !m.startsWith("src/"))) {
    flag(id, `module_plan에 src/ 밖 경로: ${row.module_plan.join(", ")}`);
  }

  checked += 1;
}

console.log(`행 ${rowFiles.length}개 발견, ${checked}개 검사 (계약 조건 ${contract.count}개)`);
if (violations.length > 0) {
  console.log(`위반 ${violations.length}건:`);
  for (const v of violations) console.log(`  - ${v}`);
  process.exit(1);
}
console.log("위반 0건 — 판정표가 게이트①·③과 결정 0001을 통과한다");
