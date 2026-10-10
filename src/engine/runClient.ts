import type { Limits, RunRequest, RunResult } from './types';

const stalledError = { message: 'The run did not respond and was stopped', line: 1, column: 0 };

const stalled: RunResult = {
  ok: false,
  error: stalledError,
};

export function runSource(source: string, limits: Limits): Promise<RunResult> {
  const worker = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: RunResult): void => {
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    timer = setTimeout(() => finish(stalled), limits.timeoutMs + 2_000);
    worker.onmessage = ({ data }: MessageEvent<RunResult>) => finish(data);
    worker.onerror = (event) => {
      const failure: RunResult = { ok: false, error: { ...stalledError, message: event.message } };
      finish(failure);
    };
    worker.postMessage({ source, limits } satisfies RunRequest);
  });
}
