import { checkRedFirst } from "../src/gate/red-first";

/**
 * Re-runs the REAL gate ④ (red-first) over the frozen manifest — not a
 * re-implementation. Each frozen test must still satisfy every condition the
 * gate enforces: externally authored, an actually-observed red run, and content
 * whose hash still matches the freeze (no deletion, no weakening). This is the
 * check piece 3 must keep passing; run it any time to prove the freeze holds.
 */

const ROOT = new URL("..", import.meta.url);

interface FreezeEntry {
  criterion_id: string;
  path: string;
  sha256: string;
  red_exit_code: number;
  author: "external" | "loop";
}

const manifest = (await Bun.file(new URL("gate-a/red-freeze.json", ROOT)).json()) as {
  frozen_at: string;
  entries: FreezeEntry[];
};

const rejected: string[] = [];
for (const entry of manifest.entries) {
  const file = Bun.file(new URL(entry.path, ROOT));
  const currentContent = (await file.exists()) ? await file.text() : null;
  const decision = checkRedFirst({
    author: entry.author,
    observed_red_exit_code: entry.red_exit_code,
    frozen_hash: entry.sha256,
    current_content: currentContent,
  });
  if (!decision.accepted) {
    rejected.push(`${entry.criterion_id} (${entry.path}): ${decision.reasons.join(" / ")}`);
  }
}

console.log(
  `게이트④ 검사: 동결 ${manifest.entries.length}개 중 통과 ${manifest.entries.length - rejected.length}, 거부 ${rejected.length} (동결 시각 ${manifest.frozen_at})`,
);
if (rejected.length > 0) {
  for (const r of rejected) console.log(`  - ${r}`);
  process.exit(1);
}
console.log("동결 무결 — 약화·삭제 없음");
