import type { InterviewState } from "./interview-state.ts";

// Goal 3: at the end of every turn the user sees, without having asked, what is
// settled, what is still open, and how the driver is currently reading their
// intent. It is derived from the ledger only — anything the driver did not write
// down does not appear here, which is the point.
//
// Full, cumulative view — used by the on-demand `deep-interview status` command.
export const statusBlock = (state: InterviewState): string =>
  [
    "─ 지금까지 ─",
    "확정된 것",
    ...indent(settled(state)),
    "아직 안 정해진 것",
    ...indent(open(state)),
    "지금 이해하고 있는 뜻",
    ...indent(reading(state)),
    "─",
    "",
  ].join("\n");

// Auto-attached per turn. A 30-line cumulative block buried the question below
// it (D-2). This shows a one-line summary plus only what this turn changed —
// the full picture stays one command away.
export const statusDiff = (before: InterviewState, after: InterviewState): string => {
  const settledAfter = settled(after);
  const openAfter = open(after);

  return [
    `─ 지금까지: 확정 ${settledAfter.length} · 미정 ${openAfter.length} · 전체 보기 \`fabricate deep-interview status\` ─`,
    "이번 턴에 확정된 것",
    ...indent(newLines(settled(before), settledAfter)),
    "이번 턴에 새로 열린 것",
    ...indent(newLines(open(before), openAfter)),
    "이번 턴에 갱신된 뜻",
    ...indent(newLines(reading(before), reading(after))),
    "─",
    "",
  ].join("\n");
};

const newLines = (before: string[], after: string[]): string[] => {
  const seen = new Set(before);
  return after.filter((line) => !seen.has(line));
};

const settled = (state: InterviewState): string[] => {
  const lines: string[] = [];

  for (const dimension of state.dimensions.values()) {
    if (dimension.resolved) {
      lines.push(`${dimension.id} ${dimension.text} — ${dimension.evidence ?? ""}`.trimEnd());
    }
  }

  for (const answer of state.answers.values()) {
    if (answer.confirmed) {
      lines.push(`${answer.id} ${short(answer.text)}`);
    }
  }

  for (const criterion of state.criteria.values()) {
    const rule = criterion.rule === null ? "" : ` — ${short(criterion.rule)}`;
    lines.push(`${criterion.id} [${criterion.type}] ${short(criterion.text)}${rule}`);
  }

  for (const [index, goal] of state.goals.entries()) {
    lines.push(`목표 ${index}: ${short(goal)}`);
  }

  return lines;
};

const open = (state: InterviewState): string[] => {
  const lines: string[] = [];

  for (const dimension of state.dimensions.values()) {
    if (dimension.resolved) {
      continue;
    }

    const why = dimension.stale
      ? "전제가 뒤집혀 다시 열림"
      : dimension.unevaluated
        ? "근거 없이 닫으려 함"
        : "아직 안 닫힘";
    lines.push(`${dimension.id} ${dimension.text} — ${why}`);
  }

  for (const answer of state.answers.values()) {
    if (!answer.confirmed) {
      lines.push(`${answer.id} 확인 못 받음 — ${short(answer.text)}`);
    }
    if (answer.unsure) {
      lines.push(`${answer.id} 사용자가 확신 못 함`);
    }
  }

  for (const ambiguity of state.ambiguities.values()) {
    if (!state.materialities.has(ambiguity.id)) {
      lines.push(`${ambiguity.id} 물을지 가정할지 안 정함 — ${short(ambiguity.text)}`);
    }
  }

  for (const contradiction of state.contradictions.values()) {
    if (!contradiction.resolved) {
      lines.push(`${contradiction.id} 어긋남이 안 풀림 — ${short(contradiction.text)}`);
    }
  }

  if (state.criteria.size === 0) {
    lines.push("완료 판정 기준이 아직 없음");
  }

  if (state.goals.length === 0) {
    lines.push("목표 술어가 아직 없음");
  }

  return lines;
};

const reading = (state: InterviewState): string[] => {
  const lines: string[] = [];
  const latestRestate = new Map<string, string>();

  for (const restate of state.restates.values()) {
    latestRestate.set(restate.answer, restate.text);
  }

  for (const [answerId, text] of latestRestate) {
    lines.push(`${answerId} ← ${short(text)}`);
  }

  for (const materiality of state.materialities.values()) {
    if (materiality.assumption !== null) {
      lines.push(`${materiality.ambiguity} 가정하고 감 — ${short(materiality.assumption)}`);
    }
  }

  for (const remark of state.remarks.values()) {
    if (remark.overturns !== null) {
      lines.push(`${remark.id} 사용자가 ${remark.overturns} 을 뒤집음 — ${short(remark.text)}`);
    }
  }

  return lines;
};

const indent = (lines: string[]): string[] =>
  lines.length === 0 ? ["  (없음)"] : lines.map((line) => `  ${line}`);

const short = (text: string, limit = 60): string => {
  const flat = text.replaceAll(/\s+/g, " ").trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`;
};
