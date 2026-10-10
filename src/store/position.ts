import type { Frame, LoopInfo, Step, Trace } from '../engine/types';

export type Position = { step: number; revealed: number };

export const start: Position = { step: 0, revealed: 0 };

function completed(trace: Trace, index: number): Position {
  return { step: index, revealed: trace.steps[index]?.evals.length ?? 0 };
}

function jump(trace: Trace, at: Position, matches: (step: Step) => boolean): Position {
  const index = trace.steps.findIndex((step, i) => i > at.step && matches(step));
  return index === -1 ? at : completed(trace, index);
}

export function next(trace: Trace, at: Position): Position {
  const step = trace.steps[at.step];
  if (!step) return at;
  if (at.revealed < step.evals.length) return { step: at.step, revealed: at.revealed + 1 };
  return at.step + 1 < trace.steps.length ? { step: at.step + 1, revealed: 0 } : at;
}

export function previous(trace: Trace, at: Position): Position {
  if (at.revealed > 0) return { step: at.step, revealed: at.revealed - 1 };
  const prior = trace.steps[at.step - 1];
  return prior ? { step: at.step - 1, revealed: prior.evals.length } : at;
}

export function nextLine(trace: Trace, at: Position): Position {
  const step = trace.steps[at.step];
  if (!step) return at;
  if (at.revealed < step.evals.length) return completed(trace, at.step);
  return completed(trace, Math.min(at.step + 1, trace.steps.length - 1));
}

export function previousLine(_trace: Trace, at: Position): Position {
  if (at.revealed > 0) return { step: at.step, revealed: 0 };
  return { step: Math.max(at.step - 1, 0), revealed: 0 };
}

export function stepOver(trace: Trace, at: Position): Position {
  const depth = trace.steps[at.step]?.depth ?? 0;
  return jump(trace, at, (step) => step.depth <= depth);
}

export function stepOut(trace: Trace, at: Position): Position {
  const depth = trace.steps[at.step]?.depth ?? 0;
  return jump(trace, at, (step) => step.depth < depth);
}

function enclosingLoop(trace: Trace, step: Step): LoopInfo | undefined {
  return trace.loops
    .filter((loop) => step.line >= loop.startLine && step.line <= loop.endLine)
    .sort((a, b) => b.startLine - a.startLine)[0];
}

export function skipLoop(trace: Trace, at: Position): Position {
  const step = trace.steps[at.step];
  const loop = step && enclosingLoop(trace, step);
  if (!step || !loop) return at;
  const outside = (line: number): boolean => line < loop.startLine || line > loop.endLine;
  return jump(trace, at, (s) => s.depth < step.depth || (s.depth === step.depth && outside(s.line)));
}

export function skipIteration(trace: Trace, at: Position): Position {
  const step = trace.steps[at.step];
  const loop = step && enclosingLoop(trace, step);
  if (!step || !loop) return at;
  const target = jump(trace, at, (s) => s.depth === step.depth && s.kind === 'condition' && s.loop?.id === loop.id);
  return target === at ? skipLoop(trace, at) : target;
}

export const nextChange = (trace: Trace, at: Position, name: string): Position =>
  jump(trace, at, (step) => step.changed.includes(name));

export const nextBreakpoint = (trace: Trace, at: Position, lines: ReadonlySet<number>): Position =>
  jump(trace, at, (step) => lines.has(step.line));

export function displayedFrames(trace: Trace, at: Position): Frame[] {
  const step = trace.steps[at.step];
  if (!step) return [];
  const complete = at.revealed >= step.evals.length;
  return (complete ? step : trace.steps[at.step - 1])?.frames ?? [];
}

export function visibleOutput(trace: Trace, at: Position): string[] {
  const complete = at.revealed >= (trace.steps[at.step]?.evals.length ?? 0);
  return trace.steps.slice(0, complete ? at.step + 1 : at.step).flatMap((step) => step.output);
}
