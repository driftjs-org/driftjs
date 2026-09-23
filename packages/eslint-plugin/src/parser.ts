import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { DriftLexer, DriftParser } from 'driftjs-compiler';
import { ASTNodeType } from 'driftjs-compiler';
import type {
  ProgramNode,
  TemplateChildNode,
  ElementNode,
  InterpolationNode,
  IfNode,
  ForNode,
  SwitchNode,
  AsyncNode,
  SourceRange,
} from 'driftjs-compiler';
import type {
  DriftParserOptions,
  ESLintParseResult,
  DriftParserServices,
  DriftParseErrorDetail,
  DriftDirectiveInfo,
  DriftEventHandlerInfo,
  DriftScriptBlockInfo,
} from '../types/index.js';

interface LocPosition {
  line: number;
  column: number;
  offset: number;
}

function calculateOffset(code: string, targetOffset: number): LocPosition {
  let line = 1;
  let column = 0;
  for (let i = 0; i < targetOffset && i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  return { line, column, offset: targetOffset };
}

function adjustPosition(
  pos: { line: number; column: number },
  startLine: number,
  startColumn: number
): { line: number; column: number } {
  if (pos.line === 1) {
    return {
      line: startLine,
      column: pos.column + startColumn,
    };
  }
  return {
    line: pos.line + startLine - 1,
    column: pos.column,
  };
}

function adjustNodeLocations(
  ast: any,
  tokens: any[],
  comments: any[],
  startLine: number,
  startColumn: number,
  startOffset: number
): void {
  const adjustLoc = (loc: any) => {
    if (!loc) return;
    if (loc.start) {
      loc.start = adjustPosition(loc.start, startLine, startColumn);
    }
    if (loc.end) {
      loc.end = adjustPosition(loc.end, startLine, startColumn);
    }
  };

  walk.full(ast, (node: any) => {
    if (node.loc) {
      adjustLoc(node.loc);
    }
    if (typeof node.start === 'number') {
      node.start += startOffset;
    }
    if (typeof node.end === 'number') {
      node.end += startOffset;
    }
    if (Array.isArray(node.range)) {
      node.range[0] += startOffset;
      node.range[1] += startOffset;
    }
  });

  for (const token of tokens) {
    if (token.loc) {
      adjustLoc(token.loc);
    }
    if (typeof token.start === 'number') {
      token.start += startOffset;
    }
    if (typeof token.end === 'number') {
      token.end += startOffset;
    }
    if (Array.isArray(token.range)) {
      token.range[0] += startOffset;
      token.range[1] += startOffset;
    }
  }

  for (const comment of comments) {
    if (comment.loc) {
      adjustLoc(comment.loc);
    }
    if (typeof comment.start === 'number') {
      comment.start += startOffset;
    }
    if (typeof comment.end === 'number') {
      comment.end += startOffset;
    }
    if (Array.isArray(comment.range)) {
      comment.range[0] += startOffset;
      comment.range[1] += startOffset;
    }
  }
}

function extractDeclaredVariables(ast: any): Set<string> {
  const declared = new Set<string>();

  const extractPatternNames = (pattern: any) => {
    if (!pattern) return;
    if (pattern.type === 'Identifier') {
      declared.add(pattern.name);
    } else if (pattern.type === 'ObjectPattern') {
      for (const prop of pattern.properties) {
        if (prop.type === 'Property') {
          extractPatternNames(prop.value);
        } else if (prop.type === 'RestElement') {
          extractPatternNames(prop.argument);
        }
      }
    } else if (pattern.type === 'ArrayPattern') {
      for (const el of pattern.elements) {
        if (el) extractPatternNames(el);
      }
    } else if (pattern.type === 'RestElement') {
      extractPatternNames(pattern.argument);
    } else if (pattern.type === 'AssignmentPattern') {
      extractPatternNames(pattern.left);
    }
  };

  walk.simple(ast, {
    VariableDeclarator(node: any) {
      extractPatternNames(node.id);
    },
    FunctionDeclaration(node: any) {
      if (node.id?.name) declared.add(node.id.name);
    },
    ClassDeclaration(node: any) {
      if (node.id?.name) declared.add(node.id.name);
    },
    ImportDeclaration(node: any) {
      for (const spec of node.specifiers) {
        if (spec.local?.name) declared.add(spec.local.name);
      }
    },
  });

  return declared;
}

function extractIdentifiersFromExpression(exprStr: string): Set<string> {
  const ids = new Set<string>();
  const trimmed = exprStr.trim();
  if (!trimmed) return ids;

  try {
    const exprAst = acorn.parseExpressionAt(trimmed, 0, {
      ecmaVersion: 'latest',
      allowAwaitOutsideFunction: true,
    });

    walk.simple(exprAst, {
      Identifier(node: any) {
        ids.add(node.name);
      },
      MemberExpression(node: any) {
        // Only add object if it is an identifier, property is not a free variable
        if (node.object.type === 'Identifier') {
          ids.add(node.object.name);
        }
      },
    });
  } catch {
    // If expression fails to parse, extract word identifiers with regex fallback
    const matches = trimmed.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g);
    if (matches) {
      for (const m of matches) {
        ids.add(m);
      }
    }
  }

  return ids;
}

