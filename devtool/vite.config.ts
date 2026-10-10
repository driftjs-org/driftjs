import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, build } from 'vite';
import { vite } from 'driftjs-unplugin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const target = (process.env.TARGET || 'firefox').toLowerCase() === 'chrome' ? 'chrome' : 'firefox';
const outDir = `dist/${target}`;

export function generateManifest(targetEnv: 'firefox' | 'chrome') {
  const manifest: Record<string, any> = {
    manifest_version: 3,
    name: 'DriftJS DevTools',
    version: '0.1.0',
    description: `${targetEnv === 'firefox' ? 'Firefox' : 'Chrome & Chromium'} DevTools extension for DriftJS register VM reactivity engine`,
    devtools_page: 'devtools.html',
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
      },
    ],
    web_accessible_resources: [
      {
        resources: ['injected.js'],
        matches: ['<all_urls>'],
      },
    ],
    icons: {
      '16': 'assets/icon.png',
      '32': 'assets/icon.png',
      '48': 'assets/icon.png',
      '128': 'assets/icon.png',
    },
    permissions: [],
  };

  if (targetEnv === 'firefox') {
    manifest.browser_specific_settings = {
      gecko: {
        id: 'devtools@driftjs.org',
        strict_min_version: '109.0',
      },
    };
    manifest.background = {
      scripts: ['background.js'],
    };
  } else {
    manifest.background = {
      service_worker: 'background.js',
    };
  }

  return manifest;
}

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
            outDir,
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

      // Generate target-specific manifest.json
      const manifest = generateManifest(target);
      const manifestPath = resolve(__dirname, outDir, 'manifest.json');
      fs.mkdirSync(resolve(__dirname, outDir), { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
      console.log(`[drift-devtools-build] Emitted ${target} manifest.json -> ${outDir}/manifest.json`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [vite(), extensionScriptsPlugin()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, 'devtools.html'),
        panel: resolve(__dirname, 'panel.html'),
      },
    },
  },
});
