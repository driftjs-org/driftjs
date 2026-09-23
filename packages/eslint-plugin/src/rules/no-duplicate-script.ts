import type { DriftRuleModule } from '../../types/index.js';

export const noDuplicateScriptRule: DriftRuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow duplicate <script> blocks in Drift Single File Components',
      recommended: true,
    },
    schema: [],
    messages: {
      duplicateScript: 'A Drift SFC can only have one <script> block, but found multiple.',
    },
  },
  create(context) {
    return {
      Program() {
        const services = context.sourceCode?.parserServices?.drift;
        if (!services) return;

        const scriptBlocks = services.scriptBlocks;
        if (scriptBlocks && scriptBlocks.length > 1) {
          // Report every script block after the first one
          for (let i = 1; i < scriptBlocks.length; i++) {
            const block = scriptBlocks[i];
            if (block) {
              context.report({
                loc: {
                  start: {
                    line: block.loc.start.line,
                    column: block.loc.start.column,
                  },
                  end: {
                    line: block.loc.end.line,
                    column: block.loc.end.column,
                  },
                },
                messageId: 'duplicateScript',
              });
            }
          }
        }
      },
    };
  },
};
