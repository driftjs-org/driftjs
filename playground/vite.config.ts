import { defineConfig } from 'vite';
import { vite } from 'driftjs-unplugin';

export default defineConfig({
  plugins: [vite()],
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
