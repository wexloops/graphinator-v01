import { z } from 'zod';

export const KINDS = ['concept', 'mind', 'flow', 'tree', 'timeline'] as const;
export type GraphKind = (typeof KINDS)[number];

export const KIND_INFO: Record<GraphKind, { label: string; hint: string }> = {
  concept: { label: 'Concept map', hint: 'Ideas and how they relate, with cross-links.' },
  mind: { label: 'Mind map', hint: 'One central idea branching outward.' },
  flow: { label: 'Flowchart', hint: 'A process, step by step.' },
  tree: { label: 'Decision tree', hint: 'Questions that branch into outcomes.' },
  timeline: { label: 'Timeline', hint: 'Events in order.' },
};

export const ROLES = ['core', 'concept', 'process', 'decision', 'outcome', 'example', 'person', 'place', 'event', 'question', 'source'] as const;

export const NodeSchema = z.object({
  id: z.string().describe('Short unique kebab-case id, stable across edits'),
  label: z.string().describe('2 to 5 words'),
  role: z.enum(ROLES),
  group: z.string().describe('Name of the cluster this node belongs to; must match a group name'),
  detail: z.string().describe('One or two plain sentences explaining the node'),
});

export const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().describe('Short verb phrase, 1 to 3 words, or empty'),
});

export const GraphSchema = z.object({
  title: z.string(),
  summary: z.string().describe('One sentence describing what the graph shows'),
  groups: z.array(z.object({ name: z.string(), description: z.string() })),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export const ExpansionSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  groups: z.array(z.object({ name: z.string(), description: z.string() })).describe('Only groups that are new'),
});

export type GNode = z.infer<typeof NodeSchema>;
export type GEdge = z.infer<typeof EdgeSchema>;
export type Graph = z.infer<typeof GraphSchema> & { kind: GraphKind };
export type Expansion = z.infer<typeof ExpansionSchema>;

/** Drop edges that point at missing nodes, duplicate ids, and self-loops. Models occasionally emit them. */
export function sanitize<T extends { nodes: GNode[]; edges: GEdge[] }>(g: T, existingIds: Set<string> = new Set()): T {
  const seen = new Set<string>();
  const nodes = g.nodes.filter((n) => n.id && !seen.has(n.id) && !existingIds.has(n.id) && seen.add(n.id));
  const ids = new Set([...existingIds, ...seen]);
  const edgeKeys = new Set<string>();
  const edges = g.edges.filter((e) => {
    const k = `${e.source}>${e.target}`;
    if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target) || edgeKeys.has(k)) return false;
    edgeKeys.add(k);
    return true;
  });
  return { ...g, nodes, edges };
}
