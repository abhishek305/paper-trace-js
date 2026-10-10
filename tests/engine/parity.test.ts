import { describe, expect, it } from 'vitest';
import { examples } from '../../src/examples';
import { traceOf } from './traceOf';

function nativeOutput(code: string): string[] {
  const lines: string[] = [];
  const print = (...args: unknown[]): void => {
    lines.push(args.map(String).join(' '));
  };
  // eslint-disable-next-line no-new-func -- native baseline for the parity test
  new Function('console', code)({ log: print });
  return lines;
}

describe.each(examples)('$title', ({ code }) => {
  it('prints the same output instrumented and native', () => {
    const trace = traceOf(code);
    expect(trace.stop.reason).toBe('finished');
    expect(trace.steps.flatMap((step) => step.output)).toEqual(nativeOutput(code));
  });
});
