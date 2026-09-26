import type { DriftRuleModule } from '../../types/index.js';
import { ASTNodeType } from 'driftjs-compiler';
import type {
  TemplateChildNode,
  ForNode,
  ElementNode,
  IfNode,
  SwitchNode,
  AsyncNode,
} from 'driftjs-compiler';

export const preferForKeyRule: DriftRuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require or suggest a key expression on @for directives for efficient DOM reconciliation',
      recommended: true,
    },
    schema: [],
    messages: {
      missingKey: '@for directive should have a unique "key" expression (e.g. "@for item in items key item.id").',
    },
  },
  create(context) {
    return {
      Program() {
        const services = context.sourceCode?.parserServices?.drift;
        if (!services || !services.templateAst) return;

        const checkNode = (node: TemplateChildNode) => {
          if (!node || typeof node !== 'object') return;

          switch (node.type) {
            case ASTNodeType.For: {
              const forNode = node as ForNode;
              if (!forNode.key) {
                context.report({
                  loc: {
                    start: forNode.loc.start,
                    end: forNode.loc.end,
                  },
                  messageId: 'missingKey',
                });
              }
              for (const child of forNode.body) {
                checkNode(child);
              }
              break;
            }
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
            case ASTNodeType.Switch: {
              const switchNode = node as SwitchNode;
              for (const c of switchNode.cases) {
                for (const child of c.body) {
                  checkNode(child);
                }
              }
              break;
            }
            case ASTNodeType.Async: {
              const asyncNode = node as AsyncNode;
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
