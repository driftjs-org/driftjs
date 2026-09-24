import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      formats: ['es', 'cjs'],
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'DriftSSG',
      fileName: (format) => `index-${format}.js`,
    },
    rollupOptions: {
      external: [
        'driftjs-compiler',
        'driftjs-dom',
        'driftjs-ssr',
        'driftjs-shared',
        'driftjs-vite-plugin',
        'gray-matter',
        'marked',
        'path-to-regexp',
        'picocolors',
        'vite',
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:url',
        'node:http',
        'node:https',
        'node:child_process',
        'node:os',
        'node:events',
        'node:stream',
      ],
    },
  },
});
