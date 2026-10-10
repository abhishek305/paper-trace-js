# Architecture

Run-then-replay: the instrumenter (acorn + custom scope analysis + astring) wraps every statement and sub-expression with `__d.*` hooks. A Web Worker runs the instrumented code with a `Recorder`, producing a `Trace` of `Step`s. Each step holds ordered `Eval`s (source range + value), skipped parts, changed variables, frames and output. The UI (`position.ts` + Zustand store) is a pure function of `trace[currentStep]` plus revealed eval count, which makes backward stepping trivial.
