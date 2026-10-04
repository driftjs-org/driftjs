import { defineConfig } from 'vite';
import path from 'path';
import { vite } from 'driftjs-unplugin';

export default defineConfig({
  plugins: [vite()],
  build: {
    lib: {
      formats: ['es', 'cjs'],
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'DriftRouter',
      fileName: (format) => `index-${format}.js`,
    },
    rolldownOptions: {
      external: ['driftjs-shared', 'driftjs-dom', 'driftjs-compiler'],
    },
  },
});
