/**
 * The premise graph — which answers other questions rest on. An edge points
 * from the premise to what depends on it, and it carries a polarity: an answer
 * can open a branch (positive) or close one (negative). Positive-only edges can
 * record "because you said yes, we asked this" but not "because you said no, we
 * stopped asking that" — and the second is exactly what has to be revisited
 * when the premise flips.
 *
 * The structure stays a DAG. A cycle would make "everything downstream of this"
 * unanswerable, and premise cycles are always a modeling error rather than a
 * real dependency. Insertions are refused rather than repaired, and every
 * operation returns a new graph so a rejected insertion cannot half-apply.
 */

export type EdgePolarity = "positive" | "negative";

export type PremiseEdge = {
  from: string;
  to: string;
  polarity: EdgePolarity;
};

export type PremiseGraph = {
  nodes: string[];
  edges: PremiseEdge[];
};

export type AddEdgeResult =
  | { accepted: true; graph: PremiseGraph }
  | { accepted: false; reason: string };

export function createPremiseGraph(nodeIds: readonly string[]): PremiseGraph {
  return { nodes: [...nodeIds], edges: [] };
}

/** Every node reachable from `origin` by following edges forward. */
export function reachableFrom(graph: PremiseGraph, origin: string): Set<string> {
  const reached = new Set<string>();
  const frontier = [origin];

  while (frontier.length > 0) {
    const current = frontier.pop() as string;
    for (const edge of graph.edges) {
      if (edge.from === current && !reached.has(edge.to)) {
        reached.add(edge.to);
        frontier.push(edge.to);
      }
    }
  }

  return reached;
}

export function addPremiseEdge(graph: PremiseGraph, edge: PremiseEdge): AddEdgeResult {
  const known = new Set(graph.nodes);
  if (!known.has(edge.from) || !known.has(edge.to)) {
    return {
      accepted: false,
      reason: `그래프에 없는 노드를 끝점으로 갖는 edge다: ${edge.from}->${edge.to}`,
    };
  }

  // A cycle appears exactly when the new edge's target already reaches its
  // source — the self-loop being the degenerate case of that.
  if (edge.from === edge.to || reachableFrom(graph, edge.to).has(edge.from)) {
    return { accepted: false, reason: `순환을 만드는 edge다: ${edge.from}->${edge.to}` };
  }

  return { accepted: true, graph: { nodes: graph.nodes, edges: [...graph.edges, { ...edge }] } };
}
