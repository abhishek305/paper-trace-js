import type {
  ArrowFunctionExpression,
  ClassDeclaration,
  ClassExpression,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  MethodDefinition,
  ReturnStatement,
  Statement,
  TryStatement,
} from 'estree';
import { UnsupportedSyntaxError } from '../parse';
import { lexicalNames, patternNames, varNames } from '../scope';
import { type Context, lineOf, vars } from './context';
import { asStatement, hook, num, str } from './hooks';
import { visitStatements } from './statements';

type FunctionNode = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

const returnOf = (argument: Expression): ReturnStatement => ({ type: 'ReturnStatement', argument });

const withExit = (body: Statement[]): TryStatement => ({
  type: 'TryStatement',
  block: { type: 'BlockStatement', body },
  handler: null,
  finalizer: { type: 'BlockStatement', body: [asStatement(hook('exit', []))] },
});

export function visitFunction<T extends FunctionNode>(node: T, ctx: Context, name?: string): T {
  const isGenerator = node.type !== 'ArrowFunctionExpression' && node.generator;
  if (node.async || isGenerator) {
    const column = node.loc?.start.column ?? 0;
    throw new UnsupportedSyntaxError('async and generator functions are not supported', lineOf(node), column);
  }
  const statements = node.body.type === 'BlockStatement' ? node.body.body : [returnOf(node.body)];
  const own = node.type !== 'ArrowFunctionExpression' && node.id ? node.id.name : name;
  const names = [...node.params.flatMap(patternNames), ...varNames(node.body), ...lexicalNames(statements)];
  ctx.scopes.push(names, true);
  const enter = hook('enter', [num(ctx.nextStatement++), str(own ?? '(anonymous)'), num(lineOf(node)), vars(ctx)]);
  const body = visitStatements(statements, ctx);
  ctx.scopes.pop();
  return { ...node, expression: false, body: { type: 'BlockStatement', body: [asStatement(enter), withExit(body)] } };
}

function visitMethod(member: MethodDefinition, ctx: Context): MethodDefinition {
  const name = member.key.type === 'Identifier' ? member.key.name : undefined;
  return { ...member, value: visitFunction(member.value, ctx, name) };
}

export function visitClass<T extends ClassDeclaration | ClassExpression>(node: T, ctx: Context): T {
  const members = node.body.body.map((member) =>
    member.type === 'MethodDefinition' ? visitMethod(member, ctx) : member,
  );
  return { ...node, body: { ...node.body, body: members } };
}
