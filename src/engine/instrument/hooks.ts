import type {
  ArrowFunctionExpression,
  CallExpression,
  Expression,
  ExpressionStatement,
  Literal,
} from 'estree';

export const num = (value: number): Literal => ({ type: 'Literal', value });
export const str = (value: string): Literal => ({ type: 'Literal', value });

export const voidZero = (): Expression => ({
  type: 'UnaryExpression',
  operator: 'void',
  prefix: true,
  argument: num(0),
});

export function hook(name: string, args: Expression[]): CallExpression {
  return {
    type: 'CallExpression',
    optional: false,
    callee: {
      type: 'MemberExpression',
      computed: false,
      optional: false,
      object: { type: 'Identifier', name: '__d' },
      property: { type: 'Identifier', name },
    },
    arguments: args,
  };
}

export function isHook(node: Expression, name: string): node is CallExpression {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === '__d' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === name
  );
}

export const asStatement = (expression: Expression): ExpressionStatement => ({
  type: 'ExpressionStatement',
  expression,
});

export const arrow = (body: Expression): ArrowFunctionExpression => ({
  type: 'ArrowFunctionExpression',
  expression: true,
  generator: false,
  async: false,
  params: [],
  body,
});

export function varsLiteral(names: string[]): Expression {
  return {
    type: 'ArrayExpression',
    elements: names.map((name) => ({
      type: 'ArrayExpression',
      elements: [str(name), arrow({ type: 'Identifier', name })],
    })),
  };
}
