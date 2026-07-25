import { type CodeSource, citationHasCurrentCodeAuthority } from "./current-code-authority";
import { type GroundingCitation, groundingCitationSchema } from "./grounding-citation";

/**
 * Challenging an answer with evidence. When an answer contradicts what the code
 * actually does, the challenge fires as the IMMEDIATELY next round's question —
 * round + 1, not "sometime later". Deferred, it arrives after the interview has
 * built more on top of the answer, and by then withdrawing it costs more than
 * keeping it.
 *
 * A challenge without a grounding citation is not approved. Challenging on
 * unstated grounds asks the user to defend their answer against the
 * interviewer's impression, which is how an interview starts arguing for its
 * own reading.
 *
 * Whether the answer really contradicts anything is a judgment made upstream;
 * this module carries the verdict, requires the evidence, and routes.
 */

import { z } from "zod";

export const answerChallengeSchema = z
  .object({
    /** The answer being challenged — a challenge with no target is an opinion. */
    answer_turn_id: z.string().min(1),
    grounding: groundingCitationSchema,
  })
  .strict();
export type AnswerChallenge = z.infer<typeof answerChallengeSchema>;

export type AnswerTurn = {
  id: string;
  round: number;
  answer: string;
};

export type ChallengeQuestion = {
  round: number;
  text: string;
  grounding: GroundingCitation;
  challenges_turn_id: string;
};

export type ChallengeTrigger = {
  challenge: AnswerChallenge;
  question: ChallengeQuestion;
};

export function triggerChallengeQuestion(input: {
  answer_turn: AnswerTurn;
  grounding: unknown;
}): ChallengeTrigger {
  const challenge = answerChallengeSchema.parse({
    answer_turn_id: input.answer_turn.id,
    grounding: input.grounding,
  });

  return {
    challenge,
    question: {
      // The immediately next round — deferring buys the answer more weight.
      round: input.answer_turn.round + 1,
      text: `앞선 답과 현재 코드가 어긋납니다. 근거: ${challenge.grounding.excerpt} — 어느 쪽이 맞습니까?`,
      grounding: challenge.grounding,
      challenges_turn_id: challenge.answer_turn_id,
    },
  };
}

export type ChallengeRouting = {
  approved: boolean;
  reason?: string;
};

export type ChallengeGateContext = {
  current_code: CodeSource;
};

/** Pure: same challenge and same code content always route the same way. */
export function gateAnswerChallenge(
  challenge: unknown,
  context: ChallengeGateContext,
): ChallengeRouting {
  const parsed = answerChallengeSchema.safeParse(challenge);
  if (!parsed.success) {
    return { approved: false, reason: "인용 없는 도전은 승인하지 않는다" };
  }
  if (!citationHasCurrentCodeAuthority(parsed.data.grounding, context.current_code)) {
    return { approved: false, reason: "현재 코드를 권위로 인용하지 않은 도전이다" };
  }
  return { approved: true };
}
