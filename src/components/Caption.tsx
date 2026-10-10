import { formatValue } from '../engine/format';
import type { Eval } from '../engine/types';
import { useDryRun } from '../store/useDryRun';

function phrasing(evaluation: Eval): string {
  if (evaluation.kind === 'write') return `${evaluation.target ?? evaluation.text} <- ${formatValue(evaluation.value)}`;
  if (evaluation.taken !== undefined) return `${evaluation.text} is ${evaluation.taken}`;
  return `${evaluation.text} is ${formatValue(evaluation.value)}`;
}

export function Caption() {
  const trace = useDryRun((s) => s.trace);
  const at = useDryRun((s) => s.at);
  const source = useDryRun((s) => s.source);
  if (!trace) {
    return (
      <div className="panel">
        <h2>What is happening</h2>
        <div>Press Run, then Next to step through your code.</div>
      </div>
    );
  }
  const step = trace.steps[at.step];
  if (!step) return null;
  const line = source.split('\n')[step.line - 1] ?? '';
  return (
    <div className="panel">
      <h2>
        What is happening <span className="right">Step {at.step + 1} of {trace.steps.length}</span>
      </h2>
      <div aria-live="polite">
        <div className="mono" style={{ fontSize: 12 }}>
          Line {step.line}: {line.trim()}
        </div>
        <div className="caption-line mono">
          {step.evals.map((e, i) =>
            i < at.revealed ? (
              <span key={i} className="part-done">{phrasing(e)}</span>
            ) : (
              <span key={i} className="part-todo">{e.kind === 'write' ? (e.target ?? e.text) : e.text}</span>
            ),
          )}
          {step.skipped.map((sk, i) => (
            <span key={`s${i}`} className="part-skip" title="not evaluated">{sk.text} (not evaluated)</span>
          ))}
          {step.evals.length === 0 && <span className="kbd">runs now</span>}
        </div>
        <div className="caption-note">{step.note || `Runs line ${step.line}`}</div>
      </div>
    </div>
  );
}
