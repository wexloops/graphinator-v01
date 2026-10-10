import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { GraphKind, GNode, GEdge } from '../shared/schema';

const elk = new ELK();

/** Rough rendered size of a node card, so layout leaves room for long labels. */
export function nodeSize(n: GNode): { width: number; height: number } {
  const core = n.role === 'core';
  const chars = n.label.length;
  const width = Math.min(core ? 320 : 260, Math.max(core ? 180 : 130, chars * (core ? 12.5 : 8.6) + 56));
  const lines = Math.ceil((chars * (core ? 12.5 : 8.6)) / (width - 56));
  return { width, height: (core ? 64 : 48) + Math.max(0, lines - 1) * (core ? 26 : 19) };
}

const OPTIONS: Record<GraphKind, Record<string, string>> = {
  flow: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.layered.spacing.nodeNodeBetweenLayers': '70',
    'elk.spacing.nodeNode': '40',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.edgeRouting': 'ORTHOGONAL',
  },
  tree: {
    'elk.algorithm': 'mrtree',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '46',
    'elk.mrtree.weighting': 'CONSTRAINT',
  },
  timeline: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.layered.spacing.nodeNodeBetweenLayers': '60',
    'elk.spacing.nodeNode': '36',
  },
  mind: {
    'elk.algorithm': 'radial',
    'elk.radial.radius': '260',
    'elk.spacing.nodeNode': '30',
    'elk.radial.compactor': 'WEDGE_COMPACTION',
  },
  concept: {
    'elk.algorithm': 'stress',
    'elk.stress.desiredEdgeLength': '170',
    'elk.spacing.nodeNode': '40',
  },
};

/** Pick a root for tree-shaped layouts: the core node, else the node nothing points to with the most children. */
export function findRoot(nodes: GNode[], edges: GEdge[]): string | undefined {
  const core = nodes.find((n) => n.role === 'core');
  if (core) return core.id;
  const hasParent = new Set(edges.map((e) => e.target));
  const out = new Map<string, number>();
  for (const e of edges) out.set(e.source, (out.get(e.source) ?? 0) + 1);
  return nodes.filter((n) => !hasParent.has(n.id)).sort((a, b) => (out.get(b.id) ?? 0) - (out.get(a.id) ?? 0))[0]?.id ?? nodes[0]?.id;
}

/** For tree layouts, keep a spanning tree (BFS from the root) so ELK's tree algorithms accept the graph. */
function spanningEdges(nodes: GNode[], edges: GEdge[], root: string | undefined): GEdge[] {
  if (!root) return edges;
  const adj = new Map<string, GEdge[]>();
  for (const e of edges) {
    adj.set(e.source, [...(adj.get(e.source) ?? []), e]);
    adj.set(e.target, [...(adj.get(e.target) ?? []), { ...e, source: e.target, target: e.source }]);
  }
  const seen = new Set([root]);
  const out: GEdge[] = [];
  const queue = [root];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of adj.get(id) ?? []) {
      if (seen.has(e.target)) continue;
      seen.add(e.target);
      out.push(e);
      queue.push(e.target);
    }
  }
  // Disconnected nodes hang off the root so nothing is lost.
  for (const n of nodes) if (!seen.has(n.id)) out.push({ source: root, target: n.id, label: '' });
  return out;
}

export async function layout(kind: GraphKind, nodes: GNode[], edges: GEdge[]): Promise<Map<string, { x: number; y: number }>> {
  const root = findRoot(nodes, edges);
  const treeish = kind === 'mind' || kind === 'tree';
  const useEdges = treeish ? spanningEdges(nodes, edges, root) : edges;
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: { ...OPTIONS[kind], ...(kind === 'mind' && root ? { 'elk.radial.centerOnRoot': 'true' } : {}) },
    children: nodes.map((n): ElkNode => ({ id: n.id, ...nodeSize(n), ...(n.id === root && kind === 'mind' ? { layoutOptions: { 'elk.radial.rootNode': 'true' } } : {}) })),
    edges: useEdges.map((e, i) => ({ id: `e${i}`, sources: [e.source], targets: [e.target] })),
  };
  const out = await elk.layout(graph);
  const pos = new Map((out.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
  // Force-style layouts can stack cards on top of each other; nudge them apart.
  if (kind === 'concept' || kind === 'mind') separate(pos, new Map(nodes.map((n) => [n.id, nodeSize(n)])));
  return pos;
}

/** Push overlapping rectangles apart along the axis of least overlap until none overlap (or we give up). */
export function separate(pos: Map<string, { x: number; y: number }>, size: Map<string, { width: number; height: number }>, gap = 28, rounds = 80): void {
  const ids = [...pos.keys()];
  for (let r = 0; r < rounds; r++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        const sa = size.get(ids[i])!;
        const sb = size.get(ids[j])!;
        const ox = Math.min(a.x + sa.width, b.x + sb.width) - Math.max(a.x, b.x) + gap;
        const oy = Math.min(a.y + sa.height, b.y + sb.height) - Math.max(a.y, b.y) + gap;
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        const acx = a.x + sa.width / 2;
        const bcx = b.x + sb.width / 2;
        const acy = a.y + sa.height / 2;
        const bcy = b.y + sb.height / 2;
        if (ox < oy) {
          const d = (ox / 2) * (acx <= bcx ? 1 : -1);
          a.x -= d;
          b.x += d;
        } else {
          const d = (oy / 2) * (acy <= bcy ? 1 : -1);
          a.y -= d;
          b.y += d;
        }
      }
    }
    if (!moved) return;
  }
}
