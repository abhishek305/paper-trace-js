# paper-trace-js — JS Dry-Run Simulator for Learning DSA

A browser-only tool that runs your JavaScript and lets you **step forward and backward through execution**, the way you'd dry-run code on paper: every sub-expression evaluated in order, every variable change, the call stack, and program output — no setup, no backend.

> Live demo: redeploy this repo on Vercel (see [Deploy](#deploy)) and put the URL here.

## How it works

Paste JavaScript (up to 1000 lines) → press **Run** → step with **Next** (one part of a line at a time) or **Down arrow** (whole lines). A Web Worker instruments your code, records a full execution trace, and the UI replays it — so stepping backward shows exactly the same state as stepping forward did.

```js
const sorted = [2, 5, 8, 12, 16, 23, 38];
let low = 0;
let high = sorted.length - 1;
// press Run, then Next — watch low, mid, high move as arrows on the array
```

## Features

- **Paper-style stepping** — `sum = arr[i] + arr[j]` reveals `arr[i]` is 5, then `arr[j]` is 3, then `5 + 3` is 8, then `sum <- 8`. Skipped short-circuit sides show as "not evaluated".
- **What is happening** — one plain-English sentence per step, with a step counter.
- **Variables** — current scope with changed values highlighted (`was 0`), call breadcrumb (`global > sum`), "Not declared yet" line for TDZ variables, arrays drawn as boxes with index pointers.
- **History** — classic dry-run trace table (Step, Line, variables, Output), scoped to the selected function, click any row to jump.
- **Time travel** — Back/Next, Play with 0.5x–4x speed, timeline slider, breakpoints (click a line number), skip iteration/loop, jump to next change of any variable.
- **Extras** — 10 one-click DSA examples, shareable URL hash, autosave, light/dark theme, full keyboard control.

## Quick start

```sh
npm ci
npm run dev      # dev server
npm run build    # typecheck + production build
npm test         # Vitest unit tests (23 tests)
npm run typecheck
```

## Supported JavaScript

Modern ES2022 in script mode: `let`/`const`, arrows, classes, `Map`/`Set`, template literals, closures, recursion. **Not supported in v1:** `async`/`await`, generators, `import`/`export`, `with`, DOM/fetch APIs (the sandbox disables them). Unsupported syntax is reported with line and column before running.

**Safety limits** (adjustable in Settings): 20,000 steps, 300,000 expression events, 5 s timeout, 500 max call depth, 10,000 chars of output. Hitting a limit stops cleanly and keeps the partial trace browsable.

## Keyboard shortcuts

| Key | Action |
|---|---|
| Right / Left | Next / previous part |
| Down / Up | Next / previous line |
| O / U | Step over / step out |
| N / Shift+N | Skip iteration / skip loop |
| Space | Play / pause |
| B | Toggle breakpoint on cursor line |
| Ctrl/⌘ + Enter | Run |

## Project structure

```text
src/
  engine/        # parser, scope analysis, instrumenter, recorder, runner (Worker)
  store/         # Zustand store + time-travel position model
  components/    # Editor, Caption, Variables, History, Output, PlayBar, TopBar
  examples/      # built-in DSA programs (all covered by parity tests)
tests/
  engine/        # golden trace, parity, uninit tests
  e2e/           # Playwright specs
```

The engine (`Option A` in `docs/architecture.md`) instruments the AST with recording hooks and runs it natively in a Web Worker — full language support with killable execution. See `docs/architecture.md` for the design.

## Deploy

Static site, no server. On Vercel the included `vercel.json` sets the Vite preset, build command (`npm run build`) and output directory (`dist`) — just import the repo and deploy. That fixes the common *"No Output Directory named public found"* error, which means the project root/preset wasn't set to Vite.

## License

MIT — see [LICENSE](LICENSE).
