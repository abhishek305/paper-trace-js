import { formatValue } from '../engine/format';
import type { Trace, Value, Variable } from '../engine/types';
import * as pos from '../store/position';
import { useDryRun } from '../store/useDryRun';

export function ValueText({ value }: { value: Value }) {
  return <span className="mono">{formatValue(value)}</span>;
}

function previousValue(trace: Trace, stepIndex: number, depth: number, name: string): Value | undefined {
  const fn = trace.steps[stepIndex]?.frames[depth]?.fn;
  for (let i = stepIndex - 1; i >= 0; i--) {
    const frame = trace.steps[i]?.frames[depth];
    if (frame && frame.fn === fn) return frame.vars.find((v) => v.name === name)?.value;
  }
  return undefined;
}

function ArrayBoxes({ vars, indexNames }: { vars: Variable[]; indexNames: string[] }) {
  const arrays = vars.filter((v) => v.value.t === 'arr');
  if (arrays.length === 0) return null;
  const pointers = vars.filter(
    (v) => v.value.t === 'prim' && typeof v.value.v === 'number' && Number.isInteger(v.value.v) && indexNames.includes(v.name),
  );
  return (
    <>
      {arrays.map((v) => {
        if (v.value.t !== 'arr') return null;
        const arr = v.value;
        return (
          <div key={v.name}>
            <b className="mono">{v.name}</b>
            <div className="arraybox">
              {arr.items.map((item, i) => (
                <div key={i}>
                  <div className="cell">
                    <ValueText value={item} />
                    <span className="idx">{i}</span>
                  </div>
                  <div>
                    {pointers
                      .filter((p) => p.value.t === 'prim' && (p.value.v as number) === i)
                      .map((p) => (
                        <span key={p.name} className="ptr">↑{p.name} </span>
                      ))}
                  </div>
                </div>
              ))}
              {arr.hidden > 0 && <span className="kbd">… {arr.hidden} more</span>}
              {pointers.some((p) => p.value.t === 'prim' && (p.value.v as number) === arr.items.length) && (
                <div className="cell">
                  <span className="kbd">out of range</span>
                  <span className="idx">{arr.items.length}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function Variables() {
  const trace = useDryRun((s) => s.trace);
  const at = useDryRun((s) => s.at);
  const inspected = useDryRun((s) => s.inspectedFrame);
  const setInspected = useDryRun((s) => s.setInspectedFrame);
  const step = trace?.steps[at.step];
  const frames = trace ? pos.displayedFrames(trace, at) : [];
  if (!trace || frames.length === 0) {
    return (
      <section className="panel" aria-label="Variables">
        <h2>Variables</h2>
        <span className="kbd">Run to see variables</span>
      </section>
    );
  }
  const selected = Math.min(inspected, frames.length - 1);
  const depth = frames.length - 1 - selected;
  const frame = frames[depth];
  if (!frame) return null;
  const declared = frame.vars.filter((v) => v.value.t !== 'uninit');
  const pending = frame.vars.filter((v) => v.value.t === 'uninit').map((v) => v.name);
  return (
    <section className="panel" aria-label="Variables">
      <h2>Variables</h2>
      <div className="crumb mono" style={{ fontSize: 12, marginBottom: 4 }}>
        {frames.map((f, i) => (
          <span key={i}>
            {i > 0 && ' > '}
            {i === depth ? (
              <button className="current" aria-current="true">{f.fn}</button>
            ) : (
              <button onClick={() => setInspected(frames.length - 1 - i)} title={`Show ${f.fn}`}>{f.fn}</button>
            )}
          </span>
        ))}
      </div>
      {declared.length === 0 && <div className="kbd">No variables here yet</div>}
      {declared.map((v) => {
        const changed = v.value.t !== 'uninit' && (step?.changed.includes(v.name) ?? false);
        const before = changed ? previousValue(trace, at.step, depth, v.name) : undefined;
        return (
          <div key={v.name} style={{ padding: '2px 4px' }}>
            <span className={changed ? 'var-changed' : ''}>
              <b className="mono">{v.name}</b>: <ValueText value={v.value} />
            </span>
            {changed && before !== undefined && <span className="was kbd"> was {formatValue(before)}</span>}
          </div>
        );
      })}
      {pending.length > 0 && <div className="var-uninit kbd">Not declared yet: {pending.join(', ')}</div>}
      <ArrayBoxes vars={declared} indexNames={trace.indexNames} />
    </section>
  );
}
