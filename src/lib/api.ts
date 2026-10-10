import type { Expansion, Graph, GraphKind } from '../shared/schema';

export type Source = { name: string; type: string; data: string };

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  const json = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`);
  return json as T;
}

export const api = {
  status: () =>
    fetch('/api/status')
      .then((r) => r.json() as Promise<{ ready: boolean; key: string; model: string; canSetKey: boolean }>)
      .catch(() => ({ ready: false, key: 'unchecked', model: '', canSetKey: false })),
  generate: (b: { prompt: string; kind: GraphKind; depth: number; sources?: Source[] }, signal?: AbortSignal) => post<Graph>('/api/generate', b, signal),
  refine: (b: { graph: Graph; instruction: string }, signal?: AbortSignal) => post<Graph>('/api/refine', b, signal),
  expand: (b: { graph: Graph; nodeId: string; instruction?: string }, signal?: AbortSignal) => post<Expansion>('/api/expand', b, signal),
  explain: (b: { graph: Graph; nodeId: string }, signal?: AbortSignal) => post<{ text: string }>('/api/explain', b, signal),
};

/** Read a dropped or chosen file as a source document. PDFs go as base64, everything else as text. */
export async function readSource(file: File): Promise<Source> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { name: file.name, type: 'application/pdf', data: btoa(bin) };
  }
  return { name: file.name, type: 'text/plain', data: await file.text() };
}
