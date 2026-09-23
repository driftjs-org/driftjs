import type { DriftPluginConfig } from '../../types/index.js';

export const baseConfig: DriftPluginConfig = {
  files: ['**/*.drift'],
  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    globals: {
      props: 'readonly',
      __drift_mark_dirty__: 'readonly',
    },
  },
};
