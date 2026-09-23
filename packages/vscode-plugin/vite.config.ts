import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    target: 'node22',
    outDir: 'dist',
    emptyOutDir: true,
    ssr: true,
    lib: {
      entry: {
        server: path.resolve(__dirname, 'src/server.ts'),
        extension: path.resolve(__dirname, 'src/extension.ts'),
      },
      formats: ['cjs'],
    },
    rolldownOptions: {
      external: [
        'vscode',
        'path',
        'node:path',
        'fs',
        'node:fs',
        'os',
        'node:os',
        'crypto',
        'node:crypto',
        'util',
        'node:util',
        'events',
        'node:events',
        'stream',
        'node:stream',
        'net',
        'node:net',
        'child_process',
        'node:child_process',
      ],
      output: {
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
      },
    },
  },
  ssr: {
    noExternal: true,
  },
});
