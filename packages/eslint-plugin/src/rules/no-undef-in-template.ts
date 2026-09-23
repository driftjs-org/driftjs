import type { DriftRuleModule } from '../../types/index.js';
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
} from 'driftjs-compiler';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const KNOWN_GLOBALS = new Set([
  'props',
  '__drift_mark_dirty__',
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'console',
  'globalThis',
  'Math',
  'JSON',
  'Date',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'RegExp',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Symbol',
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'Infinity',
  'NaN',
  'undefined',
  'null',
  'true',
  'false',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURI',
  'encodeURIComponent',
  'decodeURI',
  'decodeURIComponent',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'fetch',
  'alert',
]);

function extractExpressionIdentifiersWithLoc(
  exprStr: string,
  baseOffset: { line: number; column: number }
): Array<{ name: string; loc: { line: number; column: number } }> {
  const result: Array<{ name: string; loc: { line: number; column: number } }> = [];
  const trimmed = exprStr.trim();
  if (!trimmed) return result;

  try {
    const exprAst = acorn.parseExpressionAt(trimmed, 0, {
      ecmaVersion: 'latest',
      allowAwaitOutsideFunction: true,
      locations: true,
    });

    walk.simple(exprAst, {
      Identifier(node: any) {
        const line = baseOffset.line + (node.loc?.start?.line ?? 1) - 1;
        const column =
          (node.loc?.start?.line ?? 1) === 1
            ? baseOffset.column + (node.loc?.start?.column ?? 0)
            : node.loc?.start?.column ?? 0;
        result.push({ name: node.name, loc: { line, column } });
      },
      MemberExpression(node: any) {
        if (node.object.type === 'Identifier') {
          const line = baseOffset.line + (node.object.loc?.start?.line ?? 1) - 1;
          const column =
            (node.object.loc?.start?.line ?? 1) === 1
              ? baseOffset.column + (node.object.loc?.start?.column ?? 0)
              : node.object.loc?.start?.column ?? 0;
          result.push({ name: node.object.name, loc: { line, column } });
        }
      },
    });
  } catch {
    const matches = [...trimmed.matchAll(/[a-zA-Z_$][a-zA-Z0-9_$]*/g)];
    for (const m of matches) {
      if (m.index !== undefined) {
        result.push({
          name: m[0],
          loc: {
            line: baseOffset.line,
            column: baseOffset.column + m.index,
          },
        });
      }
    }
  }

  return result;
}

