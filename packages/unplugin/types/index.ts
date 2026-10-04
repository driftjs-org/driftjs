/**
 * Options accepted by the Drift universal build-tool plugin.
 */
export interface DriftPluginOptions {
  /**
   * Emit verbose compiler debug output (transformed AST + bytecode) to the console
   * for every transformed .drift file.
   * @default false
   */
  debug?: boolean;
}

/**
 * Shape of the ESM module emitted by the plugin for every `.drift` file.
 */
export type DriftModule = import('driftjs-compiler').CompiledModule;

/** File extension this plugin owns. */
export const DRIFT_EXT = '.drift' as const;
