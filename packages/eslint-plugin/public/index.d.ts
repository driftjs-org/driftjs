declare module 'driftjs-eslint-plugin' {
  import type { ProgramNode, SourceRange, Token } from 'driftjs-compiler';

  export interface DriftParseErrorDetail {
    readonly message: string;
    readonly line: number;
    readonly column: number;
    readonly offset: number;
  }

  export interface DriftDirectiveInfo {
    readonly name: string;
    readonly loc: SourceRange;
    readonly raw: string;
  }

  export interface DriftEventHandlerInfo {
    readonly name: string;
    readonly loc: SourceRange;
    readonly isDynamic: boolean;
  }

  export interface DriftScriptBlockInfo {
    readonly loc: SourceRange;
    readonly isModule?: boolean;
  }

  export interface DriftParserServices {
    readonly templateAst: ProgramNode | null;
    readonly templateTokens: readonly Token[];
    readonly scriptRange: {
      start: number;
      end: number;
      startLine: number;
      startColumn: number;
    } | null;
    readonly scriptContent: string;
    readonly declaredScriptVars: ReadonlySet<string>;
    readonly templateReferencedVars: ReadonlySet<string>;
    readonly parseErrors: readonly DriftParseErrorDetail[];
    readonly directives: readonly DriftDirectiveInfo[];
    readonly eventHandlers: readonly DriftEventHandlerInfo[];
    readonly scriptBlocks: readonly DriftScriptBlockInfo[];
  }

  export interface DriftParserOptions {
    ecmaVersion?: number | 'latest';
    sourceType?: 'module' | 'script';
    driftTemplate?: boolean;
    [key: string]: any;
  }

  export interface ESLintParseResult {
    ast: any;
    services: {
      drift?: DriftParserServices;
      [key: string]: any;
    };
    visitorKeys?: Record<string, string[]> | null;
    scopeManager?: any;
  }

  export interface DriftRuleMeta {
    type: 'problem' | 'suggestion' | 'layout';
    docs: {
      description: string;
      recommended?: boolean | string;
      url?: string;
    };
    fixable?: 'code' | 'whitespace';
    hasSuggestions?: boolean;
    schema: any[];
    messages: Record<string, string>;
  }

  export interface DriftRuleModule {
    meta: DriftRuleMeta;
    create(context: any): Record<string, (node: any) => void>;
  }

  export interface DriftPluginConfig {
    plugins?: any;
    rules?: Record<string, any>;
    languageOptions?: any;
    files?: string[];
    processor?: string | any;
    [key: string]: any;
  }

  export interface DriftEslintPlugin {
    meta: {
      name: string;
      version: string;
    };
    rules: Record<string, DriftRuleModule>;
    configs: {
      recommended: DriftPluginConfig | DriftPluginConfig[];
      all: DriftPluginConfig | DriftPluginConfig[];
      base: DriftPluginConfig | DriftPluginConfig[];
      [name: string]: any;
    };
    processors: Record<string, any>;
    parser: {
      parseForESLint(code: string, options?: DriftParserOptions): ESLintParseResult;
      parse(code: string, options?: DriftParserOptions): any;
    };
  }

  export const parseForESLint: (code: string, options?: DriftParserOptions) => ESLintParseResult;
  export const parse: (code: string, options?: DriftParserOptions) => any;

  export const driftProcessor: {
    preprocess(text: string, filename: string): Array<string | { text: string; filename: string }>;
    postprocess(messages: any[][], filename: string): any[];
    supportsAutofix: boolean;
  };

  export const rules: Record<string, DriftRuleModule>;

  export const baseConfig: DriftPluginConfig;
  export const recommendedConfig: DriftPluginConfig;
  export const allConfig: DriftPluginConfig;

  const plugin: DriftEslintPlugin;
  export default plugin;
}
