import { describe, expect, it } from 'vitest';
import { formatValue } from '../../src/engine/format';
import { defaultLimits } from '../../src/engine/limits';
import { run } from '../../src/engine/run';
import { traceOf } from './traceOf';

describe('writes', () => {
  it('records an assignment as evals in order and marks the variable as changed', () => {
    const trace = traceOf(`let a = 1;
a = a + 2;`);
    const second = trace.steps[1];
    expect(second?.line).toBe(2);
    expect(second?.evals.map((evaluation) => evaluation.text)).toEqual(['a', 'a + 2', 'a = a + 2']);
    expect(second?.changed).toEqual(['a']);
    expect(second?.frames[0]?.vars).toEqual([{ name: 'a', value: { t: 'prim', v: 3 } }]);
  });
});

describe('conditions', () => {
  it('records every loop test with its result', () => {
    const trace = traceOf(`let n = 0;
while (n < 2) {
  n++;
}`);
    const tests = trace.steps.filter((step) => step.kind === 'condition');
    expect(tests.map((step) => step.evals.at(-1)?.taken)).toEqual([true, true, false]);
  });

  it('marks the right side of a short-circuit as not evaluated', () => {
    const trace = traceOf(`const a = false;
const b = a && missing();`);
    expect(trace.steps[1]?.skipped.map((part) => part.text)).toEqual(['missing()']);
  });

  it('treats a literal ternary branch as evaluated when it is taken', () => {
    const trace = traceOf(`const x = 5;
const label = x > 3 ? 1 : 2;`);
    expect(trace.steps[1]?.skipped.map((part) => part.text)).toEqual(['2']);
  });
});

describe('functions', () => {
  it('records the stack depth and the return values of a recursive call', () => {
    const trace = traceOf(`function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1);
}
console.log(fact(3));`);
    expect(Math.max(...trace.steps.map((step) => step.depth))).toBe(3);
    const returns = trace.steps.filter((step) => step.kind === 'return');
    expect(returns.map((step) => formatValue(step.returned ?? { t: 'undef' }))).toEqual(['1', '2', '6']);
    expect(trace.stop.reason).toBe('finished');
  });
});

describe('stopping', () => {
  it('stops an infinite loop at the step limit and keeps the partial trace', () => {
    const trace = traceOf('while (true) {}', { maxSteps: 50 });
    expect(trace.stop.reason).toBe('step-limit');
    expect(trace.steps).toHaveLength(50);
  });

  it('reports an uncaught error with its line', () => {
    const trace = traceOf(`let a = 1;
throw new Error('boom');`);
    expect(trace.stop).toEqual({ reason: 'error', message: 'Error: boom', line: 2 });
  });

  it('rejects async functions with their position', () => {
    const result = run(`const a = 1;
async function f() {}`, defaultLimits);
    expect(result).toEqual({
      ok: false,
      error: { message: 'async and generator functions are not supported', line: 2, column: 0 },
    });
  });
});

describe('serializing', () => {
  it('shows a second reference to the same array as a ref', () => {
    const trace = traceOf(`const a = [1, 2];
const b = a;`);
    const vars = trace.steps.at(-1)?.frames[0]?.vars;
    expect(vars?.[0]?.value.t).toBe('arr');
    expect(vars?.[1]?.value).toEqual({ t: 'ref', id: expect.any(Number) });
  });
});
