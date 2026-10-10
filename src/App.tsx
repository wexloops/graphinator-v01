import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { ConceptNode, type ConceptFlowNode } from './components/ConceptNode';
import { Inspector } from './components/Inspector';
import { FloatingEdge } from './components/FloatingEdge';
import { KeyDialog } from './components/KeyDialog';
import { KINDS, KIND_INFO, type GEdge, type GNode, type Graph, type GraphKind } from './shared/schema';
import { api, readSource, type Source } from './lib/api';
import { layout } from './lib/layout';
import { groupHues } from './lib/hues';
import { download, fromJson, slug, toJson, toMarkdown, toMermaid } from './lib/exporters';
import { loadLibrary, newId, removeFromLibrary, saveToLibrary, type Saved } from './lib/storage';
import { DEMO } from './lib/demo';

const nodeTypes = { concept: ConceptNode };
const edgeTypes = { floating: FloatingEdge };
const DEPTHS = [
  { v: 1, label: 'Small' },
  { v: 2, label: 'Medium' },
  { v: 3, label: 'Large' },
];
const EXAMPLES: { prompt: string; kind: GraphKind }[] = [
  { prompt: 'How a song becomes a hit', kind: 'concept' },
  { prompt: 'The history of cinema', kind: 'timeline' },
  { prompt: 'Should I learn Rust or Go?', kind: 'tree' },
  { prompt: 'How vaccines train the immune system', kind: 'flow' },
  { prompt: 'Everything connected to recursion', kind: 'mind' },
];

export default function App() {
  return (
    <ReactFlowProvider>
      <Studio />
    </ReactFlowProvider>
  );
}

