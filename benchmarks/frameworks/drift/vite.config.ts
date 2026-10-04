import { defineConfig } from 'vite';
import { vite } from 'driftjs-unplugin';

export default defineConfig({
  plugins: [vite()],
  optimizeDeps: {
    rolldownOptions: {},
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rolldownOptions: {},
  },
});
