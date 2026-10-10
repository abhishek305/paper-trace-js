export type Value =
  | { t: 'prim'; v: string | number | boolean | null }
  | { t: 'undef' }
  | { t: 'uninit' }
  | { t: 'bigint'; v: string }
  | { t: 'symbol'; v: string }
  | { t: 'fn'; name: string }
  | { t: 'arr'; id: number; items: Value[]; hidden: number }
  | { t: 'obj'; id: number; cls: string; entries: [string, Value][]; hidden: number }
  | { t: 'map'; id: number; entries: [Value, Value][]; hidden: number }
  | { t: 'set'; id: number; items: Value[]; hidden: number }
  | { t: 'ref'; id: number };

export type Variable = { name: string; value: Value };
export type Frame = { fn: string; line: number; vars: Variable[] };

export type EvalKind = 'read' | 'member' | 'operator' | 'call' | 'literal' | 'write' | 'branch';
export type Span = { start: number; end: number };
export type SkippedPart = Span & { text: string };

export type ExprInfo = Span & {
  text: string;
  kind: EvalKind;
  target?: string;
  skippable: SkippedPart[];
};

export type LoopInfo = { id: number; startLine: number; endLine: number };

export type Eval = Span & {
  text: string;
  kind: EvalKind;
  target?: string;
  value: Value;
  taken?: boolean;
};

export type StepKind = 'statement' | 'condition' | 'call' | 'return' | 'resume';

export type Step = {
  n: number;
  line: number;
  kind: StepKind;
  depth: number;
  frames: Frame[];
  evals: Eval[];
  skipped: SkippedPart[];
  changed: string[];
  output: string[];
  returned?: Value;
  loop?: LoopInfo;
  note: string;
};

export type StopReason =
  | 'finished'
  | 'step-limit'
  | 'event-limit'
  | 'output-limit'
  | 'depth-limit'
  | 'timeout'
  | 'error';

export type Stop = { reason: StopReason; message?: string; line?: number };

export type Trace = { steps: Step[]; stop: Stop; indexNames: string[]; loops: LoopInfo[] };

export type Limits = {
  maxSteps: number;
  maxEvents: number;
  maxDepth: number;
  timeoutMs: number;
  maxItems: number;
  maxNesting: number;
  maxOutputChars: number;
};

export type SourceError = { message: string; line: number; column: number };
export type RunRequest = { source: string; limits: Limits };
export type RunResult = { ok: true; trace: Trace } | { ok: false; error: SourceError };