function Studio() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [docId, setDocId] = useState<string>(newId());
  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [keyInfo, setKeyInfo] = useState<{ key: string; canSetKey: boolean }>({ key: 'unchecked', canSetKey: true });
  const [keyOpen, setKeyOpen] = useState(false);
  const [library, setLibrary] = useState<Saved[]>(loadLibrary);
  const [libOpen, setLibOpen] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<GraphKind>('concept');
  const [depth, setDepth] = useState(2);
  const [sources, setSources] = useState<Source[]>([]);
  const [refineText, setRefineText] = useState('');
  const abort = useRef<AbortController | null>(null);
  const flow = useReactFlow();
  const fileIn = useRef<HTMLInputElement>(null);
  const openIn = useRef<HTMLInputElement>(null);

  const refreshStatus = useCallback(
    () =>
      api.status().then((s) => {
        setReady(s.ready);
        setKeyInfo({ key: s.key, canSetKey: s.canSetKey });
        return s;
      }),
    [],
  );
  useEffect(() => void refreshStatus(), [refreshStatus]);

  const hues = useMemo(() => groupHues(graph?.groups ?? []), [graph?.groups]);
  const vertical = graph ? graph.kind === 'flow' || graph.kind === 'tree' : true;

  // Neighborhood of the selection, for dimming everything else.
  const lit = useMemo(() => {
    if (!graph) return null;
    if (focusGroup) return new Set(graph.nodes.filter((n) => n.group === focusGroup).map((n) => n.id));
    if (!selected) return null;
    const s = new Set([selected]);
    for (const e of graph.edges) {
      if (e.source === selected) s.add(e.target);
      if (e.target === selected) s.add(e.source);
    }
    return s;
  }, [graph, selected, focusGroup]);

  /** Push a graph onto the canvas: lay it out, keep positions of nodes that already exist when asked. */
  const show = useCallback(
    async (g: Graph, opts: { keep?: Record<string, { x: number; y: number }>; fit?: boolean } = {}) => {
      const pos = opts.keep && g.nodes.every((n) => opts.keep![n.id]) ? new Map(Object.entries(opts.keep)) : await layout(g.kind, g.nodes, g.edges);
      setGraph(g);
      setNodes(
        g.nodes.map((n) => ({
          id: n.id,
          type: 'concept',
          position: pos.get(n.id) ?? { x: 0, y: 0 },
          data: { node: n, hue: '#ECE8DF', dim: false, vertical: g.kind === 'flow' || g.kind === 'tree' },
        })),
      );
      setEdges(g.edges.map(edgeFor(g)));
      if (opts.fit !== false) requestAnimationFrame(() => flow.fitView({ padding: { top: 0.12, left: 0.12, right: 0.12, bottom: '160px' }, duration: 600 }));
    },
    [flow, setEdges, setNodes],
  );

  // Restyle nodes and edges when selection, focus or hues change, without re-laying out.
  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) => {
        const gn = graph?.nodes.find((x) => x.id === n.id);
        if (!gn) return n;
        return { ...n, data: { ...n.data, node: gn, hue: hues.get(gn.group) ?? '#ECE8DF', dim: !!lit && !lit.has(n.id), vertical } };
      }),
    );
    setEdges((es) =>
      es.map((e) => {
        const on = !lit || (lit.has(e.source) && lit.has(e.target));
        const src = graph?.nodes.find((n) => n.id === e.source);
        const hue = hues.get(src?.group ?? '') ?? '#ECE8DF';
        return {
          ...e,
          animated: !!selected && (e.source === selected || e.target === selected),
          style: { stroke: hue, strokeOpacity: on ? 0.55 : 0.08, strokeWidth: 1.5 },
          labelStyle: { fill: on ? '#a9a59d' : 'transparent' },
          labelBgStyle: { fill: on ? '#000' : 'transparent' },
          markerEnd: { type: MarkerType.ArrowClosed, color: hue, width: 14, height: 14 },
        };
      }),
    );
  }, [graph, hues, lit, selected, vertical, setNodes, setEdges]);

  // Autosave to the local library.
  useEffect(() => {
    if (!graph) return;
    const t = setTimeout(() => {
      const positions = Object.fromEntries(flow.getNodes().map((n) => [n.id, n.position]));
      setLibrary(saveToLibrary({ id: docId, updated: Date.now(), graph, positions }));
    }, 800);
    return () => clearTimeout(t);
  }, [graph, nodes, docId, flow]);

  async function run<T>(label: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(label);
    setError(null);
    try {
      return await fn(ctl.signal);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
        if (/key/i.test((err as Error).message)) void refreshStatus().then((s) => s.key !== 'valid' && setKeyOpen(true));
      }
    } finally {
      if (abort.current === ctl) setBusy(null);
    }
  }

  async function generate(p = prompt, k = kind) {
    if (!p.trim() && !sources.length) return;
    const g = await run('generate', (signal) => api.generate({ prompt: p, kind: k, depth, sources }, signal));
    if (!g) return;
    setDocId(newId());
    setSelected(null);
    setExplanations({});
    await show(g);
  }

  async function refine() {
    if (!graph || !refineText.trim()) return;
    const g = await run('refine', (signal) => api.refine({ graph, instruction: refineText }, signal));
    if (!g) return;
    setRefineText('');
    await show(g);
  }

  async function expand(nodeId: string, focus: string) {
    if (!graph) return;
    const x = await run('expand', (signal) => api.expand({ graph, nodeId, instruction: focus || undefined }, signal));
    if (!x || !x.nodes.length) return;
    const groups = [...graph.groups, ...x.groups.filter((g) => !graph.groups.some((o) => o.name === g.name))];
    // New nodes with an unknown group join the parent's group.
    const parent = graph.nodes.find((n) => n.id === nodeId)!;
    const added = x.nodes.map((n) => (groups.some((g) => g.name === n.group) ? n : { ...n, group: parent.group }));
    await show({ ...graph, groups, nodes: [...graph.nodes, ...added], edges: [...graph.edges, ...x.edges] }, { fit: false });
    requestAnimationFrame(() => flow.fitView({ nodes: [{ id: nodeId }, ...added.map((n) => ({ id: n.id }))], padding: 0.3, duration: 600 }));
  }

  async function explain(nodeId: string) {
    if (!graph) return;
    const r = await run('explain', (signal) => api.explain({ graph, nodeId }, signal));
    if (r) setExplanations((e) => ({ ...e, [nodeId]: r.text }));
  }

  function patchNode(id: string, patch: Partial<GNode>) {
    if (!graph) return;
    setGraph({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  }

  function deleteNode(id: string) {
    if (!graph) return;
    setSelected(null);
    const g = { ...graph, nodes: graph.nodes.filter((n) => n.id !== id), edges: graph.edges.filter((e) => e.source !== id && e.target !== id) };
    setGraph(g);
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges(g.edges.map(edgeFor(g)));
  }

  function onConnect(c: Connection) {
    if (!graph || !c.source || !c.target || c.source === c.target) return;
    const e: GEdge = { source: c.source, target: c.target, label: '' };
    const g = { ...graph, edges: [...graph.edges, e] };
    setGraph(g);
    setEdges(g.edges.map(edgeFor(g)));
  }

  async function relayout(k: GraphKind = graph?.kind ?? 'concept') {
    if (!graph) return;
    await show({ ...graph, kind: k });
  }

  async function exportImage(type: 'png' | 'svg') {
    if (!graph) return;
    const el = document.querySelector<HTMLElement>('.react-flow__viewport');
    if (!el) return;
    const bounds = getNodesBounds(flow.getNodes());
    const W = Math.min(4096, Math.max(1600, bounds.width + 240));
    const H = Math.round((W * (bounds.height + 240)) / (bounds.width + 240));
    const vp = getViewportForBounds(bounds, W, H, 0.1, 4, 0.08);
    const opts = { backgroundColor: '#000', width: W, height: H, style: { width: `${W}px`, height: `${H}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` } };
    const url = type === 'png' ? await toPng(el, { ...opts, pixelRatio: 2 }) : await toSvg(el, opts);
    download(await (await fetch(url)).blob(), `${slug(graph.title)}.${type}`);
  }

  async function openFile(f: File) {
    try {
      const g = fromJson(await f.text());
      setDocId(newId());
      setSelected(null);
      await show(g);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function openSaved(s: Saved) {
    setDocId(s.id);
    setSelected(null);
    setExplanations({});
    await show(s.graph, { keep: s.positions });
    setLibOpen(false);
  }

  async function addFiles(files: FileList | File[]) {
    const read = await Promise.all(Array.from(files).map(readSource));
    setSources((s) => [...s, ...read]);
  }

  // Keyboard: Escape clears, Delete removes the selected node.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === 'Escape') {
        setSelected(null);
        setFocusGroup(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) deleteNode(selected);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selNode = graph?.nodes.find((n) => n.id === selected);

  return (
    <div
      className={`app${graph ? ' has-graph' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const json = files.find((f) => f.name.endsWith('.json'));
        if (json) void openFile(json);
        else if (files.length) void addFiles(files);
      }}
    >
      <header className="topbar">
        <button className="wordmark" onClick={() => (setGraph(null), setSelected(null))} title="New graph">
          GRAPHINATOR
        </button>
        {graph && (
          <div className="doc-title">
            <strong>{graph.title}</strong>
            <span>{graph.summary}</span>
          </div>
        )}
        <div className="top-actions">
          <button className={`btn btn-quiet key-btn key-${keyInfo.key}`} onClick={() => setKeyOpen(true)} title="Anthropic API key">
            <i aria-hidden /> API key
          </button>
          <button className="btn btn-quiet" onClick={() => setLibOpen((v) => !v)}>
            Library <b className="count">{library.length}</b>
          </button>
          <button className="btn btn-quiet" onClick={() => openIn.current?.click()}>
            Open
          </button>
          {graph && <ExportMenu onPick={(f) => (f === 'png' || f === 'svg' ? void exportImage(f) : download(f === 'json' ? toJson(graph) : f === 'md' ? toMarkdown(graph) : toMermaid(graph), `${slug(graph.title)}.${f === 'md' ? 'md' : f === 'mmd' ? 'mmd' : 'json'}`))} />}
        </div>
        <input ref={openIn} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void openFile(e.target.files[0])} />
      </header>

      <main className="stage">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => (setSelected(n.id), setFocusGroup(null))}
          onPaneClick={() => (setSelected(null), setFocusGroup(null))}
          minZoom={0.15}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="#2a2826" />
          {graph && <Controls showInteractive={false} position="bottom-right" />}
          {graph && <MiniMap pannable zoomable position="bottom-left" style={{ marginBottom: 24 }} nodeColor={(n) => (n.data as ConceptFlowNode['data']).hue} maskColor="rgba(0,0,0,0.7)" />}
        </ReactFlow>

        {!graph && (
          <section className="empty">
            <h1>
              Turn any idea
              <br />
              into a graph.
            </h1>
            <p>Type a concept, a question or a process. Drop in a document. Graphinator maps it, and you keep exploring from any node.</p>
            <div className="examples">
              {EXAMPLES.map((x) => (
                <button key={x.prompt} className="chip" onClick={() => (setPrompt(x.prompt), setKind(x.kind), void generate(x.prompt, x.kind))} disabled={!ready || !!busy}>
                  <i>{KIND_INFO[x.kind].label}</i> {x.prompt}
                </button>
              ))}
              <button className="chip chip-demo" onClick={() => (setDocId(newId()), void show(DEMO))}>
                See an example
              </button>
            </div>
            {ready === false && (
              <p className="setup">
                {keyInfo.key === 'invalid' ? 'Your Anthropic API key was rejected.' : 'Add an Anthropic API key to map your own ideas.'}{' '}
                <button className="link" onClick={() => setKeyOpen(true)}>
                  {keyInfo.key === 'invalid' ? 'Replace the key' : 'Add a key'}
                </button>
                . The example works without one.
              </p>
            )}
          </section>
        )}

        {graph && graph.groups.length > 0 && (
          <div className="legend" role="group" aria-label="Groups">
            {graph.groups.map((g) => (
              <button
                key={g.name}
                className="legend-item"
                aria-pressed={focusGroup === g.name}
                title={g.description}
                style={{ ['--hue' as string]: hues.get(g.name) }}
                onClick={() => (setFocusGroup((f) => (f === g.name ? null : g.name)), setSelected(null))}
              >
                <i />
                {g.name}
              </button>
            ))}
          </div>
        )}

        {graph && selNode && (
          <Inspector
            graph={graph}
            node={selNode}
            hue={hues.get(selNode.group) ?? '#ECE8DF'}
            busy={busy}
            explanation={explanations[selNode.id]}
            onChange={(p) => patchNode(selNode.id, p)}
            onExpand={(f) => void expand(selNode.id, f)}
            onExplain={() => void explain(selNode.id)}
            onDelete={() => deleteNode(selNode.id)}
            onSelect={(id) => {
              setSelected(id);
              const n = flow.getNode(id);
              if (n) flow.setCenter(n.position.x + 80, n.position.y + 24, { zoom: flow.getZoom(), duration: 500 });
            }}
            onClose={() => setSelected(null)}
          />
        )}

        {libOpen && (
          <aside className="library" aria-label="Library">
            <h2>Library</h2>
            {library.length === 0 && <p className="muted">Graphs you make are saved here, on this computer.</p>}
            <ul>
              {library.map((s) => (
                <li key={s.id} className={s.id === docId ? 'current' : ''}>
                  <button className="lib-open" onClick={() => void openSaved(s)}>
                    <strong>{s.graph.title}</strong>
                    <span>
                      {KIND_INFO[s.graph.kind]?.label} · {s.graph.nodes.length} nodes · {new Date(s.updated).toLocaleDateString()}
                    </span>
                  </button>
                  <button className="icon-btn" aria-label={`Delete ${s.graph.title}`} onClick={() => setLibrary(removeFromLibrary(s.id))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>

      {keyOpen && (
        <KeyDialog
          state={keyInfo.key}
          canSetKey={keyInfo.canSetKey}
          onSaved={() => {
            setKeyOpen(false);
            setError(null);
            void refreshStatus();
          }}
          onClose={() => setKeyOpen(false)}
        />
      )}

      <footer className={`composer${graph ? ' docked' : ''}`}>
        {graph ? (
          <div className="composer-row">
            <input
              className="composer-input"
              placeholder="Change this graph: “add the economics”, “merge the two history branches”, “make it simpler”…"
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void refine()}
              disabled={!!busy || !ready}
            />
            <button className="btn btn-solid" onClick={() => void refine()} disabled={!!busy || !ready || !refineText.trim()}>
              {busy === 'refine' ? 'Reworking…' : 'Change'}
            </button>
            <div className="seg" role="group" aria-label="Layout">
              {KINDS.map((k) => (
                <button key={k} aria-pressed={graph.kind === k} onClick={() => void relayout(k)} title={`Lay out as ${KIND_INFO[k].label.toLowerCase()}`}>
                  {KIND_INFO[k].label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="composer-row">
              <textarea
                className="composer-input big"
                rows={2}
                placeholder="What should we map?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void generate())}
                autoFocus
              />
              <button className="btn btn-solid btn-go" onClick={() => void generate()} disabled={!!busy || !ready || (!prompt.trim() && !sources.length)}>
                {busy === 'generate' ? 'Mapping…' : 'Map it'}
              </button>
            </div>
            <div className="composer-row small">
              <div className="seg" role="group" aria-label="Graph kind">
                {KINDS.map((k) => (
                  <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} title={KIND_INFO[k].hint}>
                    {KIND_INFO[k].label}
                  </button>
                ))}
              </div>
              <div className="seg" role="group" aria-label="Size">
                {DEPTHS.map((d) => (
                  <button key={d.v} aria-pressed={depth === d.v} onClick={() => setDepth(d.v)}>
                    {d.label}
                  </button>
                ))}
              </div>
              <button className="btn btn-quiet" onClick={() => fileIn.current?.click()}>
                + Document
              </button>
              {sources.map((s, i) => (
                <span key={i} className="source-chip">
                  {s.name}
                  <button aria-label={`Remove ${s.name}`} onClick={() => setSources((x) => x.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </span>
              ))}
              <input ref={fileIn} type="file" multiple hidden accept=".txt,.md,.markdown,.csv,.json,.html,.pdf,text/*,application/pdf" onChange={(e) => e.target.files && void addFiles(e.target.files)} />
            </div>
          </>
        )}
        {busy && <div className="progress" aria-hidden />}
        {error && (
          <p className="error" role="alert">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              ×
            </button>
          </p>
        )}
      </footer>
    </div>
  );
}

function edgeFor(g: Graph) {
  const orth = g.kind === 'flow' || g.kind === 'tree';
  const floating = g.kind === 'concept' || g.kind === 'mind';
  return (e: GEdge, i: number): Edge => ({
    id: `${e.source}>${e.target}>${i}`,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    type: floating ? 'floating' : orth ? 'smoothstep' : 'default',
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4,
  });
}

function ExportMenu({ onPick }: { onPick(f: 'png' | 'svg' | 'json' | 'md' | 'mmd'): void }) {
  const [open, setOpen] = useState(false);
  const items: [Parameters<typeof onPick>[0], string, string][] = [
    ['png', 'Image (PNG)', 'High resolution, black background'],
    ['svg', 'Vector (SVG)', 'For print and editing'],
    ['md', 'Outline (Markdown)', 'Notes, docs, Obsidian'],
    ['mmd', 'Mermaid', 'Paste into GitHub or Notion'],
    ['json', 'Graphinator file', 'Open again later'],
  ];
  return (
    <div className="menu" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button className="btn btn-line" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Export
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.map(([f, label, hint]) => (
            <button key={f} role="menuitem" onClick={() => (onPick(f), setOpen(false))}>
              <strong>{label}</strong>
              <span>{hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