function collectTemplateDetails(
  ast: ProgramNode,
  sourceCode: string
): {
  referencedVars: Set<string>;
  directives: DriftDirectiveInfo[];
  eventHandlers: DriftEventHandlerInfo[];
} {
  const referencedVars = new Set<string>();
  const directives: DriftDirectiveInfo[] = [];
  const eventHandlers: DriftEventHandlerInfo[] = [];

  const visitNode = (node: TemplateChildNode) => {
    switch (node.type) {
      case ASTNodeType.Element: {
        const elem = node as ElementNode;
        if (elem.tagName !== 'script') {
          for (const attr of elem.attributes) {
            const isEvent = attr.name.toLowerCase().startsWith('on');
            const isDynamic = typeof attr.value !== 'string' && attr.value !== null;
            if (isEvent) {
              eventHandlers.push({
                name: attr.name,
                loc: attr.loc,
                isDynamic,
              });
            }
            if (attr.value && typeof attr.value !== 'string') {
              const expr = attr.value.expression;
              const exprStr = typeof expr === 'string' ? expr : '';
              if (exprStr) {
                for (const id of extractIdentifiersFromExpression(exprStr)) {
                  referencedVars.add(id);
                }
              }
            }
          }
          for (const child of elem.children) {
            visitNode(child);
          }
        }
        break;
      }
      case ASTNodeType.Interpolation: {
        const interp = node as InterpolationNode;
        const exprStr = typeof interp.expression === 'string' ? interp.expression : '';
        if (exprStr) {
          for (const id of extractIdentifiersFromExpression(exprStr)) {
            referencedVars.add(id);
          }
        }
        break;
      }
      case ASTNodeType.If: {
        const ifNode = node as IfNode;
        directives.push({
          name: 'if',
          loc: ifNode.loc,
          raw: sourceCode.slice(ifNode.loc.start.offset, ifNode.loc.end.offset),
        });
        const testStr = typeof ifNode.test === 'string' ? ifNode.test : '';
        if (testStr) {
          for (const id of extractIdentifiersFromExpression(testStr)) {
            referencedVars.add(id);
          }
        }
        for (const child of ifNode.consequent) {
          visitNode(child);
        }
        if (ifNode.alternate) {
          if (Array.isArray(ifNode.alternate)) {
            for (const child of ifNode.alternate) {
              visitNode(child);
            }
          } else {
            visitNode(ifNode.alternate as IfNode);
          }
        }
        break;
      }
      case ASTNodeType.For: {
        const forNode = node as ForNode;
        directives.push({
          name: 'for',
          loc: forNode.loc,
          raw: sourceCode.slice(forNode.loc.start.offset, forNode.loc.end.offset),
        });
        const iterStr = typeof forNode.iterable === 'string' ? forNode.iterable : '';
        if (iterStr) {
          for (const id of extractIdentifiersFromExpression(iterStr)) {
            referencedVars.add(id);
          }
        }
        if (forNode.key && typeof forNode.key === 'string') {
          for (const id of extractIdentifiersFromExpression(forNode.key)) {
            referencedVars.add(id);
          }
        }
        for (const child of forNode.body) {
          visitNode(child);
        }
        break;
      }
      case ASTNodeType.Switch: {
        const switchNode = node as SwitchNode;
        directives.push({
          name: 'switch',
          loc: switchNode.loc,
          raw: sourceCode.slice(switchNode.loc.start.offset, switchNode.loc.end.offset),
        });
        const discStr = typeof switchNode.discriminant === 'string' ? switchNode.discriminant : '';
        if (discStr) {
          for (const id of extractIdentifiersFromExpression(discStr)) {
            referencedVars.add(id);
          }
        }
        for (const c of switchNode.cases) {
          if (c.expression && typeof c.expression === 'string') {
            for (const id of extractIdentifiersFromExpression(c.expression)) {
              referencedVars.add(id);
            }
          }
          for (const child of c.body) {
            visitNode(child);
          }
        }
        break;
      }
      case ASTNodeType.Async: {
        const asyncNode = node as AsyncNode;
        directives.push({
          name: 'async',
          loc: asyncNode.loc,
          raw: sourceCode.slice(asyncNode.loc.start.offset, asyncNode.loc.end.offset),
        });
        const promStr = typeof asyncNode.promise === 'string' ? asyncNode.promise : '';
        if (promStr) {
          for (const id of extractIdentifiersFromExpression(promStr)) {
            referencedVars.add(id);
          }
        }
        for (const child of asyncNode.body) {
          visitNode(child);
        }
        if (asyncNode.fallback) {
          for (const child of asyncNode.fallback) {
            visitNode(child);
          }
        }
        if (asyncNode.catchBranch) {
          for (const child of asyncNode.catchBranch.body) {
            visitNode(child);
          }
        }
        break;
      }
    }
  };

  for (const child of ast.body) {
    visitNode(child);
  }

  return { referencedVars, directives, eventHandlers };
}

