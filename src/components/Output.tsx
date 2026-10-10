import * as pos from '../store/position';
import { useDryRun } from '../store/useDryRun';

export function Output() {
  const trace = useDryRun((s) => s.trace);
  const at = useDryRun((s) => s.at);
  const out = trace ? pos.visibleOutput(trace, at) : [];
  if (!trace) return null;
  return (
    <div className="panel">
      <h2>Output</h2>
      <div className="mono" style={{ whiteSpace: 'pre-wrap' }}>
        {out.length ? out.join('\n') : <span className="kbd">(no output yet)</span>}
      </div>
    </div>
  );
}
