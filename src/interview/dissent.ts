import { z } from "zod";

/**
 * Intent dissent — the objection that the resolved reading is not what the user
 * meant. For that objection to be possible at all, the opponent has to see BOTH
 * readings: the original intent as the user stated it and the reading the
 * interview resolved it into. Shown only the resolved reading, an opponent can
 * argue about its merits and never notice it answers a different request.
 *
 * The comparison pair therefore travels together on one object, all the way to
 * the conclusion — a dissent raised and then summarized away is a dissent that
 * did not see the conclusion.
 *
 * The channel is narrow on purpose. Dissent may say "this is not the same
 * intent"; it may not say "and while we are here, also build this". The
 * constraint rides on the brief that reaches the opponent — not merely in the
 * builder's output — because an unprompted opponent is free to widen scope, and
 * the schema pins it as a literal so a rewritten constraint is a refusal.
 *
 * Whether the resolved reading is genuinely a mis-resolution is judged by the
 * same model prior that produced the pair. The pair arriving does not fix that.
 */

export const INTENT_DISSENT_CONSTRAINT =
  "Argue only about whether the resolved reading preserves the SAME intent as the original request. Do NOT grow the scope: no adjacent improvements, no new requirements, no better ideas.";

export const intentDissentBriefSchema = z
  .object({
    /** The user's request as stated — the standard the reading is judged against. */
    original_intent: z.string().min(1),
    /** What the interview resolved it into. */
    resolved_reading: z.string().min(1),
    constraint: z.literal(INTENT_DISSENT_CONSTRAINT),
  })
  .strict();
export type IntentDissentBrief = z.infer<typeof intentDissentBriefSchema>;

export function buildIntentDissentBrief(input: {
  original_intent: string;
  resolved_reading: string;
}): IntentDissentBrief {
  return intentDissentBriefSchema.parse({
    original_intent: input.original_intent,
    resolved_reading: input.resolved_reading,
    constraint: INTENT_DISSENT_CONSTRAINT,
  });
}

export type DissentHost = {
  delegate: (brief: IntentDissentBrief) => Promise<string> | string;
};

export type DissentOutcome =
  | { status: "engaged"; brief: IntentDissentBrief; text: string }
  | { status: "host_absent"; brief: IntentDissentBrief };

/**
 * Runs the opponent, or degrades honestly. With no host there is no opponent,
 * so the outcome says so and carries no text — inventing opponent words would
 * make an unheld dissent indistinguishable from a held one.
 */
export async function engageIntentDissent(input: {
  original_intent: string;
  resolved_reading: string;
  host?: DissentHost | null;
}): Promise<DissentOutcome> {
  const brief = buildIntentDissentBrief({
    original_intent: input.original_intent,
    resolved_reading: input.resolved_reading,
  });

  if (!input.host) {
    return { status: "host_absent", brief };
  }

  const text = await input.host.delegate(brief);
  return { status: "engaged", brief, text };
}
