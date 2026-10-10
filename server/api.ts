/**
 * Server half of Graphinator. Runs inside the Vite dev/preview server, so the API key
 * stays in Node and never reaches the browser.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { ExpansionSchema, GraphSchema, KIND_INFO, type Graph, type GraphKind, KINDS, sanitize } from '../src/shared/schema';

const MODEL = process.env.GRAPHINATOR_MODEL || 'claude-opus-5-5';
const MAX_SOURCE_CHARS = 400_000;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** Whether the configured key works. Checked lazily against the free models endpoint, then cached. */
type KeyState = 'missing' | 'unchecked' | 'valid' | 'invalid';
let keyState: KeyState = 'unchecked';

async function checkKey(): Promise<KeyState> {
  if (!hasCredentials()) return (keyState = 'missing');
  if (keyState === 'valid' || keyState === 'invalid') return keyState;
  try {
    await anthropic().models.list({ limit: 1 });
    return (keyState = 'valid');
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return (keyState = 'invalid');
    return 'unchecked'; // network trouble: try again next time
  }
}

/** Save a key entered in the app: verify it first, then write it to .env next to the app. */
async function saveKey(key: string): Promise<{ ok: true }> {
  key = key.trim();
  if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) throw new HttpError(400, 'That does not look like an Anthropic API key (it starts with sk-ant-).');
  try {
    await new Anthropic({ apiKey: key }).models.list({ limit: 1 });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) throw new HttpError(400, 'Anthropic rejected that key. Check it and try again.');
    throw new HttpError(502, 'Could not reach Anthropic to check the key. Check your connection.');
  }
  const file = resolve(process.cwd(), '.env');
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => !/^\s*ANTHROPIC_API_KEY\s*=/.test(l)) : [];
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  writeFileSync(file, [...lines, `ANTHROPIC_API_KEY=${key}`, ''].join('\n'), { mode: 0o600 });
  process.env.ANTHROPIC_API_KEY = key;
  client = null;
  keyState = 'valid';
  return { ok: true };
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Key changes only from a process on this machine (the socket address cannot be spoofed like the Host header). */
function isLocal(req: IncomingMessage): boolean {
  return LOOPBACK.has(req.socket.remoteAddress ?? '');
}

/**
 * Block cross-site requests, so a web page open in the same browser cannot spend credits or swap the key.
 * Browsers send Sec-Fetch-Site and Origin on cross-site POSTs; requiring a JSON content type also forces
 * a CORS preflight, which this server never approves.
 */
function sameOrigin(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return false;
    } catch {
      return false;
    }
  }
  return (req.headers['content-type'] ?? '').startsWith('application/json');
}

const SYSTEM = `You are Graphinator. You turn concepts, questions, and documents into clear, insightful graphs.

Principles:
- Labels are 2 to 5 words, specific and concrete. Never pad with filler like "Overview" or "Introduction".
- Every node earns its place: it names a distinct idea, step, actor, or outcome.
- Edges carry meaning. Label them with short verb phrases ("causes", "depends on", "yes", "leads to"). Use an empty label only where the relationship is obvious from the layout.
- Group nodes into 3 to 7 named clusters that reveal the structure of the subject.
- Detail is one or two plain sentences that teach something, written for a curious reader.
- Ids are short kebab-case and unique.

Graph kinds:
- concept: an interconnected concept map. One or two core nodes, then related ideas, with meaningful cross-links between branches (not just a tree).
- mind: a mind map. Exactly one node with role "core" at the center; every other node descends from it through branches. No cross-links.
- flow: a flowchart. Starts at one entry step, ends in outcomes. Use role "decision" for branch points with labeled exits.
- tree: a decision tree. The root is a question; "question"/"decision" nodes branch on labeled edges ("yes", "no", or the option) into "outcome" leaves.
- timeline: events in chronological order. Put the date or period first in each label ("1928: Penicillin"). Chain events with edges in order; add causal side-links where they matter.`;

const SIZE = (depth: number) => (depth <= 1 ? 'about 10 nodes' : depth === 2 ? 'about 20 nodes' : 'about 35 nodes');

type Source = { name: string; type: string; data: string };

/** One schema-constrained call. Fallbacks re-run the request on another model if this one declines. */
async function structured<S extends z.ZodType>(schema: S, content: Anthropic.Beta.BetaContentBlockParam[], effort: 'low' | 'medium' | 'high'): Promise<z.infer<S>> {
  const res = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: zodOutputFormat(schema) },
    messages: [{ role: 'user', content }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (res.stop_reason === 'refusal') throw new HttpError(422, 'The model declined to map this. Try rephrasing.');
  if (res.stop_reason === 'max_tokens') throw new HttpError(502, 'The graph was too large to finish. Try a smaller depth.');
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return schema.parse(JSON.parse(text));
}

function sourceBlocks(sources: Source[] = []): Anthropic.Beta.BetaContentBlockParam[] {
  return sources.map((s): Anthropic.Beta.BetaContentBlockParam => {
    if (s.type === 'application/pdf') return { type: 'document', title: s.name, source: { type: 'base64', media_type: 'application/pdf', data: s.data } };
    if (s.data.length > MAX_SOURCE_CHARS) throw new HttpError(413, `${s.name} is too long to map in one pass. Trim it or split it.`);
    return { type: 'document', title: s.name, source: { type: 'text', media_type: 'text/plain', data: s.data } };
  });
}

