import { useMemo, useState } from 'react';
import { formatValue } from '../engine/format';
import * as pos from '../store/position';
import { useDryRun } from '../store/useDryRun';

export function History() {
  const trace = useDryRun((s) => s.trace);
  const at = useDryRun((s) => s.at);
  const seek = useDryRun((s) => s.seek);
  const group = useDryRun((s) => s.groupByIteration);
  const inspected = useDryRun((s) => s.inspectedFrame);
  const [filterLine, setFilterLine] = useState<number | null>(null);
  const frames = trace ? pos.displayedFrames(trace, at) : [];
  const depth = Math.max(frames.length - 1 - Math.min(inspected, Math.max(frames.length - 1, 0)), 0);
  const fn = frames[depth]?.fn ?? 'global';

  const rows = useMemo(() => {
    if (!trace) return [];
    let rs = trace.steps.map((s, i) => ({ s, i })).filter(({ s }) => s.frames[depth]?.fn === fn);
    if (filterLine != null) rs = rs.filter(({ s }) => s.line === filterLine);
    if (group) {
      const kept: typeof rs = [];
      for (const r of rs) {
        const nxt = trace.steps[r.i + 1];
        if (r.s.kind === 'condition' && nxt && nxt.kind !== 'condition') continue;
        kept.push(r);
      }
      rs = kept;
    }
    return rs.slice(-500);
  }, [trace, depth, fn, filterLine, group]);

  const names = useMemo(() => {
    const set = new Set<string>();
    for (const { s } of rows) s.frames[depth]?.vars.forEach((v) => v.value.t !== 'uninit' && set.add(v.name));
    return [...set].slice(0, 12);
  }, [rows, depth]);

  const lines = useMemo(() => [...new Set(rows.map(({ s }) => s.line))].sort((a, b) => a - b), [rows]);
  const hasOutput = useMemo(() => (trace?.steps.some((s) => s.output.length > 0) ?? false), [trace]);

  if (!trace) return null;
  return (
    <div className="panel">
      <h2>History</h2>
      <div style={{ marginBottom: 4 }}>
        <label className="kbd">
          Line:{' '}
          <select value={filterLine ?? ''} onChange={(e) => setFilterLine(e.target.value === '' ? null : Number(e.target.value))} aria-label="Filter by line">
            <option value="">All</option>
            {lines.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ maxHeight: 260, overflow: 'auto' }}>
        <table className="trace">
          <thead>
            <tr>
              <th>Step</th>
              <th>Line</th>
              {names.map((n) => (
                <th key={n}>{n}</th>
              ))}
              {hasOutput && <th>Output</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, i }) => {
              const vars = s.frames[depth]?.vars ?? [];
              return (
                <tr
                  key={i}
                  className={i === at.step ? 'active' : ''}
                  onClick={() => seek({ step: i, revealed: s.evals.length })}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{i}</td>
                  <td>{s.line}</td>
                  {names.map((n) => {
                    const v = vars.find((x) => x.name === n);
                    return (
                      <td key={n} className={s.changed.includes(n) ? 'changed' : ''}>
                        {v ? formatValue(v.value) : ''}
                      </td>
                    );
                  })}
                  {hasOutput && <td>{s.output.join(' ')}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
