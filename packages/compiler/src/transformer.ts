import * as acorn from 'acorn';
import type {
  ProgramNode,
  TemplateChildNode,
  ElementNode,
  TextNode,
  InterpolationNode,
  CommentNode,
  AttributeNode,
  IfNode,
  ForNode,
  SwitchNode,
  AsyncNode,
  TemplateASTVisitor,
} from '../types/index.js';
import {
  ASTNodeType,
  DriftParserError,
} from '../types/index.js';
import { extractBindingNames } from './generator.js';

function getRootIdentifier(node: any): string | null {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return getRootIdentifier(node.object);
  return null;
}

function createMarkDirtyCall(name: string): any {
  return {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name: '__drift_mark_dirty__',
    },
    arguments: [
      {
        type: 'Literal',
        value: name,
        raw: JSON.stringify(name),
      },
    ],
  };
}

function createMarkDirtyStatement(name: string): any {
  return {
    type: 'ExpressionStatement',
    expression: createMarkDirtyCall(name),
  };
}

/**
 * Formal Template AST Visitor that traverses the AST hierarchy and applies visitors.
 */
export function traverseTemplateAST<T extends ProgramNode | TemplateChildNode>(
  root: T,
  visitor: TemplateASTVisitor
): T {
  function visitChildren(
    children: readonly TemplateChildNode[],
    parent: TemplateChildNode | ProgramNode
  ): TemplateChildNode[] {
    const result: TemplateChildNode[] = [];
    for (const child of children) {
      const res = visitNode(child, parent);
      if (res === null) {
        continue;
      } else if (Array.isArray(res)) {
        result.push(...res);
      } else {
        result.push(res);
      }
    }
    return result;
  }

  function visitNode(
    node: TemplateChildNode | ProgramNode,
    parent: TemplateChildNode | ProgramNode | null
  ): any {
    if (!node || typeof node !== 'object') return node;

    let current: any = node;

    // 1. enter hook
    if (visitor.enter) {
      const enterRes = visitor.enter(current, parent);
      if (enterRes !== undefined) {
        if (enterRes === null || Array.isArray(enterRes)) return enterRes;
        current = enterRes;
      }
    }

    // 2. node type specific hook
    const typeHook = (visitor as Record<string, any>)[current.type];
    if (typeHook) {
      const hookRes = typeHook(current, parent);
      if (hookRes !== undefined) {
        if (hookRes === null || Array.isArray(hookRes)) return hookRes;
        current = hookRes;
      }
    }

    // 3. Recurse into children
    switch (current.type) {
      case ASTNodeType.Program: {
        const newBody = visitChildren(current.body, current);
        current = { ...current, body: newBody };
        break;
      }
      case ASTNodeType.Element: {
        let newAttrs = current.attributes;
        if (visitor.Attribute && Array.isArray(current.attributes)) {
          const mappedAttrs: AttributeNode[] = [];
          for (const attr of current.attributes) {
            const attrRes = visitor.Attribute(attr, current);
            if (attrRes !== null && attrRes !== undefined) {
              mappedAttrs.push(attrRes);
            } else if (attrRes === undefined) {
              mappedAttrs.push(attr);
            }
          }
          newAttrs = mappedAttrs;
        }
        const newChildren = visitChildren(current.children, current);
        current = { ...current, attributes: newAttrs, children: newChildren };
        break;
      }
      case ASTNodeType.If: {
        const newConsequent = visitChildren(current.consequent, current);
        let newAlternate = current.alternate;
        if (Array.isArray(current.alternate)) {
          newAlternate = visitChildren(current.alternate, current);
        } else if (current.alternate !== null && typeof current.alternate === 'object') {
          newAlternate = visitNode(current.alternate, current);
        }
        current = { ...current, consequent: newConsequent, alternate: newAlternate };
        break;
      }
      case ASTNodeType.For: {
        const newBody = visitChildren(current.body, current);
        current = { ...current, body: newBody };
        break;
      }
      case ASTNodeType.Switch: {
        if (Array.isArray(current.cases)) {
          const newCases = current.cases.map((c: any) => ({
            ...c,
            body: visitChildren(c.body, current),
          }));
          current = { ...current, cases: newCases };
        }
        break;
      }
      case ASTNodeType.Async: {
        const newBody = visitChildren(current.body, current);
        const newFallback = current.fallback ? visitChildren(current.fallback, current) : null;
        let newCatchBranch = current.catchBranch;
        if (current.catchBranch) {
          newCatchBranch = {
            ...current.catchBranch,
            body: visitChildren(current.catchBranch.body, current),
          };
        }
        current = {
          ...current,
          body: newBody,
          fallback: newFallback,
          catchBranch: newCatchBranch,
        };
        break;
      }
    }

    // 4. leave hook
    if (visitor.leave) {
      const leaveRes = visitor.leave(current, parent);
      if (leaveRes !== undefined) {
        return leaveRes;
      }
    }

    return current;
  }

  return visitNode(root, null) as T;
}

