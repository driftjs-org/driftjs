import type { DriftRuleModule } from '../../types/index.js';
import { ASTNodeType } from 'driftjs-compiler';
import type { TemplateChildNode, ForNode, ElementNode } from 'driftjs-compiler';

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
          if (node.type === ASTNodeType.For) {
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
          } else if (node.type === ASTNodeType.Element) {
            const elem = node as ElementNode;
            if (elem.tagName !== 'script') {
              for (const child of elem.children) {
                checkNode(child);
              }
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
