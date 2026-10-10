import { useEffect, useState } from 'react';
import * as pos from '../store/position';
import { useDryRun } from '../store/useDryRun';

const SPEEDS = [0.5, 1, 2, 4];

function MenuItem({ label, shortcut, disabled, onClick }: { label: string; shortcut: string; disabled: boolean; onClick: () => void }) {
  return (
    <button disabled={disabled} onClick={onClick}>
      <span>{label}</span>
      <span className="kbd">{shortcut}</span>
    </button>
  );
}

export function PlayBar({ onSettings }: { onSettings: () => void }) {
  const s = useDryRun();
  const { trace, at } = s;
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!s.playing || !trace) return;
    const t = setInterval(() => s.advance(), 800 / s.speed);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.playing, s.speed, trace]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const inEditor = el?.closest('.cm-content');
      if (inEditor && !e.altKey && !(e.ctrlKey || e.metaKey)) return;
      const st = useDryRun.getState();
      if (!st.trace) return;
      if (e.key === 'ArrowRight') st.move(pos.next);
      else if (e.key === 'ArrowLeft') st.move(pos.previous);
      else if (e.key === 'ArrowDown') { e.preventDefault(); st.move(pos.nextLine); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); st.move(pos.previousLine); }
      else if (e.key === ' ') { e.preventDefault(); st.togglePlaying(); }
      else if (e.key === 'o' || e.key === 'O') st.move(pos.stepOver);
      else if (e.key === 'u' || e.key === 'U') st.move(pos.stepOut);
      else if (e.key === 'n' || e.key === 'N') st.move(e.shiftKey ? pos.skipLoop : pos.skipIteration);
      else if (e.key === 'b' || e.key === 'B') st.toggleBreakpoint(st.cursorLine);
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void st.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cycleSpeed = (): void => {
    const i = SPEEDS.indexOf(s.speed);
    s.setSpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
  };

  const frameVars = trace ? pos.displayedFrames(trace, at).at(-1)?.vars.map((v) => v.name) ?? [] : [];
  const close = (): void => setMoreOpen(false);

  return (
    <>
      <div className="playbar">
        <button className="btn btn-large" disabled={!trace} onClick={() => s.move(pos.previous)} aria-label="Back" title="Previous part (Left arrow)">Back</button>
        <button className="btn btn-large btn-accent" disabled={!trace} onClick={() => s.move(pos.next)} aria-label="Next" title="Next part (Right arrow)">Next</button>
        <button className="btn" disabled={!trace} onClick={() => s.togglePlaying()} aria-label={s.playing ? 'Pause' : 'Play'} title="Play or pause (Space)">
          {s.playing ? 'Pause' : 'Play'}
        </button>
        <button className="btn" onClick={cycleSpeed} aria-label="Playback speed" title="Playback speed">{s.speed}x</button>
        {trace && (
          <input
            type="range"
            min={0}
            max={Math.max(trace.steps.length - 1, 0)}
            value={at.step}
            onChange={(e) => s.seek({ step: Number(e.target.value), revealed: trace.steps[Number(e.target.value)]?.evals.length ?? 0 })}
            aria-label="Timeline"
            title="Scrub through steps"
          />
        )}
        <span className="counter">{trace ? `${at.step + 1} / ${trace.steps.length}` : '0 / 0'}</span>
        <button className="btn" onClick={() => setMoreOpen((v) => !v)} aria-label="More actions" title="More actions" aria-expanded={moreOpen}>More ▾</button>
      </div>
      {moreOpen && (
        <div className="moremenu" role="menu">
          <MenuItem label="Next line" shortcut="Down" disabled={!trace} onClick={() => { s.move(pos.nextLine); close(); }} />
          <MenuItem label="Previous line" shortcut="Up" disabled={!trace} onClick={() => { s.move(pos.previousLine); close(); }} />
          <MenuItem label="Step over" shortcut="O" disabled={!trace} onClick={() => { s.move(pos.stepOver); close(); }} />
          <MenuItem label="Step out" shortcut="U" disabled={!trace} onClick={() => { s.move(pos.stepOut); close(); }} />
          <MenuItem label="Skip iteration" shortcut="N" disabled={!trace} onClick={() => { s.move(pos.skipIteration); close(); }} />
          <MenuItem label="Skip loop" shortcut="Shift+N" disabled={!trace} onClick={() => { s.move(pos.skipLoop); close(); }} />
          {frameVars.map((name) => (
            <MenuItem key={name} label={`Next change of ${name}`} shortcut="" disabled={!trace} onClick={() => { s.move((t, a) => pos.nextChange(t, a, name)); close(); }} />
          ))}
          <MenuItem
            label={`${s.groupByIteration ? '✓ ' : ''}Group history by iteration`}
            shortcut=""
            disabled={!trace}
            onClick={() => { s.toggleGroupByIteration(); close(); }}
          />
          <MenuItem label="Settings" shortcut="" disabled={false} onClick={() => { close(); onSettings(); }} />
        </div>
      )}
    </>
  );
}
