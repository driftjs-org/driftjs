declare module 'driftjs-compiler' {
  // Source Location & Token Types
  export interface SourceLocation {
    readonly line: number;
    readonly column: number;
    readonly offset: number;
  }

  export interface SourceRange {
    readonly start: SourceLocation;
    readonly end: SourceLocation;
  }

  export const TokenType: {
    readonly TagOpen: 'TagOpen';
    readonly TagOpenSlash: 'TagOpenSlash';
    readonly TagClose: 'TagClose';
    readonly TagSelfClose: 'TagSelfClose';
    readonly Equals: 'Equals';
    readonly Identifier: 'Identifier';
    readonly StringLiteral: 'StringLiteral';
    readonly Text: 'Text';
    readonly Interpolation: 'Interpolation';
    readonly Comment: 'Comment';
    readonly DirectiveIf: 'DirectiveIf';
    readonly DirectiveElseIf: 'DirectiveElseIf';
    readonly DirectiveElse: 'DirectiveElse';
    readonly DirectiveFor: 'DirectiveFor';
    readonly DirectiveSwitch: 'DirectiveSwitch';
    readonly DirectiveCase: 'DirectiveCase';
    readonly DirectiveDefault: 'DirectiveDefault';
    readonly DirectiveAsync: 'DirectiveAsync';
    readonly DirectiveFallback: 'DirectiveFallback';
    readonly DirectiveCatch: 'DirectiveCatch';
    readonly BlockOpen: 'BlockOpen';
    readonly BlockClose: 'BlockClose';
    readonly EOF: 'EOF';
  };
  export type TokenType = typeof TokenType[keyof typeof TokenType];

  export interface Token {
    readonly type: TokenType;
    readonly value: string;
    readonly loc: SourceRange;
  }

  export interface TokenSource {
    nextToken(): Token;
  }

  // Lexer State Types
  export const LexerStateKind: {
    readonly Data: 'Data';
    readonly TagOpen: 'TagOpen';
    readonly EndTagOpen: 'EndTagOpen';
    readonly BeforeAttributeName: 'BeforeAttributeName';
    readonly AttributeName: 'AttributeName';
    readonly AfterAttributeName: 'AfterAttributeName';
    readonly BeforeAttributeValue: 'BeforeAttributeValue';
    readonly AttributeValueQuoted: 'AttributeValueQuoted';
    readonly AttributeValueInterpolation: 'AttributeValueInterpolation';
    readonly Comment: 'Comment';
    readonly Interpolation: 'Interpolation';
    readonly RawText: 'RawText';
    readonly EOF: 'EOF';
  };
  export type LexerStateKind = typeof LexerStateKind[keyof typeof LexerStateKind];

  export type RawTextTagName = 'script' | 'style';
  export type LexerInterpolationContext = 'content' | 'attribute';
  export type AttributeQuote = '"' | "'";

  interface BaseLexerState {
    readonly kind: LexerStateKind;
  }

  export interface DataLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.Data;
  }
  export interface TagOpenLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.TagOpen;
  }
  export interface EndTagOpenLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.EndTagOpen;
  }
  export interface BeforeAttributeNameLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.BeforeAttributeName;
    readonly tagName: string;
    readonly isClosingTag: boolean;
    readonly entersRawText: boolean;
  }
  export interface AttributeNameLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.AttributeName;
    readonly tagName: string;
    readonly attributeName: string | null;
  }
  export interface AfterAttributeNameLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.AfterAttributeName;
    readonly tagName: string;
    readonly attributeName: string;
  }
  export interface BeforeAttributeValueLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.BeforeAttributeValue;
    readonly tagName: string;
    readonly attributeName: string;
  }
  export interface AttributeValueQuotedLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.AttributeValueQuoted;
    readonly tagName: string;
    readonly attributeName: string;
    readonly quote: AttributeQuote;
  }
  export interface AttributeValueInterpolationLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.AttributeValueInterpolation;
    readonly tagName: string;
    readonly attributeName: string;
  }
  export interface CommentLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.Comment;
  }
  export interface InterpolationLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.Interpolation;
    readonly context: LexerInterpolationContext;
    readonly tagName: string | null;
  }
  export interface RawTextLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.RawText;
    readonly tagName: RawTextTagName;
  }
  export interface EOFLexerState extends BaseLexerState {
    readonly kind: typeof LexerStateKind.EOF;
  }

  export type DriftLexerState =
    | DataLexerState
    | TagOpenLexerState
    | EndTagOpenLexerState
    | BeforeAttributeNameLexerState
    | AttributeNameLexerState
    | AfterAttributeNameLexerState
    | BeforeAttributeValueLexerState
    | AttributeValueQuotedLexerState
    | AttributeValueInterpolationLexerState
    | CommentLexerState
    | InterpolationLexerState
    | RawTextLexerState
    | EOFLexerState;

  export interface LexerStateTransition {
    readonly to: LexerStateKind;
    readonly when: string;
    readonly emits: string;
  }

  export enum ExprTokenKind {
    Start = 0,
    Punctuator = 1,
    Keyword = 2,
    IdentifierOrLiteral = 3,
    PostfixOp = 4,
  }

  // AST Node Types
  export const ASTNodeType: {
    readonly Program: 'Program';
    readonly Element: 'Element';
    readonly Text: 'Text';
    readonly Interpolation: 'Interpolation';
    readonly Attribute: 'Attribute';
    readonly Comment: 'Comment';
    readonly If: 'If';
    readonly For: 'For';
    readonly Switch: 'Switch';
    readonly Async: 'Async';
  };
  export type ASTNodeType = typeof ASTNodeType[keyof typeof ASTNodeType];

  export interface BaseASTNode {
    readonly type: ASTNodeType;
    readonly loc: SourceRange;
  }

  export interface AttributeNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Attribute;
    readonly name: string;
    readonly value: string | InterpolationNode | null;
  }

  export interface InterpolationNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Interpolation;
    readonly expression: string | any;
  }

  export interface TextNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Text;
    readonly content: string | any;
  }

  export interface CommentNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Comment;
    readonly content: string;
  }

  export interface IfNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.If;
    readonly test: string | any;
    readonly consequent: readonly TemplateChildNode[];
    readonly alternate: readonly TemplateChildNode[] | IfNode | null;
    readonly extraDeps?: any;
  }

  export interface ForNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.For;
    readonly item: string;
    readonly pattern: any | null;
    readonly index: string | null;
    readonly iterable: string | any;
    readonly key?: string | any | null;
    readonly body: readonly TemplateChildNode[];
  }

  export interface CaseBranch {
    readonly expression: string | any | null;
    readonly body: readonly TemplateChildNode[];
    readonly loc: SourceRange;
  }

  export interface SwitchNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Switch;
    readonly discriminant: string | any;
    readonly cases: readonly CaseBranch[];
  }

  export interface CatchBranch {
    readonly errorVar: string;
    readonly body: readonly TemplateChildNode[];
    readonly loc: SourceRange;
  }

  export interface AsyncNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Async;
    readonly promise: string | any;
    readonly alias: string;
    readonly aliasAst: any | null;
    readonly body: readonly TemplateChildNode[];
    readonly fallback: readonly TemplateChildNode[] | null;
    readonly catchBranch: CatchBranch | null;
  }

  export interface ElementNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Element;
    readonly tagName: string;
    readonly attributes: readonly AttributeNode[];
    readonly children: readonly TemplateChildNode[];
    readonly isSelfClosing: boolean;
  }

  export type TemplateChildNode =
    | ElementNode
    | TextNode
    | InterpolationNode
    | CommentNode
    | IfNode
    | ForNode
    | SwitchNode
    | AsyncNode;

  export interface ProgramNode extends BaseASTNode {
    readonly type: typeof ASTNodeType.Program;
    readonly body: readonly TemplateChildNode[];
  }

  export interface TemplateASTVisitor {
    enter?: (
      node: TemplateChildNode | ProgramNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | ProgramNode | TemplateChildNode[] | null | void;
    leave?: (
      node: TemplateChildNode | ProgramNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | ProgramNode | TemplateChildNode[] | null | void;
    Element?: (
      node: ElementNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    Text?: (
      node: TextNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    Interpolation?: (
      node: InterpolationNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    Comment?: (
      node: CommentNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    If?: (
      node: IfNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    For?: (
      node: ForNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    Switch?: (
      node: SwitchNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    Async?: (
      node: AsyncNode,
      parent: TemplateChildNode | ProgramNode | null
    ) => TemplateChildNode | TemplateChildNode[] | null | void;
    Attribute?: (
      node: AttributeNode,
      parent: ElementNode
    ) => AttributeNode | null | void;
  }

  // Error Classes
  export class DriftLexerError extends Error {
    readonly line: number;
    readonly column: number;
    readonly offset: number;
    constructor(message: string, line: number, column: number, offset: number);
  }

  export class DriftParserError extends Error {
    readonly line: number;
    readonly column: number;
    readonly offset: number;
    constructor(message: string, line: number, column: number, offset: number);
  }

  // Opcodes & Bytecode Types
  export enum Opcode {
    RETURN = 0x00,
    CREATE_ELEMENT = 0x01,
    CREATE_TEXT = 0x02,
    CREATE_COMMENT = 0x03,
    APPEND_CHILD = 0x04,
    SET_ATTR = 0x05,
    CREATE_FRAGMENT = 0x06,
    INTERPOLATE_TEXT = 0x07,
    EXEC_SCRIPT = 0x0C,
    REACTIVE_IF = 0x0D,
    REACTIVE_FOR = 0x0E,
    MOUNT_COMPONENT = 0x0F,
    REACTIVE_ASYNC = 0x10,
    REACTIVE_SWITCH = 0x11,
  }

  export interface SwitchCaseSpec {
    readonly testIdx: number;
    readonly modIdx: number;
  }

  export interface ReactiveBinding {
    readonly variable: string;
    readonly positions: readonly number[];
  }

  export interface ImportSpec {
    readonly localName: string;
    readonly source: string;
    readonly isDefault: boolean;
    readonly isNamespace?: boolean | undefined;
    readonly isSideEffect?: boolean | undefined;
    readonly importedName?: string | undefined;
  }

  export interface DerivedBinding {
    readonly name: string;
    readonly deps: readonly string[];
    readonly exprIdx: number;
  }

  export interface EffectBinding {
    readonly deps: readonly string[];
    readonly exprIdx: number;
  }

  export interface CompiledModule {
    readonly bytecode: readonly number[] | Uint32Array;
    readonly constants: readonly any[];
    readonly reactiveBindings?: readonly ReactiveBinding[];
    readonly declaredVars?: readonly string[];
    readonly derived?: readonly DerivedBinding[];
    readonly effects?: readonly EffectBinding[];
    readonly imports?: readonly ImportSpec[];
    readonly scope?: Record<string, any>;
  }

  export interface ItemRecord {
    key: unknown;
    nodes: any[];
    childRegions?: any[] | undefined;
    itemVal: unknown;
    indexVal: number;
    registers?: any[] | undefined;
    scope?: Record<string, any> | undefined;
    lastValues?: Map<number, any> | undefined;
  }

  // Compiler Classes & Functions
  export class DriftLexer implements TokenSource {
    constructor(source: string);
    nextToken(): Token;
    getCurrentState(): DriftLexerState;
    getEmittedTokenCount(): number;
  }

  export class DriftParser {
    constructor(input: DriftLexer | readonly Token[]);
    parse(): ProgramNode;
  }

  export function traverseTemplateAST<T extends ProgramNode | TemplateChildNode>(
    root: T,
    visitor: TemplateASTVisitor
  ): T;

  export class DriftTransformer {
    constructor(rawAst: ProgramNode);
    transform(): ProgramNode;
  }

  export class DriftGenerator {
    constructor(ast: ProgramNode);
    generate(): CompiledModule;
  }

  export function astToJS(node: any, locals?: Set<string>): string;
  export function extractBindingNames(node: any): string[];
  export function compile(src: string, debug?: boolean): CompiledModule;

  export interface CompileToESMOptions {
    filename?: string;
    debug?: boolean;
  }

  export interface CompileToESMResult {
    code: string;
    map?: null;
    compiledModule: CompiledModule;
  }

  export function serializeValueToJS(val: unknown): string;
  export function serializeConstants(constants: readonly unknown[]): string;
  export function generateESM(mod: CompiledModule, filePath?: string): string;
  export function compileToESM(src: string, options?: CompileToESMOptions): CompileToESMResult;
}
