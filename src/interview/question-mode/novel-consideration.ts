/**
 * Novel considerations — how many things surfaced that the first request did
 * not already contain. An interview that elicits nothing new is a parrot: it
 * read the request back in question form and learned nothing, and the count
 * being zero is the cheapest observable trace of that.
 *
 * The zero raises a weak signal, not a block. Some requests genuinely arrive
 * complete, and refusing to advance on a count would punish the user for having
 * been clear. So the signal is recorded and carried; the gate reports it and
 * lets the session proceed, leaving the record intact for whoever reads it.
 *
 * Which items are truly novel is fixed upstream (fixture tags here) — this
 * module counts and wires, it does not judge novelty.
 */

export type ElicitedItem = {
  id: string;
  content: string;
  novel: boolean;
};

export type ElicitationSession = {
  initial_request: string;
  elicited_items: ElicitedItem[];
};

export type NovelConsiderationAssessment = {
  novel_consideration_count: number;
  novel_item_ids: string[];
  /** True when nothing new surfaced — a signal record, never a verdict. */
  weak_elicitation: boolean;
};

export function assessNovelConsideration(
  session: ElicitationSession,
): NovelConsiderationAssessment {
  const novelItems = session.elicited_items.filter((item) => item.novel === true);
  return {
    novel_consideration_count: novelItems.length,
    novel_item_ids: novelItems.map((item) => item.id),
    weak_elicitation: novelItems.length === 0,
  };
}

export type SessionAdvanceGateResult = {
  ok: boolean;
  /** Signals passed along, unconsumed — reading one does not clear it. */
  signals: string[];
};

export function gateSessionAdvance(input: {
  assessment: NovelConsiderationAssessment;
}): SessionAdvanceGateResult {
  const signals = input.assessment.weak_elicitation
    ? ["weak_elicitation: 첫 요청에 없던 항목이 하나도 나오지 않았다"]
    : [];
  return { ok: true, signals };
}
