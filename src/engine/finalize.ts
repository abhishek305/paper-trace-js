import type { Instrumented } from './instrument';
import type { RawEval, RawStep } from './recorder';
import type { Eval, ExprInfo, SkippedPart, Step, Stop, Trace, Value } from './types';

const sameValue = (a: Value, b: Value): boolean => JSON.stringify(a) === JSON.stringify(b);

function toEval(raw: RawEval, exprs: ExprInfo[]): Eval {
  const info = exprs[raw.id];
  if (!info) throw new Error(`Unknown expression id ${raw.id}`);
  const { start, end, text, kind, target } = info;
  return { start, end, text, kind, target, value: raw.value, taken: raw.taken };
}

function findSkipped(raw: RawEval[], exprs: ExprInfo[]): SkippedPart[] {
  const done = raw.flatMap((evaluation) => exprs[evaluation.id] ?? []);
  const wasEvaluated = (part: SkippedPart): boolean =>
    done.some((info) => info.start >= part.start && info.end <= part.end);
  return done.flatMap((info) => info.skippable.filter((part) => !wasEvaluated(part)));
}

function changedNames(current: RawStep, previous: RawStep | undefined): string[] {
  const frame = current.frames.at(-1);
  if (!frame) return [];
  const before = previous?.frames[current.frames.length - 1];
  return frame.vars
    .filter(({ name, value }) => {
      if (value.t === 'uninit') return false;
      const prior = before?.fn === frame.fn ? before.vars.find((variable) => variable.name === name) : undefined;
      return !prior || !sameValue(prior.value, value);
    })
    .map(({ name }) => name);
}

function toStep(raw: RawStep, n: number, info: Instrumented, previous: RawStep | undefined): Step {
  return {
    n,
    line: raw.line,
    kind: raw.kind,
    depth: raw.depth,
    frames: raw.frames,
    evals: raw.evals.map((evaluation) => toEval(evaluation, info.exprs)),
    skipped: findSkipped(raw.evals, info.exprs),
    changed: changedNames(raw, previous),
    output: raw.output,
    returned: raw.returned,
    loop: info.loops.find((loop) => loop.id === raw.loopId),
    note: '',
  };
}

export function finalize(
  raw: RawStep[],
  info: Instrumented,
  stop: Stop,
  explain: (step: Step) => string,
): Trace {
  const steps = raw.map((step, n) => {
    const base = toStep(step, n, info, raw[n - 1]);
    return { ...base, note: explain(base) };
  });
  const line = stop.line ?? steps.at(-1)?.line;
  return { steps, stop: { ...stop, line }, indexNames: info.indexNames, loops: info.loops };
}
