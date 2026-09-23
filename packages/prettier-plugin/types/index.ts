import type { ParserOptions } from 'prettier';

/**
 * Type definitions for driftjs-prettier-plugin options.
 */
export interface DriftPrettierOptions {
  /**
   * Whether to indent the code inside <script> blocks.
   * @default true
   */
  driftScriptIndent?: boolean;

  /**
   * Whether to indent the code inside <style> blocks.
   * @default true
   */
  driftStyleIndent?: boolean;

  /**
   * Whether to self-close void HTML elements (e.g. <input /> instead of <input>).
   * @default true
   */
  driftSelfCloseVoid?: boolean;
}

export type DriftParserOptions = ParserOptions & DriftPrettierOptions;
