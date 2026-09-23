import { DriftLexer, DriftParser } from 'driftjs-compiler';
import type { ProgramNode } from 'driftjs-compiler';

/**
 * Parses Drift template and Single File Component into a Drift AST.
 */
export function parse(text: string): ProgramNode {
  const lexer = new DriftLexer(text);
  const parser = new DriftParser(lexer);
  return parser.parse();
}

/**
 * Returns character start offset for a node.
 */
export function locStart(node: any): number {
  return node?.loc?.start?.offset ?? 0;
}

/**
 * Returns character end offset for a node.
 */
export function locEnd(node: any): number {
  return node?.loc?.end?.offset ?? 0;
}
