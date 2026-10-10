import { useEffect, useState } from 'react';
import { Caption } from './components/Caption';
import { Editor } from './components/Editor';
import { History } from './components/History';
import { Output } from './components/Output';
import { PlayBar } from './components/PlayBar';
import { SettingsDialog, TopBar } from './components/TopBar';
import { Variables } from './components/Variables';
import type { Trace } from './engine/types';
import { useDryRun } from './store/useDryRun';

function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

function StopBanner({ trace }: { trace: Trace }) {
  const setLimits = useDryRun((s) => s.setLimits);
  const limits = useDryRun((s) => s.limits);
  if (trace.stop.reason === 'finished') return null;
  const isLimit = ['step-limit', 'event-limit', 'output-limit', 'depth-limit', 'timeout'].includes(trace.stop.reason);
  return (
    <div role="alert" className="alert">
      <b>Stopped ({trace.stop.reason}){trace.stop.line ? ` at line ${trace.stop.line}` : ''}:</b>{' '}
      {trace.stop.message ?? 'limit reached'}. Partial trace is browsable.
      {isLimit && (
        <span>
          {' '}
          <button className="btn" onClick={() => setLimits({ ...limits, maxSteps: Math.min(limits.maxSteps * 2, 100000) })}>
            Double step limit
          </button>
        </span>
      )}
    </div>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  const trace = useDryRun((s) => s.trace);
  const [showSettings, setShowSettings] = useState(false);
  return (
    <div>
      <TopBar theme={theme} onTheme={toggle} onSettings={() => setShowSettings((v) => !v)} />
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {trace && <StopBanner trace={trace} />}
      <div className="layout">
        <div>
          <Editor />
          <Caption />
          <Output />
        </div>
        <div>
          <Variables />
          <History />
        </div>
      </div>
      <PlayBar onSettings={() => setShowSettings(true)} />
    </div>
  );
}
