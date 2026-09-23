import type { DriftRuleModule } from '../../types/index.js';

export const noUnclosedTagsRule: DriftRuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unclosed or mismatched HTML/SFC tags in template markup',
      recommended: true,
    },
    schema: [],
    messages: {
      unclosedTag: 'Syntax error in template: {{message}}',
    },
  },
  create(context) {
    return {
      Program() {
        const services = context.sourceCode?.parserServices?.drift;
        if (!services || !services.parseErrors) return;

        for (const err of services.parseErrors) {
          if (/unclosed|mismatched/i.test(err.message)) {
            context.report({
              loc: {
                start: { line: err.line, column: err.column },
                end: { line: err.line, column: err.column + 5 },
              },
              messageId: 'unclosedTag',
              data: { message: err.message },
            });
          }
        }
      },
    };
  },
};
