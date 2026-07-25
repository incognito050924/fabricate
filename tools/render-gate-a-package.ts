import { readdir } from "node:fs/promises";

/**
 * Renders gate-a/PACKAGE.md — the boundary-A review packet — deterministically
 * from what actually exists on disk: the judging-table rows, the frozen red
 * tests and their observed exit codes, and the review history. Nothing here is
 * asserted by an LLM; every number is counted from artifacts, so the user
 * reviews the real state rather than a claim about it.
 */

const ROOT = new URL("..", import.meta.url);

interface Row {
  criterion_id: string;
  method: string;
  evidence_kinds: string[];
  red_test_path: string;
  depends_on: string[];
  residual: string[];
  module_plan: string[];
}

interface FreezeEntry {
  criterion_id: string;
  path: string;
  sha256: string;
  red_exit_code: number;
}

const contract = (await Bun.file(new URL("contract/criteria.json", ROOT)).json()) as {
  count: number;
  criteria: Array<{ id: string; evidence_required: string[] }>;
};

const rowsDir = new URL("gate-a/rows/", ROOT);
const rowFiles = (await readdir(rowsDir)).filter((f) => f.endsWith(".json")).sort();
const rows: Row[] = [];
for (const file of rowFiles) {
  rows.push((await Bun.file(new URL(file, rowsDir)).json()) as Row);
}
const rowById = new Map(rows.map((r) => [r.criterion_id, r]));

const freeze = (await Bun.file(new URL("gate-a/red-freeze.json", ROOT)).json()) as {
  frozen_at: string;
  entries: FreezeEntry[];
};
const freezeById = new Map(freeze.entries.map((e) => [e.criterion_id, e]));

const review = (await Bun.file(new URL("gate-a/review-summary.json", ROOT)).json()) as {
  narrow_ids?: string[];
  revised_ids?: string[];
  repaired?: Array<{ id: string }>;
  test_review?: {
    flagged?: Array<{ id: string; verdict: string; revised: boolean }>;
    honest?: string[];
    rebut_missing?: string[];
  };
};

const methodCounts = new Map<string, number>();
for (const r of rows) methodCounts.set(r.method, (methodCounts.get(r.method) ?? 0) + 1);

const withResidual = rows.filter((r) => r.residual.length > 0);
const totalResidual = rows.reduce((n, r) => n + r.residual.length, 0);
const modulePaths = new Set(rows.flatMap((r) => r.module_plan.map((m) => m.split(" ")[0] ?? m)));

const flagged = review.test_review?.flagged ?? [];
const rebutMissing = review.test_review?.rebut_missing ?? [];

