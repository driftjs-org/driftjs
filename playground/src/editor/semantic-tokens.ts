import * as acorn from 'acorn';
import { DriftLexer, TokenType } from 'driftjs-compiler';
import type { languages, editor } from 'monaco-editor';

/**
 * Standard semantic token types matching Drift SFC constructs.
 */
export const tokenTypes = [
  'keyword',       // 0: directives (@if, @for, @switch, etc.), JS keywords
  'variable',      // 1: state variables, loop variables, references
  'function',      // 2: functions, methods, event handlers
  'parameter',     // 3: function params
  'property',      // 4: HTML attributes (class, id, style), object properties
  'string',        // 5: string literals ("...", '...', `...`)
  'number',        // 6: numeric literals
  'comment',       // 7: <!-- comments -->, // comments, /* comments */
  'tag',           // 8: HTML tags (div, span, button, h2)
  'type',          // 9: Custom components (DriftCodeEditor, etc.)
  'operator',      // 10: ===, !==, +, -, *, /, =>, =, ?, :
];

export const tokenModifiers = [
  'declaration',   // 1 << 0 (1)
  'readonly',      // 1 << 1 (2)
  'defaultLibrary',// 1 << 2 (4)
];

export const semanticTokensLegend: languages.SemanticTokensLegend = {
  tokenTypes,
  tokenModifiers,
};

const JS_KEYWORDS = new Set([
  'let', 'const', 'var', 'function', 'class', 'return', 'import', 'export', 'from', 'default',
  'if', 'else', 'switch', 'case', 'break', 'continue', 'for', 'while', 'do', 'in', 'of',
  'try', 'catch', 'finally', 'throw', 'new', 'typeof', 'instanceof', 'void', 'delete',
  'async', 'await', 'yield', 'this', 'super', 'null', 'true', 'false', 'undefined'
]);

interface RawToken {
  line: number;      // 0-indexed
  char: number;      // 0-indexed
  length: number;
  type: number;      // index in tokenTypes
  modifiers: number; // bitmask
}

interface SpanToken {
  start: number;     // character offset
  end: number;       // character offset
  type: number;
  modifiers: number;
}

/**
 * Splits multi-line tokens so that each token stays strictly within one line.
 */
function pushTokensAcrossLines(
  model: editor.ITextModel,
  startOffset: number,
  endOffset: number,
  type: number,
  modifiers: number,
  out: RawToken[]
) {
  if (startOffset >= endOffset) return;
  const startPos = model.getPositionAt(startOffset);
  const endPos = model.getPositionAt(endOffset);

  if (startPos.lineNumber === endPos.lineNumber) {
    out.push({
      line: startPos.lineNumber - 1,
      char: startPos.column - 1,
      length: endOffset - startOffset,
      type,
      modifiers,
    });
  } else {
    for (let l = startPos.lineNumber; l <= endPos.lineNumber; l++) {
      const lineContent = model.getLineContent(l);
      let colStart = 1;
      let colEnd = lineContent.length + 1;

      if (l === startPos.lineNumber) {
        colStart = startPos.column;
      }
      if (l === endPos.lineNumber) {
        colEnd = endPos.column;
      }

      const len = colEnd - colStart;
      if (len > 0) {
        out.push({
          line: l - 1,
          char: colStart - 1,
          length: len,
          type,
          modifiers,
        });
      }
    }
  }
}

/**
 * Extracts AST and lexical semantic tokens from a Drift source file.
 */
