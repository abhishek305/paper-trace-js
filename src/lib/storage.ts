import { clampLimits, defaultLimits } from '../engine/limits';
import type { Limits } from '../engine/types';

const SOURCE_KEY = 'dryrun-js:source';
const LIMITS_KEY = 'dryrun-js:limits';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export const loadSource = (): string => read(SOURCE_KEY) ?? '';
export const saveSource = (source: string): void => write(SOURCE_KEY, source);
export const saveLimits = (limits: Limits): void => write(LIMITS_KEY, JSON.stringify(limits));

export function loadLimits(): Limits {
  const stored = read(LIMITS_KEY);
  if (!stored) return defaultLimits;
  try {
    const parsed: Partial<Limits> = JSON.parse(stored);
    return clampLimits(parsed);
  } catch {
    return defaultLimits;
  }
}
