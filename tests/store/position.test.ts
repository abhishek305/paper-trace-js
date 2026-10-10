import { describe, expect, it } from 'vitest';
import { displayedFrames, next, previous, start } from '../../src/store/position';
import { traceOf } from '../engine/traceOf';

describe('position', () => {
  const trace = traceOf(`let a = 1;
a = a + 2;`);

  it('shows the state before a line until all its evals are revealed', () => {
    expect(displayedFrames(trace, { step: 1, revealed: 1 })[0]?.vars[0]?.value).toEqual({ t: 'prim', v: 1 });
    expect(displayedFrames(trace, { step: 1, revealed: 3 })[0]?.vars[0]?.value).toEqual({ t: 'prim', v: 3 });
  });

  it('goes back through the same positions in reverse', () => {
    const forward = [start];
    for (let i = 0; i < 5; i++) forward.push(next(trace, forward[i] ?? start));
    const backward = [forward[5] ?? start];
    for (let i = 0; i < 5; i++) backward.push(previous(trace, backward[i] ?? start));
    expect(backward.reverse()).toEqual(forward);
  });
});
