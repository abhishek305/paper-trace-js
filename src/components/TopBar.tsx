import { useEffect, useState } from 'react';
import { toSourceError } from '../engine/parse';
import { parse } from '../engine/parse';
import { examples } from '../examples';
import { decodeShareHash, encodeShareHash } from '../lib/share';
import { useDryRun } from '../store/useDryRun';

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const limits = useDryRun((s) => s.limits);
  const setLimits = useDryRun((s) => s.setLimits);
  const [draft, setDraft] = useState(limits);
  return (
    <div className="panel" style={{ position: 'absolute', zIndex: 10, top: 48, right: 12, background: 'var(--bg)' }}>
      <h2>Settings</h2>
      {(Object.keys(draft) as (keyof typeof draft)[]).map((k) => (
        <label key={k} style={{ display: 'block', fontSize: 12 }}>
          {k}: <input type="number" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
        </label>
      ))}
      <button className="btn" onClick={() => { setLimits(draft); onClose(); }}>Save</button>{' '}
      <button className="btn" onClick={onClose}>Close</button>
    </div>
  );
}

export function TopBar({ theme, onTheme, onSettings }: { theme: string; onTheme: () => void; onSettings: () => void }) {
  const source = useDryRun((s) => s.source);
  const setSource = useDryRun((s) => s.setSource);
  const run = useDryRun((s) => s.run);
  const status = useDryRun((s) => s.status);
  const error = useDryRun((s) => s.error);
  const [toast, setToast] = useState('');
  useEffect(() => {
    const shared = decodeShareHash(location.hash);
    if (shared != null) setSource(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const canRun = source.split('\n').length <= 1000 && status !== 'running';
  let syntax: string | null = null;
  try {
    parse(source);
  } catch (e) {
    const se = toSourceError(e);
    syntax = `${se.message} (line ${se.line}, col ${se.column})`;
  }
  return (
    <div className="topbar">
      <h1>paper-trace-js</h1>
      <select aria-label="Examples" title="Load an example" onChange={(e) => { const ex = examples.find((x) => x.id === e.target.value); if (ex) setSource(ex.code); }} defaultValue="">
        <option value="" disabled>Examples…</option>
        {examples.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>
      <span className="spacer" />
      <button className="btn btn-accent" disabled={!canRun} onClick={() => void run()} aria-label="Run" title="Run (Ctrl+Enter)">
        {status === 'running' ? 'Running…' : 'Run'}
      </button>
      <button
        className="iconbtn"
        aria-label="Share"
        title="Copy share link"
        onClick={() => {
          const url = location.origin + location.pathname + encodeShareHash(source);
          void navigator.clipboard?.writeText(url).then(() => setToast('Link copied!')).catch(() => setToast(url));
          setTimeout(() => setToast(''), 2000);
        }}
      >
        ⤴
      </button>
      <button className="iconbtn" aria-label="Settings" title="Settings" onClick={onSettings}>⚙</button>
      <button className="iconbtn" aria-label="Switch theme" title="Switch theme" onClick={onTheme}>{theme === 'dark' ? '☀' : '☾'}</button>
      {toast && <span className="kbd">{toast}</span>}
      {syntax && <span style={{ color: 'red', fontSize: 12 }}>⚠ {syntax}</span>}
      {error && <span style={{ color: 'red', fontSize: 12 }}>Error: {error.message} (line {error.line})</span>}
    </div>
  );
}
