import { z } from "zod";

/**
 * The ladder runs both ways. Upward, "why does that matter?" climbs toward the
 * value the preference serves; downward, it descends to instances someone could
 * actually observe. Both ends are required: a ladder that only climbs ends in
 * an abstraction nobody can check, and one that only descends never learns what
 * the instances were for.
 *
 * The upward climb stops on the saturation MARK, never on how long the chain
 * got. Chain length is a proxy that is wrong in both directions — a one-step
 * chain can already be at the top, and a long one can still be circling.
 */

export const ladderSchema = z
  .object({
    dimension: z.string().min(1),
    /** The downward output — instances that can be observed, not described. */
    downward_observable_instances: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type Ladder = z.infer<typeof ladderSchema>;

export type UpwardLadderState = {
  dimension: string;
  saturated: boolean;
  why_chain: string[];
};

export type UpwardRouting = {
  stop_signal: boolean;
  next_upward_scheduled: boolean;
};

export function routeUpwardLaddering(state: UpwardLadderState): UpwardRouting {
  const saturated = state.saturated === true;
  return { stop_signal: saturated, next_upward_scheduled: !saturated };
}
