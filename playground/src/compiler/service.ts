import { compile } from 'driftjs-compiler';
import type { CompilationResult } from '../types.js';

/**
 * Extracts line and column numbers from a compiler/parser/lexer error.
 */
function extractErrorLocation(err: any): { line?: number; column?: number } {
  if (typeof err.line === 'number') {
    return { line: err.line, column: err.column ?? 1 };
  }
  if (err.loc && typeof err.loc.line === 'number') {
    return { line: err.loc.line, column: err.loc.column ?? 1 };
  }
  if (err.location && typeof err.location.line === 'number') {
    return { line: err.location.line, column: err.location.column ?? 1 };
  }

  // Parse message for (line:col) or line X, col Y
  if (typeof err.message === 'string') {
    const match = err.message.match(/(?:at\s+|line\s+|:)(\d+)[:,\s]+(?:col\s+|column\s+)?(\d+)/i);
    if (match) {
      return { line: parseInt(match[1], 10), column: parseInt(match[2], 10) };
    }
  }

  return {};
}

/**
 * Compiles a .drift SFC source string in the browser.
 */
export function compileDriftSource(source: string): CompilationResult {
  const startTime = performance.now();
  try {
    const module = compile(source);
    const duration = performance.now() - startTime;

    return {
      success: true,
      module,
      compileDurationMs: Number(duration.toFixed(2)),
    };
  } catch (err: any) {
    const duration = performance.now() - startTime;
    const { line, column } = extractErrorLocation(err);

    return {
      success: false,
      compileDurationMs: Number(duration.toFixed(2)),
      error: {
        message: err?.message || String(err),
        line,
        column,
      },
    };
  }
}
