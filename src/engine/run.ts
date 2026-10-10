import { explain } from './explain';
import { finalize } from './finalize';
import { type Instrumented, instrument } from './instrument';
import { toSourceError } from './parse';
import { LimitError, Recorder } from './recorder';
import type { Limits, RunResult, Stop, Trace } from './types';

function formatArgument(argument: unknown): string {
  if (typeof argument === 'string') return argument;
  try {
    return JSON.stringify(argument) ?? String(argument);
  } catch {
    return String(argument);
  }
}

function createConsole(recorder: Recorder) {
  const print = (...args: unknown[]): void => recorder.log(args.map(formatArgument).join(' '));
  return { log: print, info: print, warn: print, error: print, debug: print };
}

function toStop(cause: unknown): Stop {
  if (cause === undefined) return { reason: 'finished' };
  if (cause instanceof LimitError) return { reason: cause.reason, message: cause.message };
  const message = cause instanceof Error ? `${cause.name}: ${cause.message}` : `Uncaught ${String(cause)}`;
  return { reason: 'error', message };
}

function record(instrumented: Instrumented, limits: Limits): Trace {
  const recorder = new Recorder(limits);
  let thrown: unknown;
  try {
    // eslint-disable-next-line no-new-func -- running the person's own code is the purpose of the app
    const program = new Function('__d', 'console', `'use strict';\n${instrumented.code}`);
    program(recorder, createConsole(recorder));
  } catch (error) {
    thrown = error;
  }
  const { steps, failure } = recorder.finish();
  return finalize(steps, instrumented, toStop(failure ?? thrown), explain);
}

export function run(source: string, limits: Limits): RunResult {
  try {
    return { ok: true, trace: record(instrument(source), limits) };
  } catch (error) {
    return { ok: false, error: toSourceError(error) };
  }
}