/**
 * Transformer for raw Drift template AST.
 * Performs AST enrichment via structured visitor passes:
 * 1. Stripping redundant whitespace/newline TextNodes between element boundaries.
 * 2. Parsing raw JS strings in interpolations, directives, and <script> tags into Acorn AST nodes.
 */
export class DriftTransformer {
  private readonly rawAst: ProgramNode;
  public readonly reactiveSymbolTable: Set<string> = new Set();
  public readonly derivedSymbolTable: Set<string> = new Set();
  public readonly staticSymbolTable: Set<string> = new Set();

  constructor(rawAst: ProgramNode) {
    this.rawAst = rawAst;
  }

  /**
   * Transforms raw AST into an enriched compiler AST.
   * @returns Transformed ProgramNode.
   */
  public transform(): ProgramNode {
    this.reactiveSymbolTable.clear();
    this.derivedSymbolTable.clear();
    this.staticSymbolTable.clear();

    // Pass 1: Strip redundant whitespace-only text nodes
    const strippedAst = traverseTemplateAST(this.rawAst, {
      Text: (node) => {
        if (typeof node.content === 'string' && this.isWhitespaceOnly(node.content)) {
          return null;
        }
      },
    });

    // Pass 2: Parse JS expressions into Acorn AST nodes
    const enrichedAst = traverseTemplateAST(strippedAst, {
      Interpolation: (node) => {
        return this.transformInterpolation(node);
      },
      Element: (node) => {
        if (node.tagName === 'script') {
          return this.transformScriptElement(node);
        }
        if (node.attributes.some((a) => a.value !== null && typeof a.value !== 'string')) {
          return {
            ...node,
            attributes: node.attributes.map((attr) => {
              if (
                attr.type === ASTNodeType.Attribute &&
                attr.value !== null &&
                typeof attr.value !== 'string' &&
                attr.value.type === ASTNodeType.Interpolation
              ) {
                return { ...attr, value: this.transformInterpolation(attr.value) };
              }
              return attr;
            }),
          };
        }
      },
      If: (node) => {
        if (typeof node.test === 'string' && node.test.trim().length > 0) {
          return {
            ...node,
            test: acorn.parseExpressionAt(node.test, 0, { ecmaVersion: 'latest', locations: true, ranges: true }),
          };
        }
      },
      For: (node) => {
        return {
          ...node,
          iterable:
            typeof node.iterable === 'string'
              ? acorn.parseExpressionAt(node.iterable, 0, { ecmaVersion: 'latest', locations: true, ranges: true })
              : node.iterable,
          key:
            typeof node.key === 'string' && node.key.trim().length > 0
              ? acorn.parseExpressionAt(node.key, 0, { ecmaVersion: 'latest', locations: true, ranges: true })
              : (node.key ?? null),
        };
      },
      Switch: (node) => {
        const discAst =
          typeof node.discriminant === 'string' && node.discriminant.trim().length > 0
            ? acorn.parseExpressionAt(node.discriminant, 0, { ecmaVersion: 'latest', locations: true, ranges: true })
            : node.discriminant;

        const enrichedCases = node.cases.map((c) => {
          const caseExpr =
            c.expression !== null && typeof c.expression === 'string' && c.expression.trim().length > 0
              ? acorn.parseExpressionAt(c.expression, 0, { ecmaVersion: 'latest', locations: true, ranges: true })
              : c.expression;
          return {
            ...c,
            expression: caseExpr,
          };
        });

        return {
          ...node,
          discriminant: discAst,
          cases: enrichedCases,
        };
      },
      Async: (node) => {
        return {
          ...node,
          promise:
            typeof node.promise === 'string' && node.promise.trim().length > 0
              ? acorn.parseExpressionAt(node.promise, 0, { ecmaVersion: 'latest', locations: true, ranges: true })
              : node.promise,
        };
      },
    });

    return {
      ...enrichedAst,
      reactiveSymbolTable: new Set(this.reactiveSymbolTable),
      derivedSymbolTable: new Set(this.derivedSymbolTable),
      staticSymbolTable: new Set(this.staticSymbolTable),
    };
  }



