declare module 'driftjs-prettier-plugin' {
  import type { AstPath, Doc, ParserOptions, Plugin, SupportLanguage, SupportOptions } from 'prettier';
  import type { ProgramNode } from 'driftjs-compiler';

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

  /**
   * Parses Drift template and Single File Component into a Drift AST.
   */
  export function parse(text: string): ProgramNode;

  /**
   * Returns character start offset for a node.
   */
  export function locStart(node: any): number;

  /**
   * Returns character end offset for a node.
   */
  export function locEnd(node: any): number;

  /**
   * Prettier AST printer for Drift.
   */
  export function print(
    path: AstPath,
    options: any,
    printChild: (path: AstPath) => Doc
  ): Doc;

  /**
   * Embedded code formatter for <script> and <style> blocks.
   */
  export function embed(
    path: AstPath,
    options: any
  ): ((textToDoc: (text: string, options: any) => Promise<Doc>) => Promise<Doc>) | null;

  export const options: SupportOptions;

  export const defaultOptions: {
    tabWidth: number;
    useTabs: boolean;
    printWidth: number;
    driftScriptIndent: boolean;
    driftStyleIndent: boolean;
    driftSelfCloseVoid: boolean;
  };

  export const languages: SupportLanguage[];

  export const parsers: {
    drift: {
      parse: typeof parse;
      astFormat: string;
      locStart: typeof locStart;
      locEnd: typeof locEnd;
    };
  };

  export const printers: {
    'drift-ast': {
      print: typeof print;
      embed: typeof embed;
    };
  };

  const plugin: Plugin;
  export default plugin;
}