export async function generate(body: { prompt: string; kind: GraphKind; depth: number; sources?: Source[] }): Promise<Graph> {
  if (!KINDS.includes(body.kind)) throw new HttpError(400, 'Unknown graph kind.');
  const prompt = (body.prompt ?? '').trim();
  if (!prompt && !body.sources?.length) throw new HttpError(400, 'Type a concept or add a document.');
  const ask = `Make a ${KIND_INFO[body.kind].label.toLowerCase()} (kind "${body.kind}") with ${SIZE(body.depth)}.
${body.sources?.length ? 'Base it on the attached document(s).' : ''}
Subject: ${prompt || 'the attached document(s)'}`;
  const g = await structured(GraphSchema, [...sourceBlocks(body.sources), { type: 'text', text: ask }], body.depth >= 3 ? 'high' : 'medium');
  return { ...sanitize(g), kind: body.kind };
}

export async function refine(body: { graph: Graph; instruction: string }): Promise<Graph> {
  const ask = `Here is the current graph (kind "${body.graph.kind}"):
${JSON.stringify(strip(body.graph))}

Revise it according to this instruction, and return the complete revised graph. Keep the ids of nodes that stay.
Instruction: ${body.instruction}`;
  const g = await structured(GraphSchema, [{ type: 'text', text: ask }], 'medium');
  return { ...sanitize(g), kind: body.graph.kind };
}

export async function expand(body: { graph: Graph; nodeId: string; instruction?: string }) {
  const node = body.graph.nodes.find((n) => n.id === body.nodeId);
  if (!node) throw new HttpError(400, 'That node is not in the graph.');
  const ask = `Here is the current graph (kind "${body.graph.kind}"):
${JSON.stringify(strip(body.graph))}

Expand the node "${node.label}" (id "${node.id}") with 3 to 6 new nodes that go deeper into it${body.instruction ? `, focusing on: ${body.instruction}` : ''}.
Return only the NEW nodes, the edges that connect them (to "${node.id}", to each other, or to existing nodes where there is a real relationship), and any new groups. New ids must not reuse existing ids. Prefer existing group names when they fit.`;
  const x = await structured(ExpansionSchema, [{ type: 'text', text: ask }], 'low');
  return sanitize(x, new Set(body.graph.nodes.map((n) => n.id)));
}

export async function explain(body: { graph: Graph; nodeId: string }): Promise<{ text: string }> {
  const node = body.graph.nodes.find((n) => n.id === body.nodeId);
  if (!node) throw new HttpError(400, 'That node is not in the graph.');
  const res = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: 'You explain one idea inside a larger map. Write two short paragraphs of plain prose, no headings or lists. Be concrete and mention how it connects to its neighbors in the map.',
    messages: [{ role: 'user', content: `Map: "${body.graph.title}". ${body.graph.summary}\nNeighbors: ${neighbors(body.graph, node.id)}\n\nExplain "${node.label}": ${node.detail}` }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (res.stop_reason === 'refusal') throw new HttpError(422, 'The model declined to explain this node.');
  return { text: res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim() };
}

function strip(g: Graph) {
  return { title: g.title, summary: g.summary, groups: g.groups, nodes: g.nodes, edges: g.edges };
}

function neighbors(g: Graph, id: string): string {
  const label = new Map(g.nodes.map((n) => [n.id, n.label]));
  return g.edges
    .filter((e) => e.source === id || e.target === id)
    .map((e) => (e.source === id ? `${e.label || 'to'} ${label.get(e.target)}` : `${label.get(e.source)} ${e.label || 'to'} this`))
    .join('; ');
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const ROUTES: Record<string, (body: never) => Promise<unknown>> = {
  '/api/generate': generate,
  '/api/refine': refine,
  '/api/expand': expand,
  '/api/explain': explain,
};

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 40e6) throw new HttpError(413, 'Upload too large (40 MB max).');
    chunks.push(c as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/** Connect-style middleware for Vite's dev and preview servers. */
export function apiMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = (req.url ?? '').split('?')[0];
    if (url === '/api/status') {
      const state = await checkKey();
      return send(res, 200, { ready: state === 'valid' || state === 'unchecked', key: state, model: MODEL, canSetKey: isLocal(req) });
    }
    if (url === '/api/key') {
      if (req.method !== 'POST') return send(res, 405, { error: 'POST only.' });
      if (!sameOrigin(req)) return send(res, 403, { error: 'Cross-site request refused.' });
      if (!isLocal(req)) return send(res, 403, { error: 'Open Graphinator at localhost on this computer to change the key.' });
      try {
        const body = (await readJson(req)) as { key?: string };
        return send(res, 200, await saveKey(body.key ?? ''));
      } catch (err) {
        return send(res, err instanceof HttpError ? err.status : 500, { error: (err as Error).message });
      }
    }
    const route = ROUTES[url];
    if (!route) return next();
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only.' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'Cross-site request refused.' });
    try {
      if (!hasCredentials()) throw new HttpError(503, 'Add your Anthropic API key to start mapping.');
      send(res, 200, await route((await readJson(req)) as never));
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      if (err instanceof Anthropic.AuthenticationError) {
        keyState = 'invalid';
        return send(res, 401, { error: 'Your Anthropic API key was rejected. Add a new one.' });
      }
      if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'Rate limited. Wait a moment and try again.' });
      if (err instanceof Anthropic.APIError) return send(res, 502, { error: `Claude API error ${err.status ?? ''}: ${err.message}` });
      if (err instanceof SyntaxError) return send(res, 502, { error: 'The reply could not be read as a graph. Try again.' });
      console.error(err);
      send(res, 500, { error: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  };
}

function hasCredentials(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}
