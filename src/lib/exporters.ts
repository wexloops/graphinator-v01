import type { Graph } from '../shared/schema';
import { findRoot } from './layout';

/** Indented outline: depth-first from the root, then any unreached nodes. */
export function toMarkdown(g: Graph): string {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const kids = new Map<string, { id: string; label: string }[]>();
  for (const e of g.edges) kids.set(e.source, [...(kids.get(e.source) ?? []), { id: e.target, label: e.label }]);
  const seen = new Set<string>();
  const lines = [`# ${g.title}`, '', g.summary, ''];
  const walk = (id: string, depth: number, via: string) => {
    const n = byId.get(id);
    if (!n || seen.has(id)) return;
    seen.add(id);
    lines.push(`${'  '.repeat(depth)}- **${n.label}**${via ? ` _(${via})_` : ''}: ${n.detail}`);
    for (const k of kids.get(id) ?? []) walk(k.id, depth + 1, k.label);
  };
  const root = findRoot(g.nodes, g.edges);
  if (root) walk(root, 0, '');
  for (const n of g.nodes) walk(n.id, 0, '');
  return lines.join('\n') + '\n';
}

const mid = (id: string) => 'n_' + id.replace(/[^A-Za-z0-9_]/g, '_');
const mtext = (s: string) => s.replace(/"/g, "'").replace(/[\[\]{}|<>]/g, ' ');

/** Mermaid flowchart, with one subgraph per group. */
export function toMermaid(g: Graph): string {
  const dir = g.kind === 'timeline' ? 'LR' : 'TD';
  const out = [`flowchart ${dir}`];
  for (const grp of g.groups) {
    const members = g.nodes.filter((n) => n.group === grp.name);
    if (!members.length) continue;
    out.push(`  subgraph ${mid(grp.name)}["${mtext(grp.name)}"]`);
    for (const n of members) out.push(`    ${mid(n.id)}${n.role === 'decision' || n.role === 'question' ? `{"${mtext(n.label)}"}` : `["${mtext(n.label)}"]`}`);
    out.push('  end');
  }
  for (const n of g.nodes.filter((n) => !g.groups.some((x) => x.name === n.group))) out.push(`  ${mid(n.id)}["${mtext(n.label)}"]`);
  for (const e of g.edges) out.push(`  ${mid(e.source)} -->${e.label ? `|${mtext(e.label)}|` : ''} ${mid(e.target)}`);
  return out.join('\n') + '\n';
}

export function toJson(g: Graph): string {
  return JSON.stringify({ format: 'graphinator', version: 3, graph: g }, null, 2);
}

/** Accepts v3 files and bare graphs. */
export function fromJson(text: string): Graph {
  const data = JSON.parse(text);
  const g = data?.format === 'graphinator' ? data.graph : data;
  if (!Array.isArray(g?.nodes) || !Array.isArray(g?.edges)) throw new Error('Not a Graphinator file.');
  return { kind: 'concept', groups: [], title: 'Untitled', summary: '', ...g };
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'graph';
}

export function download(content: Blob | string, name: string, type = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
