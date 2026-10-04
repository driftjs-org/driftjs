import type { UnpluginInstance } from 'unplugin';
import type { CompiledModule } from 'driftjs-compiler';

export interface DriftPluginOptions {
  /**
   * Emit verbose compiler debug output (transformed AST + bytecode) to the console
   * for every transformed .drift file.
   * @default false
   */
  debug?: boolean;
}

export type DriftModule = CompiledModule;

export const DRIFT_EXT: '.drift';

export const unplugin: UnpluginInstance<DriftPluginOptions | undefined, false>;

export const vite: (options?: DriftPluginOptions) => any;
export const rollup: (options?: DriftPluginOptions) => any;
export const webpack: (options?: DriftPluginOptions) => any;
export const esbuild: (options?: DriftPluginOptions) => any;
export const rspack: (options?: DriftPluginOptions) => any;

export default unplugin;

declare module '*.drift' {
  import type { CompiledModule } from 'driftjs-compiler';
  const component: CompiledModule;
  export default component;
}
