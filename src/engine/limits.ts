import type { Limits } from './types';

export const defaultLimits: Limits = {
  maxSteps: 20_000,
  maxEvents: 300_000,
  maxDepth: 500,
  timeoutMs: 5_000,
  maxItems: 100,
  maxNesting: 3,
  maxOutputChars: 10_000,
};

export const hardLimits: Limits = {
  maxSteps: 100_000,
  maxEvents: 1_000_000,
  maxDepth: 1_000,
  timeoutMs: 20_000,
  maxItems: 500,
  maxNesting: 5,
  maxOutputChars: 100_000,
};

const clamp = (value: number, max: number): number => Math.max(1, Math.min(value, max));

export function clampLimits(requested: Partial<Limits>): Limits {
  const wanted = { ...defaultLimits, ...requested };
  return {
    maxSteps: clamp(wanted.maxSteps, hardLimits.maxSteps),
    maxEvents: clamp(wanted.maxEvents, hardLimits.maxEvents),
    maxDepth: clamp(wanted.maxDepth, hardLimits.maxDepth),
    timeoutMs: clamp(wanted.timeoutMs, hardLimits.timeoutMs),
    maxItems: clamp(wanted.maxItems, hardLimits.maxItems),
    maxNesting: clamp(wanted.maxNesting, hardLimits.maxNesting),
    maxOutputChars: clamp(wanted.maxOutputChars, hardLimits.maxOutputChars),
  };
}
