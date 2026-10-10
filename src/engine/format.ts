import type { Value } from './types';

const more = (hidden: number): string[] => (hidden > 0 ? [`... ${hidden} more`] : []);

export function formatValue(value: Value): string {
  switch (value.t) {
    case 'prim':
      return typeof value.v === 'string' ? JSON.stringify(value.v) : String(value.v);
    case 'undef':
      return 'undefined';
    case 'uninit':
      return 'not initialized';
    case 'bigint':
      return `${value.v}n`;
    case 'symbol':
      return value.v;
    case 'fn':
      return `function ${value.name}`;
    case 'arr':
      return `[${[...value.items.map(formatValue), ...more(value.hidden)].join(', ')}]`;
    case 'set':
      return `Set {${[...value.items.map(formatValue), ...more(value.hidden)].join(', ')}}`;
    case 'map': {
      const entries = value.entries.map(([key, item]) => `${formatValue(key)} => ${formatValue(item)}`);
      return `Map {${[...entries, ...more(value.hidden)].join(', ')}}`;
    }
    case 'obj': {
      const entries = value.entries.map(([key, item]) => `${key}: ${formatValue(item)}`);
      return `{${[...entries, ...more(value.hidden)].join(', ')}}`;
    }
    case 'ref':
      return `#${value.id}`;
  }
}