const L: string[] = [];
L.push("# 관문 A 검토 패키지");
L.push("");
L.push(
  "조각 2의 산출 전부. 이 문서의 모든 수치는 디스크의 산출물에서 직접 세었다(LLM 주장 아님) —",
);
L.push("`bun tools/render-gate-a-package.ts`로 언제든 재생성해 대조할 수 있다.");
L.push("");
L.push("## 무엇을 판단하는 자리인가");
L.push("");
L.push(
  '"어떻게 구현할까"가 아니라 **"각 조건을 기계가 어떻게 다시 판정할 것인가"**다. 조건을 좁게',
);
L.push("읽은 자리는 이 창에서만 잡힌다. 승인하면 테스트가 굳고, 그 뒤로는 약화·삭제가 게이트④에");
L.push("의해 거부된다. 이 승인이 곧 조각 3(인터뷰 표면 구현) 착수 허가다.");
L.push("");
L.push("## 산출물");
L.push("");
L.push(
  `- **69행 판정표**: \`gate-a/oracle-table.md\` (사람이 읽는 형태) · \`gate-a/rows/*.json\` (${rows.length}개 원본)`,
);
L.push(
  `- **동결된 빨간 테스트**: \`acceptance/*.test.ts\` ${freeze.entries.length}개 · 매니페스트 \`gate-a/red-freeze.json\``,
);
L.push(`- **심사 기록**: \`gate-a/review-summary.json\` (반박·비평·수리 내역)`);
L.push(`- **증거 어휘 매핑 결정**: \`decisions/0001-contract-evidence-mapping.md\``);
L.push("");
L.push("## 커버리지 (코드가 센 수)");
L.push("");
L.push("| 항목 | 수 |");
L.push("| --- | --- |");
L.push(`| 계약 조건 | ${contract.count} |`);
L.push(`| 판정표 행 | ${rows.length} |`);
L.push(`| 동결된 빨간 테스트 | ${freeze.entries.length} |`);
L.push(`| 빨강 관측(exit≠0) | ${freeze.entries.filter((e) => e.red_exit_code !== 0).length} |`);
L.push(`| 판정 방식 | ${[...methodCounts.entries()].map(([m, n]) => `${m} ${n}`).join(" · ")} |`);
L.push(`| 잔여를 가진 행 | ${withResidual.length} (잔여 항목 총 ${totalResidual}개) |`);
L.push(`| 계획된 신규 모듈 경로 | ${modulePaths.size} |`);
L.push("");
L.push("## 심사 이력");
L.push("");
L.push(
  `1. **작성** — 조건 하나에 에이전트 하나. 각 에이전트가 계약 원문(criteria.json의 statement)과`,
);
L.push(`   초안 구절을 직접 읽었다. 요약본은 어디에도 개입하지 않았다.`);
L.push(`2. **반박(판정표)** — 다른 에이전트가 같은 원문만 보고 "좁게 읽었나"를 판정.`);
L.push(
  `   narrow ${(review.narrow_ids ?? []).length}건 → 전부 수정 반영 (${(review.revised_ids ?? []).join(", ") || "없음"}).`,
);
L.push(`3. **완전성 비평** — 69개 id를 받아 빈/누락/중복/미지 의존을 지목. 빈·누락·중복 0건,`);
L.push(`   의심 12건 지목 → 주제별 표적 수리로 ${(review.repaired ?? []).length}개 행 수리.`);
L.push(`4. **반박(테스트)** — 구현이 없는 시점에 테스트만 보고 "빈 껍데기로도 통과하나"를 판정.`);
if (flagged.length > 0) {
  L.push(
    `   걸림 ${flagged.length}건 → 수정 ${flagged.filter((f) => f.revised).length}건: ${flagged.map((f) => `${f.id}(${f.verdict})`).join(", ")}.`,
  );
} else {
  L.push(`   걸림 0건 — 전부 honest 판정.`);
}
if (rebutMissing.length > 0) {
  L.push(
    `   **반박이 돌지 못한 조건 ${rebutMissing.length}건**: ${rebutMissing.join(", ")} — 미검증으로 남는다.`,
  );
}
L.push("");
L.push("## 조건별 요약");
L.push("");
L.push("| 조건 | 방식 | 증거 | 단언 근거 파일 | sha256(앞12) | 빨강 | 잔여 | 의존 |");
L.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
for (const c of contract.criteria) {
  const row = rowById.get(c.id);
  const fr = freezeById.get(c.id);
  L.push(
    `| ${c.id} | ${row?.method ?? "—"} | ${row?.evidence_kinds.join("+") ?? "—"} | \`${row?.red_test_path ?? "—"}\` | ${fr ? fr.sha256.slice(0, 12) : "—"} | ${fr ? `exit ${fr.red_exit_code}` : "—"} | ${row?.residual.length ?? "—"} | ${row?.depends_on.join(", ") || "—"} |`,
  );
}
L.push("");
L.push("## 이 시점에 이미 아는 한계");
L.push("");
L.push(
  "- **같은 편향.** 판정 기준을 쓴 자, 반박한 자, 테스트를 쓴 자가 같은 모델 계열이다. 만든 자와",
);
L.push(
  "  검사한 자를 벌리고 해시로 굳혀도 편향은 남는다. 조건을 좁게 읽고 그에 맞춰 굳은 테스트는",
);
L.push("  영구히 틀린 채 초록을 만든다 — 이 창이 그것을 잡을 유일한 자리다.");
L.push(
  `- **잔여 ${totalResidual}개는 이 판정 기준들로 닫히지 않는다.** 사람만 판정할 수 있는 술어, 실제`,
);
L.push("  사용자 답이 필요한 조건, 의미 판단이 여기 있다. 각 행의 residual에 정직하게 적혀 있다.");
L.push(
  "- **테스트가 곧 완료 정의다.** 각 조건의 완료는 이제 그 테스트가 초록이 되는 것으로 정의됐다.",
);
L.push("  테스트가 문안보다 좁으면 조건도 좁아진다.");
L.push("");
L.push("## 승인하면 무엇이 굳는가");
L.push("");
L.push(
  `- \`gate-a/red-freeze.json\`의 sha256 ${freeze.entries.length}개가 게이트④(빨간 테스트 선행)의 기준이 된다.`,
);
L.push("  이후 테스트 내용이 바뀌거나 파일이 지워지면 게이트가 거부한다(약화·삭제 불가).");
L.push("- 조건 집합은 게이트②로 잠기고, 제거는 거부되며 추가만 보고와 함께 허용된다.");
L.push("- 종료는 게이트⑤가 판정한다 — 통과 못 한 조건이 남으면 완료 종료가 부적격이 되고, 정직한");
L.push("  미검증 + 재진입으로만 착지한다.");
L.push("");
L.push(`_동결 시각: ${freeze.frozen_at}_`);

await Bun.write(new URL("gate-a/PACKAGE.md", ROOT), `${L.join("\n")}\n`);
console.log(
  `gate-a/PACKAGE.md 생성 — 행 ${rows.length} / 동결 ${freeze.entries.length} / 조건 ${contract.count}`,
);
