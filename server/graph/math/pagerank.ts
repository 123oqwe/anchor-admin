/**
 * L1 Graph Math — PageRank.
 *
 * Computes structural importance of each node in the Human Graph.
 * Pure function — no DB access, no side effects.
 *
 * Edge type weights:
 *   depends_on, blocks, threatens → 1.5 (high structural importance)
 *   supports, causal, enables    → 1.0 (medium)
 *   contextual, aligns_with      → 0.5 (low)
 *
 * Reference: IJCAI 2025 — Heterophily-Aware Personalized PageRank
 */

const EDGE_TYPE_WEIGHTS: Record<string, number> = {
  depends_on: 1.5,
  blocks: 1.5,
  threatens: 1.5,
  supports: 1.0,
  causal: 1.0,
  enables: 1.0,
  contextual: 0.5,
  aligns_with: 0.5,
  conflicts_with: 1.2,
  temporal: 0.3,
  owned_by: 0.3,
};

export interface GraphInput {
  nodes: { id: string }[];
  edges: { fromNodeId: string; toNodeId: string; type: string; weight: number }[];
}

/**
 * Compute PageRank scores for all nodes.
 * @returns Map of nodeId → importance score (0-1, sums to 1)
 */
export function computePageRank(
  graph: GraphInput,
  damping = 0.85,
  iterations = 20
): Map<string, number> {
  const N = graph.nodes.length;
  if (N === 0) return new Map();

  const scores = new Map<string, number>();
  const nodeIds = new Set(graph.nodes.map(n => n.id));

  // Initialize uniform
  for (const node of graph.nodes) {
    scores.set(node.id, 1 / N);
  }

  // Build adjacency: for each node, what edges point TO it?
  const incomingEdges = new Map<string, { fromId: string; weight: number }[]>();
  const outDegree = new Map<string, number>();

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue;
    const edgeWeight = (edge.weight ?? 1) * (EDGE_TYPE_WEIGHTS[edge.type] ?? 0.5);

    if (!incomingEdges.has(edge.toNodeId)) incomingEdges.set(edge.toNodeId, []);
    incomingEdges.get(edge.toNodeId)!.push({ fromId: edge.fromNodeId, weight: edgeWeight });

    outDegree.set(edge.fromNodeId, (outDegree.get(edge.fromNodeId) ?? 0) + 1);
  }

  // Iterate
  for (let i = 0; i < iterations; i++) {
    const next = new Map<string, number>();

    for (const node of graph.nodes) {
      let sum = 0;
      const incoming = incomingEdges.get(node.id) ?? [];
      for (const { fromId, weight } of incoming) {
        const fromScore = scores.get(fromId) ?? 0;
        const fromOutDeg = outDegree.get(fromId) ?? 1;
        sum += (fromScore / fromOutDeg) * weight;
      }
      next.set(node.id, (1 - damping) / N + damping * sum);
    }

    // Normalize to sum to 1
    let total = 0;
    next.forEach(v => total += v);
    if (total > 0) next.forEach((v, k) => next.set(k, v / total));

    scores.clear();
    next.forEach((v, k) => scores.set(k, v));
  }

  return scores;
}
