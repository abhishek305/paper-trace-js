import { formatValue } from './format';
import type { Step } from './types';

function describeCall(step: Step): string {
  const frame = step.frames.at(-1);
  const given = (frame?.vars ?? [])
    .filter(({ value }) => value.t !== 'uninit' && value.t !== 'undef')
    .map(({ name, value }) => `${name} = ${formatValue(value)}`);
  const name = frame?.fn ?? 'function';
  return given.length > 0 ? `Enter ${name} with ${given.join(', ')}` : `Enter ${name}`;
}

function describeReturn(step: Step): string {
  const name = step.frames.at(-1)?.fn ?? 'function';
  if (!step.returned || step.returned.t === 'undef') return `${name} finishes`;
  return `${name} returns ${formatValue(step.returned)}`;
}

export function explain(step: Step): string {
  const test = step.evals.findLast((evaluation) => evaluation.taken !== undefined);
  if (step.kind === 'call') return describeCall(step);
  if (step.kind === 'return') return describeReturn(step);
  if (step.kind === 'condition') {
    if (!test) return 'Next item of the loop';
    return `${test.text} is ${test.taken ? 'true, the loop continues' : 'false, the loop ends'}`;
  }
  const writes = step.evals
    .filter((evaluation) => evaluation.kind === 'write')
    .map((evaluation) => `${evaluation.target ?? evaluation.text} becomes ${formatValue(evaluation.value)}`);
  const parts = [...(test ? [`${test.text} is ${test.taken}`] : []), ...writes];
  const prefix = step.kind === 'resume' ? `Back in ${step.frames.at(-1)?.fn ?? 'caller'}: ` : '';
  return parts.length > 0 ? prefix + parts.join('; ') : `${prefix}Runs line ${step.line}`;
}