/**
 * Custom ESLint parser for Drift (.drift) Single File Components.
 */
export function parseForESLint(code: string, options?: DriftParserOptions): ESLintParseResult {
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const scriptBlocks: DriftScriptBlockInfo[] = [];
  let primaryMatch: {
    startOffset: number;
    content: string;
    attrs: string;
    loc: SourceRange;
  } | null = null;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(code)) !== null) {
    const fullMatch = match[0];
    const attrs = match[1] ?? '';
    const content = match[2] ?? '';
    const matchIndex = match.index;
    const startLoc = calculateOffset(code, matchIndex);
    const endLoc = calculateOffset(code, matchIndex + fullMatch.length);

    const isModule = /context\s*=\s*["']module["']/i.test(attrs);
    const blockInfo: DriftScriptBlockInfo = {
      loc: { start: startLoc, end: endLoc },
      isModule,
    };
    scriptBlocks.push(blockInfo);

    if (!primaryMatch) {
      const openTag = `<script${attrs}>`;
      const contentStartOffset = matchIndex + openTag.length;
      const contentStartLoc = calculateOffset(code, contentStartOffset);
      const contentEndLoc = calculateOffset(code, contentStartOffset + content.length);
      primaryMatch = {
        startOffset: contentStartOffset,
        content,
        attrs,
        loc: { start: contentStartLoc, end: contentEndLoc },
      };
    }
  }

  const scriptContent = primaryMatch?.content ?? '';
  const scriptRange = primaryMatch
    ? {
        start: primaryMatch.startOffset,
        end: primaryMatch.startOffset + primaryMatch.content.length,
        startLine: primaryMatch.loc.start.line,
        startColumn: primaryMatch.loc.start.column,
      }
    : null;

  const tokens: any[] = [];
  const comments: any[] = [];
  let ast: any;

  try {
    ast = acorn.parse(scriptContent, {
      ecmaVersion: (options?.ecmaVersion as any) || 'latest',
      sourceType: options?.sourceType || 'module',
      locations: true,
      ranges: true,
      onToken: tokens,
      onComment: comments,
    });
  } catch (err: any) {
    if (scriptRange && err?.loc) {
      const remappedLoc = adjustPosition(err.loc, scriptRange.startLine, scriptRange.startColumn);
      const error: any = new SyntaxError(err.message.replace(/\s*\(\d+:\d+\)$/, ''));
      error.loc = remappedLoc;
      error.line = remappedLoc.line;
      error.column = remappedLoc.column;
      error.index = (err.pos ?? 0) + scriptRange.start;
      throw error;
    }
    throw err;
  }

  if (scriptRange) {
    adjustNodeLocations(
      ast,
      tokens,
      comments,
      scriptRange.startLine,
      scriptRange.startColumn,
      scriptRange.start
    );
  } else {
    ast.loc = {
      start: { line: 1, column: 0 },
      end: calculateOffset(code, code.length),
    };
    ast.range = [0, code.length];
    ast.start = 0;
    ast.end = code.length;
  }

  ast.tokens = tokens;
  ast.comments = comments;

  const declaredScriptVars = extractDeclaredVariables(ast);

  let templateAst: ProgramNode | null = null;
  const parseErrors: DriftParseErrorDetail[] = [];
  let templateReferencedVars = new Set<string>();
  let directives: DriftDirectiveInfo[] = [];
  let eventHandlers: DriftEventHandlerInfo[] = [];

  try {
    const lexer = new DriftLexer(code);
    const parser = new DriftParser(lexer);
    templateAst = parser.parse();
    const details = collectTemplateDetails(templateAst, code);
    templateReferencedVars = details.referencedVars;
    directives = details.directives;
    eventHandlers = details.eventHandlers;
  } catch (err: any) {
    parseErrors.push({
      message: String(err?.message || err),
      line: Number(err?.line) || 1,
      column: Number(err?.column) || 0,
      offset: Number(err?.offset) || 0,
    });
  }

  const varsToKeep = new Set<string>();
  for (const varName of templateReferencedVars) {
    if (declaredScriptVars.has(varName)) {
      varsToKeep.add(varName);
    }
  }

  if (varsToKeep.size > 0) {
    const dummyLoc = {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 0 },
    };
    const syntheticNode: any = {
      type: 'ExpressionStatement',
      expression: {
        type: 'ObjectExpression',
        properties: Array.from(varsToKeep).map((name) => {
          const idNode = {
            type: 'Identifier',
            name,
            start: 0,
            end: 0,
            loc: dummyLoc,
            range: [0, 0],
          };
          tokens.push({
            type: { label: 'name' },
            value: name,
            start: 0,
            end: 0,
            loc: dummyLoc,
            range: [0, 0],
          });
          return {
            type: 'Property',
            key: idNode,
            value: idNode,
            kind: 'init',
            method: false,
            shorthand: true,
            computed: false,
            start: 0,
            end: 0,
            loc: dummyLoc,
            range: [0, 0],
          };
        }),
        start: 0,
        end: 0,
        loc: dummyLoc,
        range: [0, 0],
      },
      start: 0,
      end: 0,
      loc: dummyLoc,
      range: [0, 0],
    };
    ast.body.push(syntheticNode);
  }

  const services: DriftParserServices = {
    templateAst,
    templateTokens: [],
    scriptRange,
    scriptContent,
    declaredScriptVars,
    templateReferencedVars,
    parseErrors,
    directives,
    eventHandlers,
    scriptBlocks,
  };

  return {
    ast,
    services: {
      drift: services,
    },
    visitorKeys: null,
    scopeManager: null,
  };
}

/**
 * Standard parse function returning raw AST.
 */
export function parse(code: string, options?: DriftParserOptions): any {
  return parseForESLint(code, options).ast;
}
