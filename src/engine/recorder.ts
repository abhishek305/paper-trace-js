import { Serializer } from './serialize';
import type { Frame, Limits, StepKind, StopReason, Value } from './types';

export type Getter = readonly [name: string, read: () => unknown];

export type RawEval = { id: number; value: Value; taken?: boolean };

export type RawStep = {
  line: number;
  kind: StepKind;
  depth: number;
  frames: Frame[];
  evals: RawEval[];
  output: string[];
  returned?: Value;
  loopId?: number;
};

type OpenStep = {
  id: number;
  line: number;
  kind: StepKind;
  evals: RawEval[];
  output: string[];
  returned?: Value;
};

type LiveFrame = { fn: string; line: number; getters: Getter[]; returned?: Value };

export class LimitError extends Error {
  constructor(
    readonly reason: StopReason,
    message: string,
  ) {
    super(message);
  }
}

export class Recorder {
  private readonly steps: RawStep[] = [];
  private readonly frames: LiveFrame[] = [{ fn: 'global', line: 1, getters: [] }];
  private readonly serializer: Serializer;
  private readonly startedAt = performance.now();
  private open: OpenStep | null = null;
  private events = 0;
  private outputChars = 0;
  private failure: LimitError | null = null;

  constructor(private readonly limits: Limits) {
    this.serializer = new Serializer(limits);
  }

  init(getters: Getter[]): void {
    this.top().getters = getters;
  }

  stmt(id: number, line: number, getters: Getter[]): void {
    this.opening('statement', id, line, getters, () => undefined);
  }

  iter(id: number, line: number, getters: Getter[]): void {
    this.opening('condition', id, line, getters, () => undefined);
  }

  loop(id: number, line: number, getters: Getter[], test: () => unknown): unknown {
    return this.opening('condition', id, line, getters, test);
  }

  update(id: number, line: number, getters: Getter[], run: () => unknown): unknown {
    return this.opening('statement', id, line, getters, run);
  }

  enter(id: number, fn: string, line: number, getters: Getter[]): void {
    this.guard();
    this.close();
    if (this.frames.length > this.limits.maxDepth) {
      throw this.fail('depth-limit', `Stopped: recursion went deeper than ${this.limits.maxDepth} calls`);
    }
    this.frames.push({ fn, line, getters });
    this.begin('call', id, line, getters);
  }

  ret<T>(value: T): T {
    this.top().returned = this.capture(value);
    return value;
  }

  exit(): void {
    if (this.failure) return;
    this.close();
    const frame = this.top();
    const step = this.begin('return', -1, frame.line, frame.getters);
    step.returned = frame.returned ?? { t: 'undef' };
    this.close();
    this.frames.pop();
  }

  v<T>(id: number, value: T): T {
    this.add({ id, value: this.capture(value) });
    return value;
  }

  b<T>(id: number, value: T): T {
    this.add({ id, value: this.capture(value), taken: Boolean(value) });
    return value;
  }

  u<T>(id: number, previous: T, read: () => unknown): T {
    this.add({ id, value: this.capture(read()) });
    return previous;
  }

  log(text: string): void {
    this.guard();
    this.outputChars += text.length;
    if (this.outputChars > this.limits.maxOutputChars) {
      throw this.fail('output-limit', 'Stopped: the program printed too much output');
    }
    this.current().output.push(text);
  }

  currentLine(): number {
    return this.top().line;
  }

  finish(): { steps: RawStep[]; failure: LimitError | null } {
    this.close();
    return { steps: this.steps, failure: this.failure };
  }

  private opening(
    kind: StepKind,
    id: number,
    line: number,
    getters: Getter[],
    run: () => unknown,
  ): unknown {
    this.guard();
    if (this.open?.id === id) this.top().getters = getters;
    this.close();
    this.begin(kind, id, line, getters);
    return run();
  }

  private guard(): void {
    if (this.failure) throw this.failure;
    if (performance.now() - this.startedAt > this.limits.timeoutMs) {
      throw this.fail('timeout', 'Stopped: the program ran longer than the time limit');
    }
  }

  private fail(reason: StopReason, message: string): LimitError {
    this.failure = new LimitError(reason, message);
    return this.failure;
  }

  private add(evaluation: RawEval): void {
    this.guard();
    this.events += 1;
    if (this.events > this.limits.maxEvents) {
      throw this.fail('event-limit', 'Stopped: the program evaluated too many expressions');
    }
    this.current().evals.push(evaluation);
  }

  private current(): OpenStep {
    if (this.open) return this.open;
    const frame = this.top();
    return this.begin('resume', -1, frame.line, frame.getters);
  }

  private begin(kind: StepKind, id: number, line: number, getters: Getter[]): OpenStep {
    if (this.steps.length >= this.limits.maxSteps) {
      throw this.fail('step-limit', `Stopped after ${this.limits.maxSteps} steps`);
    }
    const frame = this.top();
    frame.line = line;
    frame.getters = getters;
    this.open = { id, line, kind, evals: [], output: [] };
    return this.open;
  }

  private close(): void {
    const open = this.open;
    if (!open) return;
    this.open = null;
    this.steps.push({
      line: open.line,
      kind: open.kind,
      depth: this.frames.length - 1,
      frames: this.snapshot(),
      evals: open.evals,
      output: open.output,
      returned: open.returned,
      loopId: open.kind === 'condition' ? open.id : undefined,
    });
  }

  private snapshot(): Frame[] {
    this.serializer.startSnapshot();
    return this.frames.map((frame) => ({
      fn: frame.fn,
      line: frame.line,
      vars: frame.getters.map(([name, read]) => ({ name, value: this.read(read) })),
    }));
  }

  private read(getter: () => unknown): Value {
    try {
      return this.serializer.value(getter());
    } catch {
      return { t: 'uninit' };
    }
  }

  private capture(value: unknown): Value {
    this.serializer.startSnapshot();
    return this.serializer.value(value);
  }

  private top(): LiveFrame {
    const frame = this.frames.at(-1);
    if (!frame) throw new Error('The recorder has no frame');
    return frame;
  }
}
