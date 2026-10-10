import type {
  CallExpression,
  Expression,
  MemberExpression,
  Node,
  Property,
  SpreadElement,
  UnaryExpression,
  UpdateExpression,
} from 'estree';
import { UnsupportedSyntaxError } from '../parse';
import { childNodes } from '../scope';
import type { EvalKind, SkippedPart } from '../types';
import { type Context, lineOf, register, skippable } from './context';
import { visitClass, visitFunction } from './functions';
import { arrow, hook, isHook, num } from './hooks';

export function wrap(
  ctx: Context,
  original: Node,
  rewritten: Expression,
  kind: EvalKind,
  parts: SkippedPart[] = [],
  target?: Node,
): Expression {
  return hook('v', [num(register(ctx, original, kind, parts, target)), rewritten]);
}

export function branch(test: Expression, ctx: Context): Expression {
  const visited = visitExpression(test, ctx);
  if (isHook(visited, 'v')) return hook('b', visited.arguments as Expression[]);
  return hook('b', [num(register(ctx, test, 'branch')), visited]);
}

export function visitExpression(node: Expression, ctx: Context, name?: string): Expression {
  switch (node.type) {
    case 'Identifier':
      return wrap(ctx, node, node, 'read');
    case 'BinaryExpression': {
      const left = node.left.type === 'PrivateIdentifier' ? node.left : visitExpression(node.left, ctx);
      return wrap(ctx, node, { ...node, left, right: visitExpression(node.right, ctx) }, 'operator');
    }
    case 'LogicalExpression': {
      const rewritten = { ...node, left: visitExpression(node.left, ctx), right: visitPart(node.right, ctx) };
      return wrap(ctx, node, rewritten, 'operator', [skippable(ctx, node.right)]);
    }
    case 'ConditionalExpression': {
      const rewritten = {
        ...node,
        test: branch(node.test, ctx),
        consequent: visitPart(node.consequent, ctx),
        alternate: visitPart(node.alternate, ctx),
      };
      const parts = [skippable(ctx, node.consequent), skippable(ctx, node.alternate)];
      return wrap(ctx, node, rewritten, 'operator', parts);
    }
    case 'UnaryExpression':
      return visitUnary(node, ctx);
    case 'UpdateExpression':
      return visitUpdate(node, ctx);
    case 'AssignmentExpression': {
      const target = node.left.type === 'MemberExpression' ? visitMember(node.left, ctx) : node.left;
      const right = visitExpression(node.right, ctx, node.left.type === 'Identifier' ? node.left.name : undefined);
      return wrap(ctx, node, { ...node, left: target, right }, 'write', [], node.left);
    }
    case 'MemberExpression':
      return wrap(ctx, node, visitMember(node, ctx), 'member');
    case 'CallExpression':
      return visitCall(node, ctx);
    case 'NewExpression': {
      const callee = visitCallee(node.callee, ctx);
      const args = node.arguments.map((argument) => visitArgument(argument, ctx));
      return wrap(ctx, node, { ...node, callee, arguments: args }, 'call');
    }
    case 'ArrayExpression': {
      const elements = node.elements.map((element) => (element ? visitArgument(element, ctx) : null));
      return wrap(ctx, node, { ...node, elements }, 'literal');
    }
    case 'ObjectExpression': {
      const properties = node.properties.map((property) => visitProperty(property, ctx));
      return wrap(ctx, node, { ...node, properties }, 'literal');
    }
    case 'TemplateLiteral': {
      const expressions = node.expressions.map((expression) => visitExpression(expression, ctx));
      return wrap(ctx, node, { ...node, expressions }, 'literal');
    }
    case 'SequenceExpression':
      return { ...node, expressions: node.expressions.map((expression) => visitExpression(expression, ctx)) };
    case 'ChainExpression':
      return wrap(ctx, node, node, 'member');
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return visitFunction(node, ctx, name);
    case 'ClassExpression':
      return visitClass(node, ctx);
    case 'AwaitExpression':
    case 'YieldExpression':
      throw new UnsupportedSyntaxError('await and yield are not supported', lineOf(node), node.loc?.start.column ?? 0);
    default:
      return node;
  }
}

function visitPart(node: Expression, ctx: Context): Expression {
  return node.type === 'Literal' ? wrap(ctx, node, node, 'literal') : visitExpression(node, ctx);
}

function visitArgument(node: Expression | SpreadElement, ctx: Context): Expression | SpreadElement {
  if (node.type === 'SpreadElement') return { ...node, argument: visitExpression(node.argument, ctx) };
  return visitExpression(node, ctx);
}

function visitProperty(node: Property | SpreadElement, ctx: Context): Property | SpreadElement {
  if (node.type === 'SpreadElement') return { ...node, argument: visitExpression(node.argument, ctx) };
  const name = node.key.type === 'Identifier' ? node.key.name : undefined;
  return {
    ...node,
    key: node.computed ? visitExpression(node.key as Expression, ctx) : node.key,
    value: visitExpression(node.value as Expression, ctx, name),
  };
}

function recordIndexNames(ctx: Context, node: Node): void {
  if (node.type === 'Identifier') ctx.indexNames.add(node.name);
  childNodes(node).forEach((child) => recordIndexNames(ctx, child));
}

function visitMember(node: MemberExpression, ctx: Context): MemberExpression {
  const keepObject = node.object.type === 'Identifier' || node.object.type === 'Super';
  const object = keepObject ? node.object : visitExpression(node.object as Expression, ctx);
  if (!node.computed || node.property.type === 'Literal') return { ...node, object } as MemberExpression;
  recordIndexNames(ctx, node.property);
  return { ...node, object, property: visitExpression(node.property as Expression, ctx) } as MemberExpression;
}

function visitCallee(callee: CallExpression['callee'], ctx: Context): CallExpression['callee'] {
  if (callee.type === 'MemberExpression') return visitMember(callee, ctx);
  if (callee.type === 'Identifier' || callee.type === 'Super') return callee;
  return visitExpression(callee, ctx);
}

const isConsoleCall = (node: CallExpression): boolean =>
  node.callee.type === 'MemberExpression' &&
  node.callee.object.type === 'Identifier' &&
  node.callee.object.name === 'console';

function visitCall(node: CallExpression, ctx: Context): Expression {
  const rewritten: CallExpression = {
    ...node,
    callee: visitCallee(node.callee, ctx),
    arguments: node.arguments.map((argument) => visitArgument(argument, ctx)),
  };
  return isConsoleCall(node) ? rewritten : wrap(ctx, node, rewritten, 'call');
}

function visitReference(node: Expression, ctx: Context): Expression {
  if (node.type === 'MemberExpression') return visitMember(node, ctx);
  return node.type === 'Identifier' ? node : visitExpression(node, ctx);
}

function visitUnary(node: UnaryExpression, ctx: Context): Expression {
  const raw = node.operator === 'typeof' || node.operator === 'delete';
  const argument = raw ? visitReference(node.argument, ctx) : visitExpression(node.argument, ctx);
  return wrap(ctx, node, { ...node, argument }, 'operator');
}

function visitUpdate(node: UpdateExpression, ctx: Context): Expression {
  const argument: UpdateExpression['argument'] =
    node.argument.type === 'MemberExpression' ? visitMember(node.argument, ctx) : node.argument;
  const rewritten = { ...node, argument } as UpdateExpression;
  if (node.argument.type !== 'Identifier') return wrap(ctx, node, rewritten as Expression, 'write', [], node.argument);
  const id = register(ctx, node, 'write', [], node.argument);
  return hook('u', [num(id), rewritten as Expression, arrow(node.argument)]);
}
