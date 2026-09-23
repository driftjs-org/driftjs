import type { ProgramNode, SourceRange, Token } from 'driftjs-compiler';

/**
 * Parser services provided by driftjs-eslint-parser on context.sourceCode.parserServices.
 */
export interface DriftParserServices {
  /**
   * Drift template AST parsed from the SFC, or null if template parsing failed.
   */
  readonly templateAst: ProgramNode | null;
  /**
   * Tokens generated while lexing the template.
   */
  readonly templateTokens: readonly Token[];
  /**
   * Location and offset range of the <script> block within the SFC, or null if absent.
   */
  readonly scriptRange: {
    start: number;
    end: number;
    startLine: number;
    startColumn: number;
  } | null;
  /**
   * Raw text content of the <script> block.
   */
  readonly scriptContent: string;
  /**
   * Set of variable names declared inside the <script> block.
   */
  readonly declaredScriptVars: ReadonlySet<string>;
  /**
   * Set of identifier names referenced in template expressions (interpolations, directives, attributes).
   */
  readonly templateReferencedVars: ReadonlySet<string>;
  /**
   * Errors encountered during template lexing or parsing.
   */
  readonly parseErrors: readonly DriftParseErrorDetail[];
  /**
   * Directives detected in the SFC template.
   */
  readonly directives: readonly DriftDirectiveInfo[];
  /**
   * Event handlers bound on template elements (e.g. onclick, onClick).
   */
  readonly eventHandlers: readonly DriftEventHandlerInfo[];
  /**
   * Script elements found in the document.
   */
  readonly scriptBlocks: readonly DriftScriptBlockInfo[];
}

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