export function extractSemanticTokens(src: string, model: editor.ITextModel): RawToken[] {
  const spanTokens: SpanToken[] = [];
  const declaredVars = new Set<string>();
  const declaredFunctions = new Set<string>();

  function addSpan(start: number, end: number, typeName: string, modifierNames: string[] = []) {
    if (start >= end) return;
    const typeIdx = tokenTypes.indexOf(typeName);
    if (typeIdx === -1) return;
    let mods = 0;
    for (const m of modifierNames) {
      const mi = tokenModifiers.indexOf(m);
      if (mi !== -1) mods |= (1 << mi);
    }
    spanTokens.push({ start, end, type: typeIdx, modifiers: mods });
  }

  // 1. Parse and extract script blocks with Acorn
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(src)) !== null) {
    const scriptContent = scriptMatch[1] ?? '';
    if (!scriptContent) continue;
    const scriptOffset = scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

    try {
      const comments: any[] = [];
      const ast: any = acorn.parse(scriptContent, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ranges: true,
        onComment: comments,
      });

      for (const c of comments) {
        addSpan(scriptOffset + c.start, scriptOffset + c.end, 'comment');
      }

      function findDecls(node: any) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'VariableDeclaration' && Array.isArray(node.declarations)) {
          for (const d of node.declarations) {
            if (d.id?.type === 'Identifier') declaredVars.add(d.id.name);
          }
        } else if (node.type === 'FunctionDeclaration' && node.id?.name) {
          declaredFunctions.add(node.id.name);
        } else if (node.type === 'ImportDeclaration' && Array.isArray(node.specifiers)) {
          for (const s of node.specifiers) {
            if (s.local?.name) declaredVars.add(s.local.name);
          }
        }
        for (const key of Object.keys(node)) {
          if (key === 'loc' || key === 'range') continue;
          const val = node[key];
          if (Array.isArray(val)) val.forEach(findDecls);
          else if (val && typeof val === 'object') findDecls(val);
        }
      }
      findDecls(ast);

      const tokenizer = acorn.tokenizer(scriptContent, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ranges: true,
      });

      let t;
      while ((t = tokenizer.getToken()).type !== acorn.tokTypes.eof) {
        const start = scriptOffset + t.start;
        const end = scriptOffset + t.end;
        const val = scriptContent.slice(t.start, t.end);

        if (JS_KEYWORDS.has(val) || Boolean(t.type.keyword)) {
          addSpan(start, end, 'keyword');
        } else if (t.type === acorn.tokTypes.string) {
          addSpan(start, end, 'string');
        } else if (t.type === acorn.tokTypes.num) {
          addSpan(start, end, 'number');
        } else if (t.type === acorn.tokTypes.name) {
          if (declaredFunctions.has(val)) {
            addSpan(start, end, 'function');
          } else if (declaredVars.has(val)) {
            addSpan(start, end, 'variable');
          } else {
            addSpan(start, end, 'variable');
          }
        }
      }
    } catch {
      // In-progress script syntax errors are ignored gracefully
    }
  }

  // 2. Tokenize template markup and directives using DriftLexer
  function tokenizeJsExpression(expr: string, baseOffset: number) {
    try {
      const tokenizer = acorn.tokenizer(expr, {
        ecmaVersion: 'latest',
        ranges: true,
      });
      let jt;
      while ((jt = tokenizer.getToken()).type !== acorn.tokTypes.eof) {
        const start = baseOffset + jt.start;
        const end = baseOffset + jt.end;
        const val = expr.slice(jt.start, jt.end);

        if (JS_KEYWORDS.has(val) || Boolean(jt.type.keyword)) {
          addSpan(start, end, 'keyword');
        } else if (jt.type === acorn.tokTypes.string) {
          addSpan(start, end, 'string');
        } else if (jt.type === acorn.tokTypes.num) {
          addSpan(start, end, 'number');
        } else if (jt.type === acorn.tokTypes.name) {
          if (declaredFunctions.has(val)) {
            addSpan(start, end, 'function');
          } else if (declaredVars.has(val)) {
            addSpan(start, end, 'variable');
          } else {
            addSpan(start, end, 'variable');
          }
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const lexer = new DriftLexer(src);
    let t;
    let expectingTagName = false;

    while ((t = lexer.nextToken()).type !== TokenType.EOF) {
      const start = t.loc.start.offset;
      const end = t.loc.end.offset;

      if (t.type === TokenType.TagOpen || t.type === TokenType.TagOpenSlash) {
        expectingTagName = true;
      } else if (t.type === TokenType.Identifier) {
        if (expectingTagName) {
          expectingTagName = false;
          // Tag name: div, h2, button, or CustomComponent
          if (t.value !== 'script' && t.value !== 'style') {
            const isCustomComp = /^[A-Z]/.test(t.value);
            addSpan(start, end, isCustomComp ? 'type' : 'tag');
          }
        } else {
          // Attribute name: class, id, onclick, etc.
          if (t.value.startsWith('on')) {
            addSpan(start, end, 'function');
          } else {
            addSpan(start, end, 'property');
          }
        }
      } else if (t.type === TokenType.TagClose || t.type === TokenType.TagSelfClose) {
        expectingTagName = false;
      } else if (t.type === TokenType.StringLiteral) {
        addSpan(start, end, 'string');
      } else if (t.type === TokenType.Comment) {
        addSpan(start, end, 'comment');
      } else if (t.type.startsWith('Directive')) {
        // Directives: @if, @else, @for, @switch, @case, @default, etc.
        const dirMatch = src.slice(start).match(/^@([a-zA-Z]+)/);
        if (dirMatch) {
          const kwLen = dirMatch[0].length;
          addSpan(start, start + kwLen, 'keyword');

          // If it's a loop directive like @for (item in items key item.id)
          if (t.type === TokenType.DirectiveFor && t.value) {
            // Register loop alias identifiers into declaredVars
            const loopMatch = t.value.match(/^\s*\(?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s+in\s+/);
            if (loopMatch) {
              if (loopMatch[1]) declaredVars.add(loopMatch[1]);
              if (loopMatch[2]) declaredVars.add(loopMatch[2]);
            }
          }

          if (t.value) {
            const exprOffset = src.indexOf(t.value, start + kwLen);
            if (exprOffset !== -1) {
              tokenizeJsExpression(t.value, exprOffset);
            }
          }
        }
      } else if (t.type === TokenType.Interpolation) {
        // { expr }
        const innerExpr = t.value;
        const innerStart = start + 1;
        tokenizeJsExpression(innerExpr, innerStart);
      }
    }
  } catch {
    // Lexer parse errors during active typing handled gracefully
  }

  // 3. Sort spans and filter out overlaps
  spanTokens.sort((a, b) => a.start - b.start || a.end - b.end);
  const rawTokens: RawToken[] = [];
  let lastEnd = -1;

  for (const span of spanTokens) {
    if (span.start >= lastEnd) {
      pushTokensAcrossLines(model, span.start, span.end, span.type, span.modifiers, rawTokens);
      lastEnd = span.end;
    }
  }

  return rawTokens;
}

/**
 * Monaco DocumentSemanticTokensProvider implementation for DriftJS.
 */
export const driftSemanticTokensProvider: languages.DocumentSemanticTokensProvider = {
  getLegend() {
    return semanticTokensLegend;
  },
  provideDocumentSemanticTokens(model: editor.ITextModel): languages.SemanticTokens {
    if (model.isDisposed()) {
      return { data: new Uint32Array(0) };
    }

    const code = model.getValue();
    const tokens = extractSemanticTokens(code, model);

    // Sort strictly by line ascending, then char ascending
    tokens.sort((a, b) => a.line - b.line || a.char - b.char);

    const data: number[] = [];
    let prevLine = 0;
    let prevChar = 0;

    for (const tok of tokens) {
      if (tok.length <= 0) continue;
      const deltaLine = tok.line - prevLine;
      const deltaChar = deltaLine === 0 ? tok.char - prevChar : tok.char;

      data.push(deltaLine, deltaChar, tok.length, tok.type, tok.modifiers);

      prevLine = tok.line;
      prevChar = tok.char;
    }

    return {
      data: new Uint32Array(data),
    };
  },
  releaseDocumentSemanticTokens() {
    // Stateless provider
  },
};
