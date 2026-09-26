export * from '../types/index.js';
export { parseForESLint, parse } from './parser.js';
export { driftProcessor } from './processor.js';
export { rules } from './rules/index.js';
export { baseConfig, recommendedConfig, allConfig } from './configs/index.js';

import { parseForESLint, parse } from './parser.js';
import { driftProcessor } from './processor.js';
import { rules } from './rules/index.js';
import { baseConfig, recommendedConfig, allConfig } from './configs/index.js';
import type { DriftEslintPlugin } from '../types/index.js';

const parser = {
  parseForESLint,
  parse,
};

const plugin: DriftEslintPlugin = {
  meta: {
    name: 'driftjs-eslint-plugin',
    version: '0.0.16',
  },
  rules,
  configs: {
    base: {
      ...baseConfig,
      languageOptions: {
        ...baseConfig.languageOptions,
        parser,
      },
    },
    recommended: {
      ...recommendedConfig,
      languageOptions: {
        ...recommendedConfig.languageOptions,
        parser,
      },
    },
    all: {
      ...allConfig,
      languageOptions: {
        ...allConfig.languageOptions,
        parser,
      },
    },
  },
  processors: {
    '.drift': driftProcessor,
    drift: driftProcessor,
  },
  parser,
};

export default plugin;
