import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { driftPlugin } from './packages/vite-plugin/src/index.js';

export default defineConfig({
  test: {
    fileParallelism: false,
    maxConcurrency: 1,
    projects: [
      {
        test: {
          name: 'compiler',
          include: ['packages/compiler/tests/**/*.test.ts'],
          exclude: ['packages/compiler/dist'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'utils',
          include: ['packages/utils/tests/**/*.test.ts'],
          exclude: ['packages/utils/dist'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'ssr',
          include: ['packages/ssr/tests/**/*.test.ts'],
          exclude: ['packages/ssr/dist'],
          environment: 'node',
          setupFiles: ['./packages/ssr/tests/setup.ts'],
        },
      },
      {
        test: {
          name: 'vite-plugin',
          include: ['packages/vite-plugin/tests/**/*.test.ts'],
          exclude: ['packages/vite-plugin/dist'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'cli',
          include: ['packages/cli/tests/**/*.test.ts'],
          exclude: ['packages/cli/dist'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'eslint-plugin',
          include: ['packages/eslint-plugin/tests/**/*.test.ts'],
          exclude: ['packages/eslint-plugin/dist'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'prettier-plugin',
          include: ['packages/prettier-plugin/tests/**/*.test.ts'],
          exclude: ['packages/prettier-plugin/dist'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'vscode-plugin',
          include: ['packages/vscode-plugin/tests/**/*.test.ts'],
          exclude: ['packages/vscode-plugin/dist'],
          environment: 'node',
        },
      },
      {
        plugins: [driftPlugin()],
        test: {
          name: 'dom',
          include: ['packages/dom/tests/**/*.test.ts'],
          exclude: ['packages/dom/dist'],
          setupFiles: ['./packages/dom/tests/setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              { browser: 'chromium' },
              { browser: 'firefox' },
              { browser: 'webkit' },
            ],
            headless: true,
          },
        },
      },
      {
        plugins: [driftPlugin()],
        test: {
          name: 'router',
          include: ['packages/router/tests/**/*.test.ts'],
          exclude: ['packages/router/dist'],
          setupFiles: ['./packages/dom/tests/setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              { browser: 'chromium' },
              { browser: 'firefox' },
              { browser: 'webkit' },
            ],
            headless: true,
          },
        },
      },
      {
        test: {
          name: 'ssg',
          include: ['packages/ssg/tests/**/*.test.ts'],
          exclude: ['packages/ssg/dist'],
          environment: 'node',
          setupFiles: ['./packages/ssr/tests/setup.ts'],
        },
      },
      {
        test: {
          name: 'devtools',
          include: ['devtools/tests/**/*.test.ts'],
          exclude: ['devtools/dist'],
          environment: 'node',
        },
      },
    ],
  },
});