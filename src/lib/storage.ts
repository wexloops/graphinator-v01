import type { Graph } from '../shared/schema';

export type Saved = { id: string; updated: number; graph: Graph; positions?: Record<string, { x: number; y: number }> };
const KEY = 'graphinator.library.v3';

export function loadLibrary(): Saved[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Saved[];
    return Array.isArray(list) ? list.sort((a, b) => b.updated - a.updated) : [];
  } catch {
    return [];
  }
}

export function saveToLibrary(entry: Saved): Saved[] {
  const list = [entry, ...loadLibrary().filter((s) => s.id !== entry.id)].slice(0, 60);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full: keep working in memory */
  }
  return list;
}

export function removeFromLibrary(id: string): Saved[] {
  const list = loadLibrary().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