export const noUndefInTemplateRule: DriftRuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow variables in template expressions that are not declared in <script> or directive scope',
      recommended: true,
    },
    schema: [],
    messages: {
      undefVar: "'{{name}}' is not defined in <script> or template scope.",
    },
  },
  create(context) {
    return {
      Program() {
        const services = context.sourceCode?.parserServices?.drift;
        if (!services || !services.templateAst) return;

        const declaredVars = new Set<string>(services.declaredScriptVars);
        const reported = new Set<string>();

        const checkIdentifiers = (
          exprStr: string,
          baseLoc: { line: number; column: number },
          scopeStack: Set<string>[]
        ) => {
          const ids = extractExpressionIdentifiersWithLoc(exprStr, baseLoc);
          for (const { name, loc } of ids) {
            if (KNOWN_GLOBALS.has(name)) continue;
            if (declaredVars.has(name)) continue;

            let inScope = false;
            for (let i = scopeStack.length - 1; i >= 0; i--) {
              if (scopeStack[i]?.has(name)) {
                inScope = true;
                break;
              }
            }

            if (!inScope) {
              const key = `${name}:${loc.line}:${loc.column}`;
              if (!reported.has(key)) {
                reported.add(key);
                context.report({
                  loc: {
                    start: loc,
                    end: { line: loc.line, column: loc.column + name.length },
                  },
                  messageId: 'undefVar',
                  data: { name },
                });
              }
            }
          }
        };

        const traverse = (node: TemplateChildNode, scopeStack: Set<string>[]) => {
          switch (node.type) {
            case ASTNodeType.Element: {
              const elem = node as ElementNode;
              if (elem.tagName !== 'script') {
                for (const attr of elem.attributes) {
                  if (attr.value && typeof attr.value !== 'string') {
                    const expr = attr.value.expression;
                    const exprStr = typeof expr === 'string' ? expr : '';
                    if (exprStr) {
                      checkIdentifiers(
                        exprStr,
                        {
                          line: attr.value.loc.start.line,
                          column: attr.value.loc.start.column,
                        },
                        scopeStack
                      );
                    }
                  }
                }
                for (const child of elem.children) {
                  traverse(child, scopeStack);
                }
              }
              break;
            }
            case ASTNodeType.Interpolation: {
              const interp = node as InterpolationNode;
              const exprStr = typeof interp.expression === 'string' ? interp.expression : '';
              if (exprStr) {
                checkIdentifiers(
                  exprStr,
                  {
                    line: interp.loc.start.line,
                    column: interp.loc.start.column,
                  },
                  scopeStack
                );
              }
              break;
            }
            case ASTNodeType.If: {
              const ifNode = node as IfNode;
              const testStr = typeof ifNode.test === 'string' ? ifNode.test : '';
              if (testStr) {
                checkIdentifiers(
                  testStr,
                  {
                    line: ifNode.loc.start.line,
                    column: ifNode.loc.start.column,
                  },
                  scopeStack
                );
              }
              for (const child of ifNode.consequent) {
                traverse(child, scopeStack);
              }
              if (ifNode.alternate) {
                if (Array.isArray(ifNode.alternate)) {
                  for (const child of ifNode.alternate) {
                    traverse(child, scopeStack);
                  }
                } else {
                  traverse(ifNode.alternate as IfNode, scopeStack);
                }
              }
              break;
            }
            case ASTNodeType.For: {
              const forNode = node as ForNode;
              const iterStr = typeof forNode.iterable === 'string' ? forNode.iterable : '';
              if (iterStr) {
                checkIdentifiers(
                  iterStr,
                  {
                    line: forNode.loc.start.line,
                    column: forNode.loc.start.column,
                  },
                  scopeStack
                );
              }

              const forScope = new Set<string>();
              if (forNode.item) {
                const itemIds = forNode.item.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g);
                if (itemIds) {
                  for (const id of itemIds) forScope.add(id);
                }
              }
              if (forNode.index) {
                forScope.add(forNode.index);
              }

              scopeStack.push(forScope);

              if (forNode.key && typeof forNode.key === 'string') {
                checkIdentifiers(
                  forNode.key,
                  {
                    line: forNode.loc.start.line,
                    column: forNode.loc.start.column,
                  },
                  scopeStack
                );
              }

              for (const child of forNode.body) {
                traverse(child, scopeStack);
              }

              scopeStack.pop();
              break;
            }
            case ASTNodeType.Switch: {
              const switchNode = node as SwitchNode;
              const discStr = typeof switchNode.discriminant === 'string' ? switchNode.discriminant : '';
              if (discStr) {
                checkIdentifiers(
                  discStr,
                  {
                    line: switchNode.loc.start.line,
                    column: switchNode.loc.start.column,
                  },
                  scopeStack
                );
              }
              for (const c of switchNode.cases) {
                if (c.expression && typeof c.expression === 'string') {
                  checkIdentifiers(
                    c.expression,
                    {
                      line: c.loc.start.line,
                      column: c.loc.start.column,
                    },
                    scopeStack
                  );
                }
                for (const child of c.body) {
                  traverse(child, scopeStack);
                }
              }
              break;
            }
            case ASTNodeType.Async: {
              const asyncNode = node as AsyncNode;
              const promStr = typeof asyncNode.promise === 'string' ? asyncNode.promise : '';
              if (promStr) {
                checkIdentifiers(
                  promStr,
                  {
                    line: asyncNode.loc.start.line,
                    column: asyncNode.loc.start.column,
                  },
                  scopeStack
                );
              }

              const asyncScope = new Set<string>();
              if (asyncNode.alias) {
                asyncScope.add(asyncNode.alias);
              }
              scopeStack.push(asyncScope);
              for (const child of asyncNode.body) {
                traverse(child, scopeStack);
              }
              scopeStack.pop();

              if (asyncNode.fallback) {
                for (const child of asyncNode.fallback) {
                  traverse(child, scopeStack);
                }
              }
              if (asyncNode.catchBranch) {
                const catchScope = new Set<string>();
                if (asyncNode.catchBranch.errorVar) {
                  catchScope.add(asyncNode.catchBranch.errorVar);
                }
                scopeStack.push(catchScope);
                for (const child of asyncNode.catchBranch.body) {
                  traverse(child, scopeStack);
                }
                scopeStack.pop();
              }
              break;
            }
          }
        };

        const initialScopeStack: Set<string>[] = [];
        for (const child of services.templateAst.body) {
          traverse(child, initialScopeStack);
        }
      },
    };
  },
};
