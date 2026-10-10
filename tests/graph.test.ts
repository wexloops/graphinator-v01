import { describe, expect, it } from 'vitest';
import { DEMO } from '../src/lib/demo';
import { fromJson, toJson, toMarkdown, toMermaid } from '../src/lib/exporters';
import { findRoot, layout } from '../src/lib/layout';
import { GraphSchema, KINDS, sanitize } from '../src/shared/schema';

describe('schema', () => {
  it('demo graph is valid', () => {
    expect(() => GraphSchema.parse(DEMO)).not.toThrow();
  });
  it('sanitize drops dangling edges, self loops, duplicates and clashing ids', () => {
    const n = (id: string) => ({ id, label: id, role: 'concept' as const, group: 'g', detail: '' });
    const out = sanitize(
      { nodes: [n('a'), n('b'), n('b'), n('old')], edges: [{ source: 'a', target: 'b', label: '' }, { source: 'a', target: 'b', label: 'dup' }, { source: 'a', target: 'a', label: '' }, { source: 'a', target: 'ghost', label: '' }, { source: 'b', target: 'old', label: '' }] },
      new Set(['old']),
    );
    expect(out.nodes.map((x) => x.id)).toEqual(['a', 'b']);
    expect(out.edges).toEqual([{ source: 'a', target: 'b', label: '' }, { source: 'b', target: 'old', label: '' }]);
  });
});

describe('layout', () => {
  for (const kind of KINDS) {
    it(`${kind} places every node without overlap at the same spot`, async () => {
      const pos = await layout(kind, DEMO.nodes, DEMO.edges);
      expect(pos.size).toBe(DEMO.nodes.length);
      const keys = new Set([...pos.values()].map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
      expect(keys.size).toBe(DEMO.nodes.length);
    });
  }
  it('finds the core node as root', () => {
    expect(findRoot(DEMO.nodes, DEMO.edges)).toBe('synesthesia');
  });
});

describe('exporters', () => {
  it('json round trips', () => {
    expect(fromJson(toJson(DEMO))).toEqual(DEMO);
  });
  it('markdown covers every node once', () => {
    const md = toMarkdown(DEMO);
    for (const n of DEMO.nodes) expect(md.split(`**${n.label}**`).length - 1).toBe(1);
  });
  it('mermaid declares every edge', () => {
    const mm = toMermaid(DEMO);
    expect(mm.startsWith('flowchart TD')).toBe(true);
    expect((mm.match(/-->/g) ?? []).length).toBe(DEMO.edges.length);
  });
});

describe('separate', () => {
  it('leaves no overlapping cards in concept layouts', async () => {
    const { nodeSize, separate } = await import('../src/lib/layout');
    const pos = new Map([['a', { x: 0, y: 0 }], ['b', { x: 10, y: 5 }], ['c', { x: 20, y: 10 }]]);
    const n = (id: string) => ({ id, label: 'Some label here', role: 'concept' as const, group: 'g', detail: '' });
    const size = new Map(['a', 'b', 'c'].map((id) => [id, nodeSize(n(id))]));
    separate(pos, size);
    const ids = ['a', 'b', 'c'];
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        const A = pos.get(ids[i])!, B = pos.get(ids[j])!, S = size.get('a')!;
        const overlap = Math.min(A.x + S.width, B.x + S.width) - Math.max(A.x, B.x) > 0 && Math.min(A.y + S.height, B.y + S.height) - Math.max(A.y, B.y) > 0;
        expect(overlap).toBe(false);
      }
  });
});
