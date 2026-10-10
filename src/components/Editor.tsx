import { javascript } from '@codemirror/lang-javascript';
import { type EditorState, RangeSet, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  gutter,
  GutterMarker,
  lineNumbers,
  WidgetType,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { formatValue } from '../engine/format';
import { useDryRun } from '../store/useDryRun';

export const plainText = EditorView.contentAttributes.of({
  spellcheck: 'false',
  autocorrect: 'off',
  autocapitalize: 'off',
  'data-gramm': 'false',
});

class BpMarker extends GutterMarker {
  override toDOM(): HTMLElement {
    const s = document.createElement('span');
    s.className = 'cm-bp-dot';
    return s;
  }
}

type PartMark = { from: number; to: number; kind: 'eval' | 'skip'; value?: string };
type LineState = { line: number; parts: PartMark[] } | null;

class CurrentMarker extends GutterMarker {
  override toDOM(): HTMLElement {
    const s = document.createElement('span');
    s.className = 'cm-current-bar';
    return s;
  }
}

type GutterState = { breakpoints: ReadonlySet<number>; current: number | null };

const setGutterEffect = StateEffect.define<GutterState>();
const setLineEffect = StateEffect.define<LineState>();

function gutterMarkers(doc: EditorState['doc'], state: GutterState): RangeSet<GutterMarker> {
  const builder = new RangeSetBuilder<GutterMarker>();
  const atLine = (line: number, marker: GutterMarker): void => {
    try {
      const ln = doc.line(line);
      builder.add(ln.from, ln.from, marker);
    } catch {
      return;
    }
  };
  if (state.current !== null) atLine(state.current, new CurrentMarker());
  for (const line of [...state.breakpoints].sort((a, b) => a - b)) atLine(line, new BpMarker());
  return builder.finish();
}

const gutterField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(markers, tr) {
    for (const e of tr.effects) {
      if (e.is(setGutterEffect)) return gutterMarkers(tr.state.doc, e.value);
    }
    return markers.map(tr.changes);
  },
});

class ValueBadge extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  override toDOM(): HTMLElement {
    const s = document.createElement('span');
    s.className = 'cm-eval-badge';
    s.textContent = this.text;
    return s;
  }

  override eq(other: ValueBadge): boolean {
    return other.text === this.text;
  }
}

function decorationsFor(state: EditorState, current: LineState): DecorationSet {
  if (!current) return Decoration.none;
  const end = state.doc.length;
  const clamp = (n: number): number => Math.max(0, Math.min(n, end));
  const ranges: { from: number; to: number; deco: Decoration }[] = [];
  try {
    const ln = state.doc.line(Math.min(current.line, state.doc.lines));
    ranges.push({ from: ln.from, to: ln.from, deco: Decoration.line({ class: 'cm-current-line' }) });
  } catch {
    return Decoration.none;
  }
  for (const part of current.parts) {
    const from = clamp(part.from);
    const to = clamp(Math.max(part.to, from + 1));
    if (part.kind === 'eval' && part.value !== undefined) {
      ranges.push({
        from: to,
        to,
        deco: Decoration.widget({ widget: new ValueBadge(part.value), side: 1 }),
      });
    } else if (part.kind === 'skip') {
      ranges.push({
        from,
        to,
        deco: Decoration.mark({ class: 'cm-skip-mark', attributes: { title: 'not evaluated' } }),
      });
    }
  }
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  const builder = new RangeSetBuilder<Decoration>();
  for (const r of ranges) builder.add(r.from, r.to, r.deco);
  return builder.finish();
}

const lineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setLineEffect)) return decorationsFor(tr.state, e.value);
    }
    return deco.map(tr.changes);
  },
});

const bpGutter = gutter({
  class: 'cm-bp-gutter',
  markers: (view) => view.state.field(gutterField),
  domEventHandlers: {
    mousedown: (view, line) => {
      useDryRun.getState().toggleBreakpoint(view.state.doc.lineAt(line.from).number);
      return true;
    },
  },
});

export function Editor() {
  const source = useDryRun((s) => s.source);
  const trace = useDryRun((s) => s.trace);
  const at = useDryRun((s) => s.at);
  const stale = useDryRun((s) => s.stale);
  const breakpoints = useDryRun((s) => s.breakpoints);
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const view = new EditorView({
      doc: useDryRun.getState().source,
      extensions: [
        lineNumbers(),
        bpGutter,
        gutterField,
        lineField,
        javascript(),
        plainText,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            useDryRun.getState().setSource(u.state.doc.toString());
          }
          if (u.selectionSet) {
            try {
              useDryRun.getState().setCursorLine(u.state.doc.lineAt(u.state.selection.main.head).number);
            } catch {
              return;
            }
          }
        }),
      ],
      parent: ref.current,
    });
    viewRef.current = view;
    return () => view.destroy();
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== source) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
    }
  }, [source]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const step = trace?.steps[at.step];
    const current = !trace || !step || stale ? null : step.line;
    view.dispatch({ effects: setGutterEffect.of({ breakpoints, current }) });
  }, [trace, at, stale, breakpoints]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const step = trace?.steps[at.step];
    if (!trace || !step || stale) {
      view.dispatch({ effects: setLineEffect.of(null) });
      return;
    }
    const parts: PartMark[] = [
      ...step.evals.slice(0, at.revealed).map((e): PartMark => ({ from: e.start, to: e.end, kind: 'eval', value: formatValue(e.value) })),
      ...step.skipped.map((sk): PartMark => ({ from: sk.start, to: sk.end, kind: 'skip' })),
    ];
    view.dispatch({ effects: setLineEffect.of({ line: step.line, parts }) });
  }, [trace, at, stale]);

  const lines = source.split('\n').length;
  return (
    <div className="panel">
      <h2>Code</h2>
      <div ref={ref} className="codewrap" />
      <div className="footer">
        {lines} / 1000 lines
        {stale ? ' · Code changed since the last run. Press Run.' : ''}
      </div>
    </div>
  );
}
