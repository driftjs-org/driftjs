import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: false,
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DriftUnplugin',
      formats: ['es', 'cjs'],
      fileName: (format) => `index-${format}.js`,
    },
    rolldownOptions: {
      external: ['driftjs-compiler', 'unplugin'],
    },
  },
});
