import { createHash } from "node:crypto";

/**
 * Piece-2 red-test freezer. For every judging-table row, runs its acceptance
 * test file INDIVIDUALLY, records the observed exit code (red = non-zero),
 * and freezes the file's sha256 into gate-a/red-freeze.json — the manifest
 * gate ④ (red-first) will check during piece 3: content hash must still
 * match, file must still exist, and the red observation is recorded here.
 * Exit 1 if any test file is missing or ran green (not a real red).
 */

const ROOT = new URL("..", import.meta.url);
const rootPath = Bun.fileURLToPath(ROOT);

interface Row {
  criterion_id: string;
  red_test_path: string;
}

const { readdir } = await import("node:fs/promises");
const rowsDir = new URL("gate-a/rows/", ROOT);
const rowFiles = (await readdir(rowsDir)).filter((f) => f.endsWith(".json")).sort();

interface FreezeEntry {
  criterion_id: string;
  path: string;
  sha256: string;
  red_exit_code: number;
  author: "external";
  author_context: string;
}

const entries: FreezeEntry[] = [];
const problems: string[] = [];

for (const file of rowFiles) {
  const row = (await Bun.file(new URL(file, rowsDir)).json()) as Row;
  const testFile = Bun.file(new URL(row.red_test_path, ROOT));
  if (!(await testFile.exists())) {
    problems.push(`${row.criterion_id}: 테스트 파일 없음 (${row.red_test_path})`);
    continue;
  }
  const content = await testFile.text();
  const sha256 = createHash("sha256").update(content, "utf8").digest("hex");

  const run = Bun.spawnSync(["bun", "test", row.red_test_path], { cwd: rootPath });
  const exitCode = run.exitCode;
  if (exitCode === 0) {
    problems.push(`${row.criterion_id}: 빨강이 아니다 (exit 0) — ${row.red_test_path}`);
    continue;
  }

  entries.push({
    criterion_id: row.criterion_id,
    path: row.red_test_path,
    sha256,
    red_exit_code: exitCode,
    author: "external",
    author_context: "piece2-fanout-agent (구현 루프가 아닌 조각 2 작성자)",
  });
}

console.log(`행 ${rowFiles.length}개 중 빨강 관측·동결 ${entries.length}개`);
if (problems.length > 0) {
  console.log(`문제 ${problems.length}건:`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}

const manifest = {
  frozen_at: new Date().toISOString(),
  note: "빨간 테스트 동결 매니페스트 — 게이트④(red-first)가 조각 3에서 해시·삭제·빨강 관측을 검사한다. 약화·삭제는 거부된다.",
  entries,
};
await Bun.write(new URL("gate-a/red-freeze.json", ROOT), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("gate-a/red-freeze.json 생성 — 전부 빨강 관측 완료");
