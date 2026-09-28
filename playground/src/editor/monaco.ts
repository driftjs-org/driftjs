// @ts-ignore
import * as monaco from 'monaco-editor/editor/editor.api';
// @ts-ignore
import editorWorker from 'monaco-editor/editor/editor.worker?worker';

import { driftLanguageDefinition } from './monarch.js';
import { registerDriftCompletions } from './completions.js';
import { driftSemanticTokensProvider } from './semantic-tokens.js';

// Setup Monaco Workers - only the core editor worker is needed for Drift SFCs
// @ts-ignore
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

let isLanguageRegistered = false;

export function initDriftLanguage(): void {
  if (isLanguageRegistered) return;
  isLanguageRegistered = true;

  // Register language ID
  monaco.languages.register({ id: 'drift', extensions: ['.drift'] });

  // Language configuration
  monaco.languages.setLanguageConfiguration('drift', {
    comments: {
      blockComment: ['<!--', '-->'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['<', '>'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
      { open: '<!--', close: '-->' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  // Monarch tokenizer (fast top-down baseline)
  monaco.languages.setMonarchTokensProvider('drift', driftLanguageDefinition);

  // AST/Compiler-based Semantic Tokens Provider (deep 100% accurate tokens)
  monaco.languages.registerDocumentSemanticTokensProvider('drift', driftSemanticTokensProvider);

  // Completions
  registerDriftCompletions();

  // Define Drift Dark theme
  monaco.editor.defineTheme('drift-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'cba6f7', fontStyle: 'bold' }, // Purple
      { token: 'keyword.directive', foreground: 'cba6f7', fontStyle: 'bold' },
      { token: 'tag', foreground: '89b4fa', fontStyle: 'bold' }, // Blue
      { token: 'type', foreground: 'f9e2af', fontStyle: 'bold' }, // Yellow / Component
      { token: 'function', foreground: '89dceb', fontStyle: 'bold' }, // Cyan
      { token: 'variable', foreground: 'cdd6f4' }, // White/Cream
      { token: 'parameter', foreground: 'f38ba8' }, // Pink
      { token: 'variable.parameter', foreground: 'f38ba8' },
      { token: 'property', foreground: 'fab387' }, // Peach
      { token: 'attribute.name', foreground: 'fab387' },
      { token: 'attribute.value', foreground: 'a6e3a1' }, // Green
      { token: 'string', foreground: 'a6e3a1' },
      { token: 'number', foreground: 'fab387' },
      { token: 'operator', foreground: '89dceb' },
      { token: 'delimiter', foreground: '89dceb' },
      { token: 'delimiter.bracket', foreground: 'f9e2af' },
      { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
      { token: 'string.text', foreground: 'cdd6f4' },
      { token: 'variable.other', foreground: 'cdd6f4' },
    ],
    colors: {
      'editor.background': '#11111b',
      'editor.foreground': '#cdd6f4',
      'editorLineNumber.foreground': '#585b70',
      'editorLineNumber.activeForeground': '#cba6f7',
      'editorCursor.foreground': '#cba6f7',
      'editor.selectionBackground': '#313244',
      'editor.inactiveSelectionBackground': '#1e1e2e',
      'editor.lineHighlightBackground': '#181825',
    },
  });

  // Define Drift Light theme
  monaco.editor.defineTheme('drift-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '8839ef', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: '8839ef', fontStyle: 'bold' },
      { token: 'tag', foreground: '1e66f5', fontStyle: 'bold' },
      { token: 'type', foreground: 'df8e1d', fontStyle: 'bold' },
      { token: 'function', foreground: '04a5e5', fontStyle: 'bold' },
      { token: 'variable', foreground: '4c4f69' },
      { token: 'parameter', foreground: 'd20f39' },
      { token: 'variable.parameter', foreground: 'd20f39' },
      { token: 'property', foreground: 'fe640b' },
      { token: 'attribute.name', foreground: 'fe640b' },
      { token: 'attribute.value', foreground: '40a02b' },
      { token: 'string', foreground: '40a02b' },
      { token: 'number', foreground: 'fe640b' },
      { token: 'operator', foreground: '04a5e5' },
      { token: 'delimiter', foreground: '04a5e5' },
      { token: 'delimiter.bracket', foreground: 'df8e1d' },
      { token: 'comment', foreground: '9ca0b0', fontStyle: 'italic' },
      { token: 'string.text', foreground: '4c4f69' },
    ],
    colors: {
      'editor.background': '#eff1f5',
      'editor.foreground': '#4c4f69',
      'editorLineNumber.foreground': '#9ca0b0',
      'editorLineNumber.activeForeground': '#8839ef',
      'editorCursor.foreground': '#8839ef',
      'editor.selectionBackground': '#ccd0da',
      'editor.lineHighlightBackground': '#e6e9ef',
    },
  });
}

/**
 * Creates and configures a Monaco Editor instance.
 */
export function createMonacoEditor(
  container: HTMLElement,
  initialCode: string,
  onCodeChange: (code: string) => void,
  isDark = true
): monaco.editor.IStandaloneCodeEditor {
  initDriftLanguage();

  const editor = monaco.editor.create(container, {
    value: initialCode,
    language: 'drift',
    theme: isDark ? 'drift-dark' : 'drift-light',
    'semanticHighlighting.enabled': true,
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
    fontLigatures: true,
    lineHeight: 22,
    tabSize: 2,
    insertSpaces: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    wordWrap: 'on',
    bracketPairColorization: { enabled: true },
    suggestOnTriggerCharacters: true,
    renderLineHighlight: 'all',
  });

  // Track code changes
  editor.onDidChangeModelContent(() => {
    onCodeChange(editor.getValue());
  });

  requestAnimationFrame(() => {
    editor.layout();
  });
  setTimeout(() => {
    editor.layout();
  }, 100);

  return editor;
}

/**
 * Updates Monaco editor error squiggly markers.
 */
export function setEditorErrorMarkers(
  editor: monaco.editor.IStandaloneCodeEditor,
  error?: { message: string; line?: number; column?: number }
): void {
  const model = editor.getModel();
  if (!model) return;

  if (!error) {
    monaco.editor.setModelMarkers(model, 'drift', []);
    return;
  }

  const line = error.line ?? 1;
  const col = error.column ?? 1;
  const lineCount = model.getLineCount();
  const validLine = Math.min(Math.max(1, line), lineCount);
  const maxCol = model.getLineMaxColumn(validLine);

  monaco.editor.setModelMarkers(model, 'drift', [
    {
      severity: monaco.MarkerSeverity.Error,
      message: error.message,
      startLineNumber: validLine,
      startColumn: Math.min(col, maxCol),
      endLineNumber: validLine,
      endColumn: maxCol,
    },
  ]);
}

/**
 * Sets the active Monaco editor theme.
 */
export function setEditorTheme(theme: 'drift-dark' | 'drift-light'): void {
  monaco.editor.setTheme(theme);
}
