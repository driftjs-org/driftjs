// @ts-ignore
import * as monaco from 'monaco-editor/editor/editor.api';

/**
 * Registers completion item provider for the 'drift' language.
 */
export function registerDriftCompletions(): monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider('drift', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [
        // Directives
        {
          label: '@if',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '@if ${1:condition} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS reactive @if conditional block',
          range,
        },
        {
          label: '@else if',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '@else if ${1:condition} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS reactive @else if ladder branch',
          range,
        },
        {
          label: '@else',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '@else {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS @else fallback block',
          range,
        },
        {
          label: '@for',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '@for (${1:item} in ${2:items} key ${3:item.id}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS keyed reactive @for loop using LIS reconciliation',
          range,
        },
        {
          label: '@switch',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            '@switch ${1:expression} {\n\t@case "${2:value}" {\n\t\t$0\n\t}\n\t@default {\n\t}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS @switch multi-case branch block',
          range,
        },
        {
          label: '@case',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '@case "${1:value}" {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS @case branch inside @switch',
          range,
        },
        {
          label: '@default',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '@default {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS @default fallback branch inside @switch',
          range,
        },
        {
          label: '<script>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<script>\n\t$0\n</script>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS component script block for state & logic',
          range,
        },
        {
          label: '<style>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<style>\n\t$0\n</style>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS component style block',
          range,
        },
        {
          label: 'onMount',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'onMount(() => {\n\t$0\n});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS onMount lifecycle hook',
          range,
        },
        {
          label: 'onUnmount',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'onUnmount(() => {\n\t$0\n});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS onUnmount lifecycle hook',
          range,
        },
        {
          label: 'effect',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'effect(() => {\n\t$0\n});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'DriftJS reactive effect hook',
          range,
        },
      ];

      return { suggestions };
    },
  });
}
