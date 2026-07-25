/**
 * When a premise flips, everything that rested on it is stale — not wrong, but
 * no longer known. The answers downstream were given under the old premise, and
 * quietly keeping them turns a retracted assumption into a fact nobody agreed
 * to.
 *
 * Propagation is transitive reachability over the premise edges, both
 * polarities alike: a branch that was closed by an answer has to reopen when
 * that answer flips, exactly as one that was opened. Nodes the flip cannot
 * reach are returned untouched — including the flipped node itself, whose own
 * status belongs to whoever recorded the flip.
 *
 * Detecting that a real answer flips an earlier premise is a semantic judgment
 * made elsewhere; this module takes the flip as given and moves the graph.
 */

import { type PremiseGraph, reachableFrom } from "./branch-edge";

export type NodeState = {
  status: string;
  reopened: boolean;
};

export type NodeStates = Record<string, NodeState>;

export type PremiseFlipEvent = {
  kind: "polarity_inversion";
  node_id: string;
};

export type StalePropagationResult = {
  stale_ids: string[];
  states: NodeStates;
};

export function propagatePremiseFlip(
  graph: PremiseGraph,
  states: NodeStates,
  event: PremiseFlipEvent,
): StalePropagationResult {
  const downstream = reachableFrom(graph, event.node_id);
  const stale_ids = Object.keys(states).filter((id) => downstream.has(id));

  const nextStates: NodeStates = {};
  for (const [id, state] of Object.entries(states)) {
    nextStates[id] = downstream.has(id) ? { status: "stale", reopened: true } : { ...state };
  }

  return { stale_ids, states: nextStates };
}
