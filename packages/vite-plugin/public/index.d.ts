declare module 'driftjs-vite-plugin' {
  import type { Plugin } from 'vite';
  import type { CompiledModule } from 'driftjs-compiler';

  /**
   * Options accepted by the `driftPlugin()` factory.
   */
  export interface DriftPluginOptions {
    /**
     * Emit verbose compiler debug output (transformed AST + bytecode) to the
     * Vite dev-server console for every transformed .drift file.
     * @default false
     */
    debug?: boolean;
  }

  /**
   * Shape of the ESM module emitted by the plugin for every `.drift` file.
   */
  export type DriftModule = CompiledModule;

  /** File extension this plugin owns. */
  export const DRIFT_EXT: '.drift';

  /**
   * Serializes constant values to JavaScript code literals.
   */
  export function serializeValueToJS(val: unknown): string;

  export function serializeConstants(constants: readonly unknown[]): string;

  /**
   * Vite plugin that transforms `.drift` template files into ESM modules.
   */
  export function driftPlugin(options?: DriftPluginOptions): Plugin;

  export default driftPlugin;
}

declare module '*.drift' {
  import type { CompiledModule } from 'driftjs-compiler';
  const component: CompiledModule;
  export default component;
}
