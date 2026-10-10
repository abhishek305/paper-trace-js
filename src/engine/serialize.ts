import type { Limits, Value } from './types';

function primitive(input: unknown): Value {
  switch (typeof input) {
    case 'undefined':
      return { t: 'undef' };
    case 'boolean':
    case 'number':
    case 'string':
      return { t: 'prim', v: input };
    case 'bigint':
      return { t: 'bigint', v: input.toString() };
    case 'symbol':
      return { t: 'symbol', v: input.toString() };
    case 'function':
      return { t: 'fn', name: (input as { name?: string }).name || '(anonymous)' };
    default:
      return { t: 'prim', v: null };
  }
}

export class Serializer {
  private readonly ids = new WeakMap<object, number>();
  private seen = new Set<object>();
  private nextId = 1;

  constructor(private readonly limits: Pick<Limits, 'maxItems' | 'maxNesting'>) {}

  startSnapshot(): void {
    this.seen = new Set();
  }

  value(input: unknown, depth = 0): Value {
    if (typeof input === 'object' && input !== null) return this.object(input, depth);
    return primitive(input);
  }

  private object(input: object, depth: number): Value {
    const id = this.idOf(input);
    if (this.seen.has(input) || depth >= this.limits.maxNesting) return { t: 'ref', id };
    this.seen.add(input);
    const max = this.limits.maxItems;
    const next = depth + 1;
    if (Array.isArray(input)) {
      return {
        t: 'arr',
        id,
        items: input.slice(0, max).map((item: unknown) => this.value(item, next)),
        hidden: Math.max(0, input.length - max),
      };
    }
    if (input instanceof Map) {
      return {
        t: 'map',
        id,
        entries: [...input]
          .slice(0, max)
          .map(([key, item]): [Value, Value] => [this.value(key, next), this.value(item, next)]),
        hidden: Math.max(0, input.size - max),
      };
    }
    if (input instanceof Set) {
      return {
        t: 'set',
        id,
        items: [...input].slice(0, max).map((item) => this.value(item, next)),
        hidden: Math.max(0, input.size - max),
      };
    }
    const keys = Object.keys(input);
    return {
      t: 'obj',
      id,
      cls: (input as { constructor?: { name?: string } }).constructor?.name ?? 'Object',
      entries: keys.slice(0, max).flatMap((key) => this.property(input, key, next)),
      hidden: Math.max(0, keys.length - max),
    };
  }

  private property(owner: object, key: string, depth: number): [string, Value][] {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    return descriptor && 'value' in descriptor ? [[key, this.value(descriptor.value, depth)]] : [];
  }

  private idOf(input: object): number {
    const known = this.ids.get(input);
    if (known !== undefined) return known;
    const id = this.nextId++;
    this.ids.set(input, id);
    return id;
  }
}
