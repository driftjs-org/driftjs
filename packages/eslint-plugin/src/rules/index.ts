import type { DriftRuleModule } from '../../types/index.js';
import { noDuplicateScriptRule } from './no-duplicate-script.js';
import { noUndefInTemplateRule } from './no-undef-in-template.js';
import { validDirectivesRule } from './valid-directives.js';
import { noUnclosedTagsRule } from './no-unclosed-tags.js';
import { preferForKeyRule } from './prefer-for-key.js';
import { noReservedEventNamesRule } from './no-reserved-event-names.js';
import { noDirectDomAccessRule } from './no-direct-dom-access.js';

export const rules: Record<string, DriftRuleModule> = {
  'no-duplicate-script': noDuplicateScriptRule,
  'no-undef-in-template': noUndefInTemplateRule,
  'valid-directives': validDirectivesRule,
  'no-unclosed-tags': noUnclosedTagsRule,
  'prefer-for-key': preferForKeyRule,
  'no-reserved-event-names': noReservedEventNamesRule,
  'no-direct-dom-access': noDirectDomAccessRule,
};
