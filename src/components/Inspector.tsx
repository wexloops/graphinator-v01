import { useEffect, useState } from 'react';
import { ROLES, type Graph, type GNode } from '../shared/schema';

type Props = {
  graph: Graph;
  node: GNode;
  hue: string;
  busy: string | null;
  explanation?: string;
  onChange(patch: Partial<GNode>): void;
  onExpand(focus: string): void;
  onExplain(): void;
  onDelete(): void;
  onSelect(id: string): void;
  onClose(): void;
};

export function Inspector({ graph, node, hue, busy, explanation, onChange, onExpand, onExplain, onDelete, onSelect, onClose }: Props) {
  const [focus, setFocus] = useState('');
  useEffect(() => setFocus(''), [node.id]);
  const label = new Map(graph.nodes.map((n) => [n.id, n.label]));
  const links = graph.edges.filter((e) => e.source === node.id || e.target === node.id);

  return (
    <aside className="inspector" style={{ ['--hue' as string]: hue }} aria-label="Selected node">
      <div className="insp-head">
        <span className="insp-group">{node.group}</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <input className="insp-title" value={node.label} onChange={(e) => onChange({ label: e.target.value })} aria-label="Label" />
      <label className="insp-row">
        <span>Role</span>
        <select value={node.role} onChange={(e) => onChange({ role: e.target.value as GNode['role'] })}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label className="insp-row">
        <span>Group</span>
        <select value={node.group} onChange={(e) => onChange({ group: e.target.value })}>
          {graph.groups.map((g) => (
            <option key={g.name}>{g.name}</option>
          ))}
        </select>
      </label>
      <textarea className="insp-detail" value={node.detail} rows={4} onChange={(e) => onChange({ detail: e.target.value })} aria-label="Detail" />

      <div className="insp-actions">
        <input className="insp-focus" placeholder="Expand toward… (optional)" value={focus} onChange={(e) => setFocus(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onExpand(focus)} />
        <button className="btn btn-hue" disabled={!!busy} onClick={() => onExpand(focus)}>
          {busy === 'expand' ? 'Growing…' : 'Expand'}
        </button>
        <button className="btn btn-line" disabled={!!busy} onClick={onExplain}>
          {busy === 'explain' ? 'Thinking…' : 'Explain'}
        </button>
        <button className="btn btn-quiet danger" onClick={onDelete}>
          Delete
        </button>
      </div>

      {explanation && (
        <div className="insp-explain">
          {explanation.split(/\n\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="insp-links">
          <h3>Connections</h3>
          <ul>
            {links.map((e, i) => {
              const out = e.source === node.id;
              const other = out ? e.target : e.source;
              return (
                <li key={i}>
                  <button onClick={() => onSelect(other)}>
                    <span className="dir">{out ? '→' : '←'}</span>
                    <i>{e.label || (out ? 'to' : 'from')}</i> {label.get(other)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
