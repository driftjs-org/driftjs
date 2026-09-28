import { defineConfig } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';

export default defineConfig({
  plugins: [driftPlugin()],
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
