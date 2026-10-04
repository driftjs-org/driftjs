import { createUnplugin, type UnpluginInstance } from 'unplugin';
import { compileToESM } from 'driftjs-compiler';
import { DRIFT_EXT, type DriftPluginOptions } from '../types/index.js';

export type { DriftPluginOptions, DriftModule } from '../types/index.js';
export { DRIFT_EXT };

/**
 * Universal build-tool plugin for DriftJS (.drift) Single File Components.
 * Supports Vite, Rollup, Webpack, esbuild, and Rspack through unplugin.
 */
export const unplugin = createUnplugin<DriftPluginOptions | undefined>(
  (options: DriftPluginOptions = {}) => {
    const { debug = false } = options;

    return {
      name: 'drift-plugin',
      enforce: 'pre',

      /**
       * Determines whether a given file path should be processed by this plugin.
       */
      transformInclude(id: string) {
        if (id.includes('?raw') || id.includes('?url')) return false;
        const cleanId = id.split('?')[0] ?? id;
        return cleanId.endsWith(DRIFT_EXT);
      },

      /**
       * Transform hook: compiles `.drift` source code into an ESM JavaScript module.
       */
      transform(src: string, id: string) {
        if (id.includes('?raw') || id.includes('?url')) return null;
        const cleanId = id.split('?')[0] ?? id;
        if (!cleanId.endsWith(DRIFT_EXT)) return null;

        try {
          const { code, map } = compileToESM(src, { filename: id, debug });
          return {
            code,
            map: map ?? null,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`[DriftJS] Compilation failed in "${id}":\n${msg}`);
        }
      },

      vite: {
        /**
         * Vite HMR hook: invalidates module graph and triggers full-reload on .drift changes.
         */
        handleHotUpdate({ file, server }) {
          const cleanFile = file.split('?')[0] ?? file;
          if (!cleanFile.endsWith(DRIFT_EXT)) return;

          const mod = server.moduleGraph.getModuleById(file) || server.moduleGraph.getModuleById(cleanFile);
          if (mod) server.moduleGraph.invalidateModule(mod);

          server.ws.send({ type: 'full-reload', path: '*' });
        },
      },
    };
  }
);

export const vite = unplugin.vite;
export const rollup = unplugin.rollup;
export const webpack = unplugin.webpack;
export const esbuild = unplugin.esbuild;
export const rspack = unplugin.rspack;

export default unplugin;
