import { z } from "zod";

/**
 * The preunderstanding sheet (Gadamer). Every interviewer arrives already
 * holding a reading of the request; the harm is not that the reading exists but
 * that it stays implicit and steers the questions unexamined. So the reading is
 * written down BEFORE the first question — externalized where it can be
 * contradicted — and each item carries what has happened to it since:
 * 위험노출 (exposed, still unsettled), 확정 (settled by the user), 반박됨
 * (refuted by the user).
 *
 * Precedence is strict. A sheet recorded at the same moment as the first
 * question is a sheet written alongside the interview, which is a record of
 * what the interviewer already asked rather than of what they assumed.
 */

export const preunderstandingState = z.enum(["위험노출", "확정", "반박됨"]);
export type PreunderstandingState = z.infer<typeof preunderstandingState>;

export const preunderstandingItemSchema = z
  .object({
    id: z.string().min(1),
    content: z.string().min(1),
    state: preunderstandingState,
    recorded_at: z.string().datetime(),
  })
  .strict();
export type PreunderstandingItem = z.infer<typeof preunderstandingItemSchema>;

export const preunderstandingSheetSchema = z.array(preunderstandingItemSchema);
export type PreunderstandingSheet = z.infer<typeof preunderstandingSheetSchema>;

export type InterviewStartGateResult = { ok: true } | { ok: false; reason: string };

export function gateInterviewStart(input: {
  sheet?: unknown;
  first_question_asked_at: string;
}): InterviewStartGateResult {
  const parsed = preunderstandingSheetSchema.safeParse(input.sheet);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "선이해 시트가 없거나 형태가 맞지 않다 — 첫 질문 전에 외부화해야 한다",
    };
  }
  if (parsed.data.length === 0) {
    return { ok: false, reason: "빈 시트는 아무것도 외부화하지 않는다" };
  }

  const firstQuestionAt = Date.parse(input.first_question_asked_at);
  const notBefore = parsed.data.filter((item) => !(Date.parse(item.recorded_at) < firstQuestionAt));
  if (notBefore.length > 0) {
    return {
      ok: false,
      reason: `첫 질문보다 앞서지 않은 시트 항목: ${notBefore.map((item) => item.id).join(", ")}`,
    };
  }

  return { ok: true };
}
