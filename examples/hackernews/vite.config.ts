import { defineConfig } from 'vite';
import { vite } from 'driftjs-unplugin';

export default defineConfig({
  plugins: [vite()],
  server: {
    port: 3004,
  },
});
