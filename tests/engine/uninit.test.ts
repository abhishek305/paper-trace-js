import { describe, expect, it } from 'vitest';
import { traceOf } from './traceOf';

describe('uninitialized variables', () => {
  it('never lists a variable that is not yet declared as changed', () => {
    const trace = traceOf(`let a = b;
let b = 2;`);
    expect(trace.steps[0]?.changed).toEqual([]);
  });

  it('still marks a declared variable as changed', () => {
    const trace = traceOf(`let a = 1;
a = 2;`);
    expect(trace.steps[1]?.changed).toEqual(['a']);
  });
});
