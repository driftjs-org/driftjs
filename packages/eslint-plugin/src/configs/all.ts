import type { DriftPluginConfig } from '../../types/index.js';

export const allConfig: DriftPluginConfig = {
  files: ['**/*.drift'],
  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    globals: {
      props: 'readonly',
      __drift_mark_dirty__: 'readonly',
    },
  },
  rules: {
    'drift/no-duplicate-script': 'error',
    'drift/no-undef-in-template': 'error',
    'drift/valid-directives': 'error',
    'drift/no-unclosed-tags': 'error',
    'drift/prefer-for-key': 'error',
    'drift/no-reserved-event-names': 'error',
    'drift/no-direct-dom-access': 'warn',
  },
};
