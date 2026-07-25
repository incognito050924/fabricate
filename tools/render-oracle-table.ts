import { readdir } from "node:fs/promises";

/**
 * Renders gate-a/oracle-table.md — the 69-row judging table the user reviews
 * at boundary A — deterministically from gate-a/rows/*.json plus the verbatim
 * contract statements. No LLM in the loop: what is reviewed is exactly what
 * was produced. Optional gate-a/review-summary.json adds rebut/critic info.
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
  method: string;
  evidence_kinds: string[];
  module_plan: string[];
  red_test_path: string;
  depends_on: string[];
  residual: string[];
  draft_passage_found: string;
}

interface ReviewSummary {
  narrow_ids?: string[];
  revised_ids?: string[];
  critic?: { summary?: string; suspect_rows?: Array<{ id: string; why: string }> };
}

const contract = (await Bun.file(new URL("contract/criteria.json", ROOT)).json()) as {
  count: number;
  criteria: ContractCriterion[];
};

const rowsDir = new URL("gate-a/rows/", ROOT);
const rowFiles = (await readdir(rowsDir)).filter((f) => f.endsWith(".json")).sort();
const rows = new Map<string, Row>();
for (const file of rowFiles) {
  rows.set(file.replace(/\.json$/, ""), (await Bun.file(new URL(file, rowsDir)).json()) as Row);
}

let summary: ReviewSummary = {};
try {
  summary = (await Bun.file(new URL("gate-a/review-summary.json", ROOT)).json()) as ReviewSummary;
} catch {
  // optional file — render without it
}
const narrowIds = new Set(summary.narrow_ids ?? []);
const revisedIds = new Set(summary.revised_ids ?? []);
const suspectById = new Map((summary.critic?.suspect_rows ?? []).map((s) => [s.id, s.why]));

const methodCounts = new Map<string, number>();
for (const row of rows.values()) {
  methodCounts.set(row.method, (methodCounts.get(row.method) ?? 0) + 1);
}

const lines: string[] = [];
lines.push("# 69행 판정표 — 관문 A 검토 대상");
lines.push("");
lines.push(
  '각 행은 "이 조건을 기계가 어떻게 다시 판정하는가"다. 계약 문안은 contract/criteria.json에서',
);
lines.push(
  "그대로 가져왔다(수정 없음). 검증: `bun tools/validate-oracle-table.ts` — 게이트①(스키마)·",
);
lines.push("게이트③(닫힘 가능성)·결정 0001(증거 번역)·커버리지(69/69)를 기계가 검사한다.");
lines.push("");
lines.push(`- 조건 수: ${contract.count} · 행 수: ${rows.size}`);
lines.push(
  `- 판정 방식 분포: ${[...methodCounts.entries()].map(([m, n]) => `${m} ${n}`).join(" · ")}`,
);
lines.push(
  `- 반박에서 narrow 판정 후 수정된 행: ${revisedIds.size}개${revisedIds.size > 0 ? ` (${[...revisedIds].join(", ")})` : ""}`,
);
if (summary.critic?.summary) {
  lines.push(`- 완전성 비평 요약: ${summary.critic.summary}`);
}
lines.push("");

for (const criterion of contract.criteria) {
  const row = rows.get(criterion.id);
  lines.push(`## ${criterion.id}`);
  lines.push("");
  lines.push(`**계약 문안 (verbatim)**: ${criterion.statement}`);
  lines.push("");
  if (row === undefined) {
    lines.push("**행 없음 — 판정 기준이 도출되지 않았다 (관문 A 통과 불가)**");
    lines.push("");
    continue;
  }
  lines.push(`**판정 기준**: ${row.oracle_statement}`);
  lines.push("");
  lines.push(
    `**방식**: ${row.method} · **증거 종류**: ${row.evidence_kinds.join(", ")} (계약 어휘: ${criterion.evidence_required.join(", ")}) · **빨간 테스트**: \`${row.red_test_path}\``,
  );
  lines.push("");
  lines.push(`**모듈 계획(신규)**: ${row.module_plan.map((m) => `\`${m}\``).join(", ")}`);
  lines.push("");
  const meta: string[] = [];
  meta.push(`**의존**: ${row.depends_on.length > 0 ? row.depends_on.join(", ") : "없음"}`);
  if (narrowIds.has(criterion.id)) {
    meta.push(`**반박**: narrow${revisedIds.has(criterion.id) ? " → 수정 반영" : " (수정 없음)"}`);
  }
  const suspicion = suspectById.get(criterion.id);
  if (suspicion !== undefined) {
    meta.push(`**비평가 지적**: ${suspicion}`);
  }
  lines.push(meta.join(" · "));
  lines.push("");
  if (row.residual.length > 0) {
    lines.push("**잔여 (이 판정 기준으로 닫히지 않음)**:");
    for (const r of row.residual) lines.push(`- ${r}`);
    lines.push("");
  }
}

await Bun.write(new URL("gate-a/oracle-table.md", ROOT), `${lines.join("\n")}\n`);
console.log(`gate-a/oracle-table.md 생성 — ${rows.size}행 / 조건 ${contract.count}개`);
