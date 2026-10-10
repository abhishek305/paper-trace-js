# paper-trace-js — JS Dry-Run Simulator for Learning DSA

Paste JavaScript (up to 1000 lines), press Run, then step forward/backward through execution seeing each line broken into parts evaluated in order, with variables, trace table, call stack, array view and console.

## Quick start

```sh
npm ci
npm run dev
```

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm test` — Vitest unit tests
- `npm run typecheck` — `tsc -b --noEmit`

## Supported JavaScript

ES2022 script mode without `async`/`await`, generators, `import`/`export`, `with`. Tagged templates run but are not traced. Async/DOM APIs are disabled in the Worker sandbox.

## Limits

Defaults: 20,000 steps, 300,000 expression events, 5 s timeout, 500 max depth, 10,000 console chars. Adjustable in Settings up to hard caps. Partial traces are kept and browsable on limit hits.

See `docs/architecture.md` for the engine design.
