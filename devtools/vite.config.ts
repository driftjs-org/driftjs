import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, build } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function extensionScriptsPlugin() {
  return {
    name: 'drift-extension-scripts',
    apply: 'build' as const,
    async closeBundle() {
      const scripts = [
        { entry: resolve(__dirname, 'src/background.ts'), name: 'DriftBackground', fileName: 'background.js' },
        { entry: resolve(__dirname, 'src/content.ts'), name: 'DriftContent', fileName: 'content.js' },
        { entry: resolve(__dirname, 'src/injected.ts'), name: 'DriftInjected', fileName: 'injected.js' },
      ];

      for (const s of scripts) {
        await build({
          root: __dirname,
          configFile: false,
          build: {
            outDir: 'dist',
            emptyOutDir: false,
            lib: {
              entry: s.entry,
              formats: ['iife'],
              name: s.name,
              fileName: () => s.fileName,
            },
          },
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [driftPlugin() as any, extensionScriptsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, 'devtools.html'),
        panel: resolve(__dirname, 'panel.html'),
      },
    },
  },
});
