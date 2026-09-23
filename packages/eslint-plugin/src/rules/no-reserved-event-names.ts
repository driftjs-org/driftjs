import type { DriftRuleModule } from '../../types/index.js';

export const noReservedEventNamesRule: DriftRuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce lowercase HTML event handler attributes (e.g. onclick instead of onClick)',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      useLowercaseEvent: 'Use lowercase event name "{{expected}}" instead of camelCase "{{actual}}". DriftJS event delegation requires lowercase.',
    },
  },
  create(context) {
    return {
      Program() {
        const services = context.sourceCode?.parserServices?.drift;
        if (!services || !services.eventHandlers) return;

        for (const handler of services.eventHandlers) {
          const rawName = handler.name;
          const lowerName = rawName.toLowerCase();
          if (rawName.startsWith('on') && rawName !== lowerName) {
            context.report({
              loc: {
                start: handler.loc.start,
                end: {
                  line: handler.loc.start.line,
                  column: handler.loc.start.column + rawName.length,
                },
              },
              messageId: 'useLowercaseEvent',
              data: {
                actual: rawName,
                expected: lowerName,
              },
              fix(fixer: any) {
                return fixer.replaceTextRange(
                  [handler.loc.start.offset, handler.loc.start.offset + rawName.length],
                  lowerName
                );
              },
            });
          }
        }
      },
    };
  },
};
