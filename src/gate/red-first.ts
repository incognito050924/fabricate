import { createHash } from "node:crypto";

/**
 * Gate ④ — red-first check. A completion-judging test counts only when its
 * green was earned honestly: (1) the loop did not author its own judging test
 * (maker ≠ checker), (2) a RED state was actually observed and recorded before
 * implementation, and (3) the frozen test survived intact — neither deleted
 * nor rewritten (content hash still matches the freeze).
 *
 * Pure and fail-closed: content is injected, never read from disk here, and
 * every violated condition is reported — any violation rejects.
 */

/** SHA-256 hex over test content; identical content ⇒ identical hash. */
export function hashTestContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export interface RedFirstInput {
  /** Who wrote the judging test; only "external" is admissible. */
  author: "external" | "loop";
  /** Exit code of the recorded pre-implementation run; null = never recorded. */
  observed_red_exit_code: number | null;
  /** hashTestContent(...) taken when the test was frozen. */
  frozen_hash: string;
  /** Current on-disk content of the frozen test, injected (null = deleted). */
  current_content: string | null;
}

export interface RedFirstDecision {
  accepted: boolean;
  reasons: string[];
}

export function checkRedFirst(input: RedFirstInput): RedFirstDecision {
  const reasons: string[] = [];

  if (input.author !== "external") {
    reasons.push("판정 테스트를 쓴 주체가 루프 자신이다 — 자기 성공 기준을 자기가 쓴 것은 무효");
  }

  if (input.observed_red_exit_code === null) {
    reasons.push("빨간 상태를 실제로 관측한 기록이 없다 — 빨강 선행을 증명할 수 없어 거부");
  } else if (input.observed_red_exit_code === 0) {
    reasons.push(`기록된 선행 실행이 빨강이 아니다 (exit ${input.observed_red_exit_code}) — 거부`);
  }

  if (input.current_content === null) {
    reasons.push("동결된 빨간 테스트 파일이 삭제됐다 — 거부");
  } else if (hashTestContent(input.current_content) !== input.frozen_hash) {
    reasons.push("동결된 빨간 테스트 내용이 바뀌었다 (해시 불일치) — 약화·삭제로 보고 거부");
  }

  return { accepted: reasons.length === 0, reasons };
}
