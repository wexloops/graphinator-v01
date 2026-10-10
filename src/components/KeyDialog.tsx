import { useEffect, useRef, useState } from 'react';

type Props = { state: string; canSetKey: boolean; onSaved(): void; onClose(): void };

/** Enter or replace the Anthropic API key. The server checks it, then stores it in .env on this computer. */
export function KeyDialog({ state, canSetKey, onSaved, onClose }: Props) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/key', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setKey('');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="key-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h2 id="key-title">Anthropic API key</h2>
        <p className="muted">
          {state === 'valid' ? 'A working key is set. Paste a new one to replace it.' : state === 'invalid' ? 'The current key was rejected. Paste a new one.' : 'Graphinator uses Claude to map ideas. Paste your key to start.'}
        </p>
        {canSetKey ? (
          <>
            <div className="key-row">
              <input
                ref={input}
                type={show ? 'text' : 'password'}
                placeholder="sk-ant-…"
                value={key}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && key && void save()}
              />
              <button className="btn btn-quiet" onClick={() => setShow((v) => !v)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="btn btn-quiet">
                Get a key
              </a>
              <span style={{ flex: 1 }} />
              <button className="btn btn-quiet" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-solid" onClick={() => void save()} disabled={!key.trim() || busy}>
                {busy ? 'Checking…' : 'Save key'}
              </button>
            </div>
            <p className="fine">The key is checked with Anthropic, then saved to <code>.env</code> in the Graphinator folder. It stays on the local server and is never sent to this page.</p>
          </>
        ) : (
          <p className="error">Open Graphinator at http://localhost on the computer running it to change the key.</p>
        )}
      </div>
    </div>
  );
}
