import { readdir } from "node:fs/promises";

/**
 * Piece-3 progress: runs every frozen acceptance test individually and reports
 * which criteria are closed. A criterion counts as green only when its own
 * frozen test passes — the same file gate ④ pins by hash, so progress cannot be
 * claimed by editing a test. Prints the wave-ordered remainder so the next step
 * is always visible.
 */

const ROOT = new URL("..", import.meta.url);
const rootPath = Bun.fileURLToPath(ROOT);

interface Row {
  criterion_id: string;
  red_test_path: string;
  depends_on: string[];
}

const rowsDir = new URL("gate-a/rows/", ROOT);
const rows: Row[] = [];
for (const file of (await readdir(rowsDir)).filter((f) => f.endsWith(".json")).sort()) {
  rows.push((await Bun.file(new URL(file, rowsDir)).json()) as Row);
}

const green: string[] = [];
const red: string[] = [];
for (const row of rows) {
  const run = Bun.spawnSync(["bun", "test", row.red_test_path], { cwd: rootPath });
  (run.exitCode === 0 ? green : red).push(row.criterion_id);
}

// Wave order by dependency, so the printed remainder is actionable.
const deps = new Map(rows.map((r) => [r.criterion_id, new Set(r.depends_on)]));
const settled = new Set<string>();
const waves: string[][] = [];
while (settled.size < rows.length) {
  const wave = rows
    .map((r) => r.criterion_id)
    .filter((id) => !settled.has(id) && [...(deps.get(id) ?? [])].every((d) => settled.has(d)));
  if (wave.length === 0) break;
  waves.push(wave);
  for (const id of wave) settled.add(id);
}

console.log(`조각 3 진행: 초록 ${green.length} / ${rows.length} (빨강 ${red.length})`);
for (const [index, wave] of waves.entries()) {
  const waveGreen = wave.filter((id) => green.includes(id));
  const waveRed = wave.filter((id) => red.includes(id));
  console.log(
    `  물결 ${index + 1}: ${waveGreen.length}/${wave.length} 초록${waveRed.length > 0 ? ` — 남은 것: ${waveRed.join(" ")}` : " ✓"}`,
  );
}
