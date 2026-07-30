import type { InterviewState } from "./interview-state.ts";

// Goal 3: at the end of every turn the user sees, without having asked, what is
// settled, what is still open, and how the driver is currently reading their
// intent. It is derived from the ledger only — anything the driver did not write
// down does not appear here, which is the point.
//
// Full, cumulative view — used by the on-demand `deep-interview status` command.
export const statusBlock = (state: InterviewState): string =>
  [
    "─ so far ─",
    "settled",
    ...indent(settled(state)),
    "still open",
    ...indent(open(state)),
    "current reading",
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
    `─ so far: settled ${settledAfter.length} · open ${openAfter.length} · full view \`fabricate deep-interview status\` ─`,
    "settled this turn",
    ...indent(newLines(settled(before), settledAfter)),
    "opened this turn",
    ...indent(newLines(open(before), openAfter)),
    "reading updated this turn",
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
    lines.push(`goal ${index}: ${short(goal)}`);
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
      ? "reopened — its premise was overturned"
      : dimension.unevaluated
        ? "closed without evidence"
        : "not closed yet";
    lines.push(`${dimension.id} ${dimension.text} — ${why}`);
  }

  for (const answer of state.answers.values()) {
    if (!answer.confirmed) {
      lines.push(`${answer.id} not confirmed — ${short(answer.text)}`);
    }
    if (answer.unsure) {
      lines.push(`${answer.id} the user was unsure`);
    }
  }

  for (const ambiguity of state.ambiguities.values()) {
    if (!state.materialities.has(ambiguity.id)) {
      lines.push(`${ambiguity.id} not routed, ask or assume — ${short(ambiguity.text)}`);
    }
  }

  for (const contradiction of state.contradictions.values()) {
    if (!contradiction.resolved) {
      lines.push(`${contradiction.id} unresolved — ${short(contradiction.text)}`);
    }
  }

  if (state.criteria.size === 0) {
    lines.push("no completion criterion yet");
  }

  if (state.goals.length === 0) {
    lines.push("no goal predicate yet");
  }

  // D-5: what the user brought up unprompted is what the goal predicate kept
  // losing, and the user is the one who caught it every time. This is where they
  // get to catch it without reading the ledger. Before a predicate exists there
  // is nothing to be uncovered against, and the line above already says so.
  if (state.goals.length > 0) {
    for (const remark of state.remarks.values()) {
      if (!state.goalCovers.has(remark.id) && !state.setAsides.has(remark.id)) {
        lines.push(`${remark.id} not in the goal predicate — ${short(remark.text)}`);
      }
    }
  }

  return lines;
};

const reading = (state: InterviewState): string[] => {
  const lines: string[] = [];
  const latestRestate = new Map<string, { id: string; text: string }>();

  for (const restate of state.restates.values()) {
    latestRestate.set(restate.answer, { id: restate.id, text: restate.text });
  }

  // The restate id is here because the batched confirmation before close needs
  // it as the argument to `confirm --restate`. Without it the only place to find
  // that id was the ledger file (D-3).
  for (const [answerId, restate] of latestRestate) {
    lines.push(`${answerId} ← ${restate.id} ${short(restate.text)}`);
  }

  for (const materiality of state.materialities.values()) {
    if (materiality.assumption !== null) {
      lines.push(`${materiality.ambiguity} assumed — ${short(materiality.assumption)}`);
    }
  }

  for (const remark of state.remarks.values()) {
    if (remark.overturns !== null) {
      lines.push(`${remark.id} the user overturned ${remark.overturns} — ${short(remark.text)}`);
    }
  }

  return lines;
};

const indent = (lines: string[]): string[] =>
  lines.length === 0 ? ["  (none)"] : lines.map((line) => `  ${line}`);

const short = (text: string, limit = 60): string => {
  const flat = text.replaceAll(/\s+/g, " ").trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`;
};
