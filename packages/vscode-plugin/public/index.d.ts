declare module 'driftjs-vscode-plugin' {
  import type { ExtensionContext } from 'vscode';
  import type { Diagnostic, CompletionItem, Hover, Position } from 'vscode-languageserver';
  import type { TextDocument } from 'vscode-languageserver-textdocument';

  /**
   * Activates the DriftJS VSCode extension and language server client.
   */
  export function activate(context: ExtensionContext): void;

  /**
   * Deactivates the DriftJS VSCode extension.
   */
  export function deactivate(): Thenable<void> | undefined;

  export interface TagContext {
    inTag: boolean;
    tagName: string | null;
    isClosing: boolean;
    inAttributeName: boolean;
    inAttributeValue: boolean;
    attributeName: string | null;
  }

  export function validateTextDocument(textDocument: TextDocument): Diagnostic[];
  export function extractScriptVars(docText: string): CompletionItem[];
  export function isInsideInterpolation(text: string, offset: number): boolean;
  export function isInsideDirectiveHeader(linePrefix: string): boolean;
  export function isInsideScriptBlock(text: string, offset: number): boolean;
  export function isInsideDirectiveExpression(text: string, offset: number): boolean;
  export function isExpressionContext(text: string, offset: number): boolean;
  export function getTagContext(text: string, offset: number): TagContext;
  export function computeCompletions(document: TextDocument, position: Position): CompletionItem[];
  export function computeHover(document: TextDocument, position: Position): Hover | null;
}
