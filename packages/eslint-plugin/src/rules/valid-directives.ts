import type { DriftRuleModule } from '../../types/index.js';
import { ASTNodeType } from 'driftjs-compiler';
import type {
  TemplateChildNode,
  IfNode,
  ForNode,
  SwitchNode,
  AsyncNode,
  ElementNode,
} from 'driftjs-compiler';

export const validDirectivesRule: DriftRuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate syntax and nesting of Drift directives (@if, @for, @switch, @async)',
      recommended: true,
    },
    schema: [],
    messages: {
      emptyIfTest: '@if directive must have a non-empty condition.',
      invalidForSyntax: '@for directive must specify iterable binding, e.g. "@for item in items".',
      emptySwitchDiscriminant: '@switch directive must have a discriminant expression.',
      emptyAsyncPromise: '@async directive must specify a promise expression.',
      missingAsyncAlias: '@async directive must specify an alias binding, e.g. "@async promise as alias".',
    },
  },
  create(context) {
    return {
      Program() {
        const services = context.sourceCode?.parserServices?.drift;
        if (!services || !services.templateAst) return;

        const checkNode = (node: TemplateChildNode) => {
          switch (node.type) {
            case ASTNodeType.Element: {
              const elem = node as ElementNode;
              if (elem.tagName !== 'script') {
                for (const child of elem.children) {
                  checkNode(child);
                }
              }
              break;
            }
            case ASTNodeType.If: {
              const ifNode = node as IfNode;
              const testStr = typeof ifNode.test === 'string' ? ifNode.test.trim() : '';
              if (!testStr) {
                context.report({
                  loc: {
                    start: ifNode.loc.start,
                    end: ifNode.loc.end,
                  },
                  messageId: 'emptyIfTest',
                });
              }
              for (const child of ifNode.consequent) {
                checkNode(child);
              }
              if (ifNode.alternate) {
                if (Array.isArray(ifNode.alternate)) {
                  for (const child of ifNode.alternate) {
                    checkNode(child);
                  }
                } else {
                  checkNode(ifNode.alternate as IfNode);
                }
              }
              break;
            }
            case ASTNodeType.For: {
              const forNode = node as ForNode;
              const item = forNode.item?.trim() ?? '';
              const iterable = typeof forNode.iterable === 'string' ? forNode.iterable.trim() : '';
              if (!item || !iterable) {
                context.report({
                  loc: {
                    start: forNode.loc.start,
                    end: forNode.loc.end,
                  },
                  messageId: 'invalidForSyntax',
                });
              }
              for (const child of forNode.body) {
                checkNode(child);
              }
              break;
            }
            case ASTNodeType.Switch: {
              const switchNode = node as SwitchNode;
              const disc = typeof switchNode.discriminant === 'string' ? switchNode.discriminant.trim() : '';
              if (!disc) {
                context.report({
                  loc: {
                    start: switchNode.loc.start,
                    end: switchNode.loc.end,
                  },
                  messageId: 'emptySwitchDiscriminant',
                });
              }
              for (const c of switchNode.cases) {
                for (const child of c.body) {
                  checkNode(child);
                }
              }
              break;
            }
            case ASTNodeType.Async: {
              const asyncNode = node as AsyncNode;
              const prom = typeof asyncNode.promise === 'string' ? asyncNode.promise.trim() : '';
              const alias = asyncNode.alias?.trim() ?? '';
              if (!prom) {
                context.report({
                  loc: {
                    start: asyncNode.loc.start,
                    end: asyncNode.loc.end,
                  },
                  messageId: 'emptyAsyncPromise',
                });
              }
              if (!alias) {
                context.report({
                  loc: {
                    start: asyncNode.loc.start,
                    end: asyncNode.loc.end,
                  },
                  messageId: 'missingAsyncAlias',
                });
              }
              for (const child of asyncNode.body) {
                checkNode(child);
              }
              if (asyncNode.fallback) {
                for (const child of asyncNode.fallback) {
                  checkNode(child);
                }
              }
              if (asyncNode.catchBranch) {
                for (const child of asyncNode.catchBranch.body) {
                  checkNode(child);
                }
              }
              break;
            }
          }
        };

        for (const child of services.templateAst.body) {
          checkNode(child);
        }
      },
    };
  },
};
