import type { DriftRuleModule } from '../../types/index.js';

export const noDirectDomAccessRule: DriftRuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow direct top-level access to document or window in <script> to preserve SSR compatibility',
      recommended: false,
    },
    schema: [],
    messages: {
      noTopLevelDom: 'Avoid direct top-level access to "{{name}}" in <script> as it breaks SSR. Use lifecycle hooks (onMount) or guards.',
    },
  },
  create(context) {
    let scopeDepth = 0;

    return {
      FunctionDeclaration() {
        scopeDepth++;
      },
      'FunctionDeclaration:exit'() {
        scopeDepth--;
      },
      FunctionExpression() {
        scopeDepth++;
      },
      'FunctionExpression:exit'() {
        scopeDepth--;
      },
      ArrowFunctionExpression() {
        scopeDepth++;
      },
      'ArrowFunctionExpression:exit'() {
        scopeDepth--;
      },
      Identifier(node: any) {
        if (scopeDepth === 0) {
          if (node.name === 'window' || node.name === 'document') {
            const parent = node.parent;
            // Ignore type annotations or safe typeof checks
            if (parent && parent.type === 'UnaryExpression' && parent.operator === 'typeof') {
              return;
            }
            context.report({
              node,
              messageId: 'noTopLevelDom',
              data: { name: node.name },
            });
          }
        }
      },
    };
  },
};
