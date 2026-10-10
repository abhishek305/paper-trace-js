import { generate } from 'astring';
import type { Statement } from 'estree';
import { parse } from '../parse';
import { lexicalNames, varNames } from '../scope';
import type { ExprInfo, LoopInfo } from '../types';
import { createContext } from './context';
import { asStatement, hook, varsLiteral } from './hooks';
import { visitStatements } from './statements';

export type Instrumented = {
  code: string;
  exprs: ExprInfo[];
  loops: LoopInfo[];
  indexNames: string[];
};

export function instrument(source: string): Instrumented {
  const program = parse(source);
  const statements = program.body as Statement[];
  const ctx = createContext(source);
  ctx.scopes.push([...varNames(program), ...lexicalNames(statements)], true);
  const globals = ctx.scopes.locals();
  const body = visitStatements(statements, ctx);
  const init = asStatement(hook('init', [varsLiteral(globals)]));
  return {
    code: generate({ ...program, body: [init, ...body] } as Parameters<typeof generate>[0]),
    exprs: ctx.exprs,
    loops: ctx.loops,
    indexNames: [...ctx.indexNames],
  };
}
