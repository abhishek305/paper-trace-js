import type {
  BlockStatement,
  CatchClause,
  DoWhileStatement,
  Expression,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  Statement,
  SwitchStatement,
  TryStatement,
  VariableDeclaration,
  WhileStatement,
} from 'estree';
import { lexicalNames, patternNames } from '../scope';
import { type Context, lineOf, vars } from './context';
import { branch, visitExpression, wrap } from './expressions';
import { visitClass, visitFunction } from './functions';
import { arrow, asStatement, hook, num, voidZero } from './hooks';

const SILENT = new Set([
  'BlockStatement',
  'FunctionDeclaration',
  'ClassDeclaration',
  'EmptyStatement',
  'TryStatement',
]);

export function visitStatements(statements: Statement[], ctx: Context): Statement[] {
  return statements.flatMap((statement) => visitStatement(statement, ctx));
}

function visitStatement(statement: Statement, ctx: Context): Statement[] {
  if (SILENT.has(statement.type)) return [rewrite(statement, ctx, -1)];
  const id = ctx.nextStatement++;
  const entry = asStatement(hook('stmt', [num(id), num(lineOf(statement)), vars(ctx)]));
  return [entry, rewrite(statement, ctx, id)];
}

function rewrite(statement: Statement, ctx: Context, id: number): Statement {
  switch (statement.type) {
    case 'ExpressionStatement':
      return { ...statement, expression: visitExpression(statement.expression, ctx) };
    case 'VariableDeclaration':
      return visitDeclaration(statement, ctx);
    case 'ReturnStatement': {
      const value = statement.argument ? visitExpression(statement.argument, ctx) : voidZero();
      return { ...statement, argument: hook('ret', [value]) };
    }
    case 'ThrowStatement':
      return { ...statement, argument: visitExpression(statement.argument, ctx) };
    case 'IfStatement':
      return {
        ...statement,
        test: branch(statement.test, ctx),
        consequent: body(statement.consequent, ctx),
        alternate: statement.alternate ? body(statement.alternate, ctx) : null,
      };
    case 'ForStatement':
      return visitFor(statement, ctx, id);
    case 'WhileStatement':
    case 'DoWhileStatement':
      return visitConditionLoop(statement, ctx, id);
    case 'ForOfStatement':
    case 'ForInStatement':
      return visitForEach(statement, ctx, id);
    case 'BlockStatement':
      return block(statement, ctx);
    case 'SwitchStatement':
      return visitSwitch(statement, ctx);
    case 'TryStatement':
      return visitTry(statement, ctx);
    case 'LabeledStatement':
      return { ...statement, body: rewrite(statement.body, ctx, id) };
    case 'FunctionDeclaration':
      return visitFunction(statement, ctx);
    case 'ClassDeclaration':
      return visitClass(statement, ctx);
    default:
      return statement;
  }
}

function block(node: BlockStatement, ctx: Context): BlockStatement {
  ctx.scopes.push(lexicalNames(node.body));
  const rewritten = { ...node, body: visitStatements(node.body, ctx) };
  ctx.scopes.pop();
  return rewritten;
}

function body(statement: Statement, ctx: Context): BlockStatement {
  if (statement.type === 'BlockStatement') return block(statement, ctx);
  return { type: 'BlockStatement', body: visitStatement(statement, ctx) };
}

export function visitDeclaration(node: VariableDeclaration, ctx: Context): VariableDeclaration {
  const declarations = node.declarations.map((declarator) => {
    if (!declarator.init) return declarator;
    const name = declarator.id.type === 'Identifier' ? declarator.id.name : undefined;
    const init = visitExpression(declarator.init, ctx, name);
    const isDefinition = ['FunctionExpression', 'ArrowFunctionExpression', 'ClassExpression'].includes(
      declarator.init.type,
    );
    if (isDefinition) return { ...declarator, init };
    return { ...declarator, init: wrap(ctx, declarator, init, 'write', [], declarator.id) };
  });
  return { ...node, declarations };
}

function registerLoop(ctx: Context, id: number, node: Statement): void {
  const startLine = lineOf(node);
  ctx.loops.push({ id, startLine, endLine: node.loc?.end.line ?? startLine });
}

function loopTest(test: Expression, ctx: Context, id: number, line: number): Expression {
  return hook('loop', [num(id), num(line), vars(ctx), arrow(branch(test, ctx))]);
}

function visitFor(node: ForStatement, ctx: Context, id: number): ForStatement {
  registerLoop(ctx, id, node);
  const line = lineOf(node);
  ctx.scopes.push(node.init?.type === 'VariableDeclaration' ? lexicalNames([node.init]) : []);
  const init = node.init?.type === 'VariableDeclaration' ? visitDeclaration(node.init, ctx) : node.init && visitExpression(node.init, ctx);
  const test = node.test && loopTest(node.test, ctx, id, line);
  const update = node.update && hook('update', [num(id), num(line), vars(ctx), arrow(visitExpression(node.update, ctx))]);
  const rewritten = { ...node, init, test, update, body: body(node.body, ctx) };
  ctx.scopes.pop();
  return rewritten;
}

function visitConditionLoop(
  node: WhileStatement | DoWhileStatement,
  ctx: Context,
  id: number,
): WhileStatement | DoWhileStatement {
  registerLoop(ctx, id, node);
  return { ...node, test: loopTest(node.test, ctx, id, lineOf(node)), body: body(node.body, ctx) };
}

function visitForEach(
  node: ForOfStatement | ForInStatement,
  ctx: Context,
  id: number,
): ForOfStatement | ForInStatement {
  registerLoop(ctx, id, node);
  const right = visitExpression(node.right, ctx);
  ctx.scopes.push(node.left.type === 'VariableDeclaration' ? lexicalNames([node.left]) : []);
  const iteration = asStatement(hook('iter', [num(id), num(lineOf(node)), vars(ctx)]));
  const inner = body(node.body, ctx);
  ctx.scopes.pop();
  return { ...node, right, body: { ...inner, body: [iteration, ...inner.body] } };
}

function visitSwitch(node: SwitchStatement, ctx: Context): SwitchStatement {
  ctx.scopes.push(lexicalNames(node.cases.flatMap((clause) => clause.consequent)));
  const rewritten = {
    ...node,
    discriminant: visitExpression(node.discriminant, ctx),
    cases: node.cases.map((clause) => ({
      ...clause,
      test: clause.test && visitExpression(clause.test, ctx),
      consequent: visitStatements(clause.consequent, ctx),
    })),
  };
  ctx.scopes.pop();
  return rewritten;
}

function visitCatch(clause: CatchClause, ctx: Context): CatchClause {
  ctx.scopes.push(clause.param ? patternNames(clause.param) : []);
  const rewritten = { ...clause, body: block(clause.body, ctx) };
  ctx.scopes.pop();
  return rewritten;
}

function visitTry(node: TryStatement, ctx: Context): TryStatement {
  return {
    ...node,
    block: block(node.block, ctx),
    handler: node.handler && visitCatch(node.handler, ctx),
    finalizer: node.finalizer && block(node.finalizer, ctx),
  };
}
