import { run } from './run';
import type { RunRequest } from './types';

const post = self.postMessage.bind(self);

for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches']) {
  Object.defineProperty(self, name, { value: undefined, configurable: false });
}

self.onmessage = ({ data }: MessageEvent<RunRequest>) => {
  post(run(data.source, data.limits));
};
