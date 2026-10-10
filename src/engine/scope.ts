import type { Node, Pattern, Statement } from 'estree';

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && 'type' in value;

export function childNodes(node: Node): Node[] {
  return Object.values(node).flatMap((value: unknown) => {
    if (Array.isArray(value)) return value.filter(isNode);
    return isNode(value) ? [value] : [];
  });
}

const isFunction = (node: Node): boolean =>
  node.type === 'FunctionDeclaration' ||
  node.type === 'FunctionExpression' ||
  node.type === 'ArrowFunctionExpression';

export function patternNames(pattern: Pattern): string[] {
  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name];
    case 'ObjectPattern':
      return pattern.properties.flatMap((property) =>
        patternNames(property.type === 'RestElement' ? property.argument : property.value),
      );
    case 'ArrayPattern':
      return pattern.elements.flatMap((element) => (element ? patternNames(element) : []));
    case 'RestElement':
      return patternNames(pattern.argument);
    case 'AssignmentPattern':
      return patternNames(pattern.left);
    default:
      return [];
  }
}

export function lexicalNames(statements: Statement[]): string[] {
  return statements.flatMap((statement) => {
    if (statement.type === 'VariableDeclaration' && statement.kind !== 'var') {
      return statement.declarations.flatMap((declarator) => patternNames(declarator.id));
    }
    if (statement.type === 'ClassDeclaration' && statement.id) return [statement.id.name];
    return [];
  });
}

export function varNames(node: Node): string[] {
  if (isFunction(node)) return [];
  const own =
    node.type === 'VariableDeclaration' && node.kind === 'var'
      ? node.declarations.flatMap((declarator) => patternNames(declarator.id))
      : [];
  return [...own, ...childNodes(node).flatMap(varNames)];
}

type Scope = { names: string[]; boundary: boolean };

export class ScopeStack {
  private readonly scopes: Scope[] = [];

  push(names: string[], boundary = false): void {
    this.scopes.push({ names, boundary });
  }

  pop(): void {
    this.scopes.pop();
  }

  locals(): string[] {
    const start = this.scopes.findLastIndex((scope) => scope.boundary);
    return [...new Set(this.scopes.slice(Math.max(start, 0)).flatMap((scope) => scope.names))];
  }
}
