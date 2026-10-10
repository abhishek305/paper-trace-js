import { defaultLimits } from '../../src/engine/limits';
import { run } from '../../src/engine/run';
import type { Limits, Trace } from '../../src/engine/types';

export function traceOf(source: string, limits: Partial<Limits> = {}): Trace {
  const result = run(source, { ...defaultLimits, ...limits });
  if (!result.ok) throw new Error(result.error.message);
  return result.trace;
}