  /**
   * Parses raw JS string expression in interpolation into an Acorn AST node.
   */
  private transformInterpolation(node: InterpolationNode): InterpolationNode {
    if (typeof node.expression !== 'string') {
      return node;
    }

    let parsedExpr: acorn.Node;
    try {
      parsedExpr = acorn.parseExpressionAt(node.expression, 0, {
        ecmaVersion: 'latest',
        allowAwaitOutsideFunction: true,
        locations: true,
        ranges: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new DriftParserError(
        `Failed to parse JS expression in interpolation: ${msg}`,
        node.loc.start.line,
        node.loc.start.column,
        node.loc.start.offset
      );
    }

    return {
      ...node,
      expression: parsedExpr,
    };
  }

  /**
   * Parses raw JS string inside <script> tags into Acorn AST statement(s), stripping top-level Program wrapper,
   * triaging symbols into reactive/derived/static tables, and auto-desugaring reactive state mutations.
   */
  private transformScriptElement(node: ElementNode): ElementNode {
    const processedChildren = node.children.map((child) => {
      if (child.type === ASTNodeType.Text && typeof child.content === 'string') {
        let scriptAst: acorn.Node | readonly acorn.Node[];
        try {
          const program = acorn.parse(child.content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
            locations: true,
            ranges: true,
          });

          // 1. Symbol Table Triage
          this.triageSymbols(program.body);

          // 2. Ergonomic Mutation Auto-Desugaring
          const desugaredBody = this.desugarStatements(program.body);

          if (desugaredBody.length === 1 && desugaredBody[0] !== undefined) {
            scriptAst = desugaredBody[0];
          } else {
            scriptAst = desugaredBody;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new DriftParserError(
            `Failed to parse script tag JS content: ${msg}`,
            child.loc.start.line,
            child.loc.start.column,
            child.loc.start.offset
          );
        }

        return {
          ...child,
          content: scriptAst,
        };
      }
      return child;
    });

    return {
      ...node,
      children: processedChildren,
    };
  }

  private triageSymbols(stmts: any[]): void {
    let hasExplicitState = false;

    for (const stmt of stmts) {
      if (!stmt || typeof stmt !== 'object') continue;

      if (stmt.type === 'VariableDeclaration' && Array.isArray(stmt.declarations)) {
        for (const decl of stmt.declarations) {
          const names = extractBindingNames(decl.id);
          if (
            decl.init?.type === 'CallExpression' &&
            decl.init.callee?.type === 'Identifier' &&
            decl.init.callee.name === 'state'
          ) {
            hasExplicitState = true;
            for (const name of names) {
              this.reactiveSymbolTable.add(name);
            }
          } else if (
            decl.init?.type === 'CallExpression' &&
            decl.init.callee?.type === 'Identifier' &&
            (decl.init.callee.name === 'derived' || decl.init.callee.name === 'derive')
          ) {
            for (const name of names) {
              this.derivedSymbolTable.add(name);
            }
          } else {
            for (const name of names) {
              this.staticSymbolTable.add(name);
            }
          }
        }
      } else if (stmt.type === 'FunctionDeclaration' || stmt.type === 'ClassDeclaration') {
        if (stmt.id?.name) {
          this.staticSymbolTable.add(stmt.id.name);
        }
      } else if (stmt.type === 'ImportDeclaration' && Array.isArray(stmt.specifiers)) {
        for (const spec of stmt.specifiers) {
          if (spec.local?.name) {
            this.staticSymbolTable.add(spec.local.name);
          }
        }
      }
    }

    // Backward compatibility: If no explicit state() declarations were used at all,
    // treat mutable let/var declarations as reactive (Milestone 1 behavior)
    if (!hasExplicitState) {
      for (const stmt of stmts) {
        if (!stmt || typeof stmt !== 'object') continue;
        if (stmt.type === 'VariableDeclaration' && (stmt.kind === 'let' || stmt.kind === 'var')) {
          for (const decl of stmt.declarations || []) {
            if (
              decl.init?.type === 'CallExpression' &&
              decl.init.callee?.type === 'Identifier' &&
              (decl.init.callee.name === 'derived' || decl.init.callee.name === 'derive')
            ) {
              continue;
            }
            for (const name of extractBindingNames(decl.id)) {
              this.reactiveSymbolTable.add(name);
              this.staticSymbolTable.delete(name);
            }
          }
        }
      }
    }
  }

  private desugarStatements(stmts: any[]): any[] {
    const result: any[] = [];
    for (const stmt of stmts) {
      if (!stmt || typeof stmt !== 'object') {
        result.push(stmt);
        continue;
      }

      if (stmt.type === 'ExpressionStatement' && stmt.expression) {
        const expr = stmt.expression;
        if (expr.type === 'UpdateExpression') {
          const rootId = getRootIdentifier(expr.argument);
          if (rootId && this.reactiveSymbolTable.has(rootId)) {
            result.push(this.desugarNode(stmt));
            result.push(createMarkDirtyStatement(rootId));
            continue;
          }
        } else if (expr.type === 'AssignmentExpression') {
          const rootId = getRootIdentifier(expr.left);
          if (rootId && this.reactiveSymbolTable.has(rootId)) {
            result.push(this.desugarNode(stmt));
            result.push(createMarkDirtyStatement(rootId));
            continue;
          }
        }
      }

      result.push(this.desugarNode(stmt));
    }
    return result;
  }

  private desugarNode(node: any): any {
    if (!node || typeof node !== 'object') return node;

    if (node.type === 'BlockStatement' && Array.isArray(node.body)) {
      return {
        ...node,
        body: this.desugarStatements(node.body),
      };
    }

    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      if (node.body && node.body.type === 'BlockStatement') {
        return {
          ...node,
          body: this.desugarNode(node.body),
        };
      } else if (node.body && typeof node.body === 'object') {
        // Arrow function concise body: () => count++ or () => (user.age = 31)
        if (node.body.type === 'UpdateExpression') {
          const rootId = getRootIdentifier(node.body.argument);
          if (rootId && this.reactiveSymbolTable.has(rootId)) {
            return {
              ...node,
              body: {
                type: 'SequenceExpression',
                expressions: [node.body, createMarkDirtyCall(rootId)],
              },
            };
          }
        } else if (node.body.type === 'AssignmentExpression') {
          const rootId = getRootIdentifier(node.body.left);
          if (rootId && this.reactiveSymbolTable.has(rootId)) {
            return {
              ...node,
              body: {
                type: 'SequenceExpression',
                expressions: [node.body, createMarkDirtyCall(rootId)],
              },
            };
          }
        }
      }
    }

    if (node.type === 'IfStatement') {
      return {
        ...node,
        consequent: this.desugarNode(node.consequent),
        alternate: node.alternate ? this.desugarNode(node.alternate) : null,
      };
    }

    if (
      node.type === 'ForStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    ) {
      return {
        ...node,
        body: this.desugarNode(node.body),
      };
    }

    if (node.type === 'SwitchStatement' && Array.isArray(node.cases)) {
      return {
        ...node,
        cases: node.cases.map((c: any) => ({
          ...c,
          consequent: this.desugarStatements(c.consequent || []),
        })),
      };
    }

    if (node.type === 'TryStatement') {
      return {
        ...node,
        block: this.desugarNode(node.block),
        handler: node.handler ? this.desugarNode(node.handler) : null,
        finalizer: node.finalizer ? this.desugarNode(node.finalizer) : null,
      };
    }

    if (node.type === 'CatchClause') {
      return {
        ...node,
        body: this.desugarNode(node.body),
      };
    }

    return node;
  }

  /**
   * Checks if string consists only of whitespace characters.
   */
  private isWhitespaceOnly(text: string): boolean {
    return text.length > 0 && /^\s*$/.test(text);
  }
}
