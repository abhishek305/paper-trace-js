import { parse as acornParse } from 'acorn';
import type { Program } from 'estree';
import type { SourceError } from './types';

export class UnsupportedSyntaxError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(message);
  }
}

export function parse(source: string): Program {
  const options = { ecmaVersion: 'latest', sourceType: 'script', locations: true } as const;
  return acornParse(source, options) as unknown as Program;
}

function withoutPosition(message: string): string {
  const cut = message.lastIndexOf(' (');
  return cut === -1 ? message : message.slice(0, cut);
}

export function toSourceError(error: unknown): SourceError {
  if (error instanceof UnsupportedSyntaxError) {
    return { message: error.message, line: error.line, column: error.column };
  }
  if (error instanceof SyntaxError && 'loc' in error) {
    const { line, column } = error.loc as { line: number; column: number };
    return { message: withoutPosition(error.message), line, column };
  }
  return { message: error instanceof Error ? error.message : String(error), line: 1, column: 0 };
}
