import { create } from 'zustand';
import { clampLimits } from '../engine/limits';
import { runSource } from '../engine/runClient';
import type { Limits, SourceError, Trace } from '../engine/types';
import { examples } from '../examples';
import { loadLimits, loadSource, saveLimits, saveSource } from '../lib/storage';
import * as position from './position';

type Status = 'idle' | 'running' | 'ready' | 'failed';
type Granularity = 'part' | 'line';
type Move = (trace: Trace, at: position.Position) => position.Position;

type DryRunState = {
  source: string;
  limits: Limits;
  status: Status;
  trace: Trace | null;
  stale: boolean;
  error: SourceError | null;
  at: position.Position;
  granularity: Granularity;
  breakpoints: ReadonlySet<number>;
  playing: boolean;
  speed: number;
  groupByIteration: boolean;
  inspectedFrame: number;
  cursorLine: number;
  setSource: (source: string) => void;
  run: () => Promise<void>;
  move: (to: Move) => void;
  seek: (at: position.Position) => void;
  advance: () => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  toggleBreakpoint: (line: number) => void;
  setGranularity: (granularity: Granularity) => void;
  toggleGroupByIteration: () => void;
  setLimits: (limits: Limits) => void;
  setInspectedFrame: (i: number) => void;
  setCursorLine: (line: number) => void;
};

const initialSource = (): string => {
  try {
    if (typeof location !== 'undefined' && location.hash.startsWith('#code=')) return loadSource() || (examples[0]?.code ?? '');
  } catch { /* noop */ }
  return loadSource() || (examples[0]?.code ?? '');
};

export const useDryRun = create<DryRunState>((set, get) => ({
  source: initialSource(),
  limits: loadLimits(),
  status: 'idle',
  trace: null,
  stale: false,
  error: null,
  at: position.start,
  granularity: 'part',
  breakpoints: new Set(),
  playing: false,
  speed: 1,
  groupByIteration: false,
  inspectedFrame: 0,
  cursorLine: 1,

  setSource: (source) => {
    saveSource(source);
    set({ source, stale: get().trace !== null });
  },

  run: async () => {
    set({ status: 'running', playing: false });
    const result = await runSource(get().source, get().limits);
    if (result.ok) {
      set({ status: 'ready', trace: result.trace, error: null, stale: false, at: position.start, inspectedFrame: 0 });
    } else {
      set({ status: 'failed', trace: null, error: result.error, stale: false });
    }
  },

  move: (to) => {
    const { trace, at } = get();
    if (trace) set({ at: to(trace, at), inspectedFrame: 0 });
  },

  seek: (at) => set({ at, playing: false, inspectedFrame: 0 }),

  advance: () => {
    const { trace, at, breakpoints } = get();
    if (!trace) return;
    const to = position.nextLine(trace, at);
    const finished = to.step === at.step && to.revealed === at.revealed;
    const hitBreakpoint = breakpoints.has(trace.steps[to.step]?.line ?? -1);
    set({ at: to, playing: !finished && !hitBreakpoint });
  },

  togglePlaying: () => set((state) => ({ playing: !state.playing && state.trace !== null })),
  setSpeed: (speed) => set({ speed }),
  setGranularity: (granularity) => set({ granularity }),
  toggleGroupByIteration: () => set((state) => ({ groupByIteration: !state.groupByIteration })),
  setInspectedFrame: (i) => set({ inspectedFrame: i }),
  setCursorLine: (line) => set({ cursorLine: line }),

  toggleBreakpoint: (line) =>
    set((state) => {
      const breakpoints = new Set(state.breakpoints);
      if (!breakpoints.delete(line)) breakpoints.add(line);
      return { breakpoints };
    }),

  setLimits: (requested) => {
    const limits = clampLimits(requested);
    saveLimits(limits);
    set({ limits });
  },
}));
