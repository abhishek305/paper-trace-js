import type { Expression, Node } from 'estree';
import { ScopeStack } from '../scope';
import type { EvalKind, ExprInfo, LoopInfo, SkippedPart } from '../types';
import { varsLiteral } from './hooks';

export type Context = {
  source: string;
  exprs: ExprInfo[];
  loops: LoopInfo[];
  indexNames: Set<string>;
  scopes: ScopeStack;
  nextStatement: number;
};

export function createContext(source: string): Context {
  return {
    source,
    exprs: [],
    loops: [],
    indexNames: new Set(),
    scopes: new ScopeStack(),
    nextStatement: 0,
  };
}

export const lineOf = (node: Node): number => node.loc?.start.line ?? 1;

const textOf = (ctx: Context, node: Node): string => ctx.source.slice(node.start ?? 0, node.end ?? 0);

export const vars = (ctx: Context): Expression => varsLiteral(ctx.scopes.locals());

export function skippable(ctx: Context, node: Node): SkippedPart {
  return { start: node.start ?? 0, end: node.end ?? 0, text: textOf(ctx, node) };
}

export function register(
  ctx: Context,
  node: Node,
  kind: EvalKind,
  parts: SkippedPart[] = [],
  target?: Node,
): number {
  ctx.exprs.push({
    start: node.start ?? 0,
    end: node.end ?? 0,
    text: textOf(ctx, node),
    kind,
    target: target && textOf(ctx, target),
    skippable: parts,
  });
  return ctx.exprs.length - 1;
}
