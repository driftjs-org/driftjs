import type { languages } from 'monaco-editor';

/**
 * Monarch syntax definition for DriftJS (.drift) Single File Components.
 * Supports embedded JavaScript in <script>, embedded CSS in <style>,
 * Drift directives (@if, @for, @switch, etc.), and { interpolations }.
 */
export const driftLanguageDefinition: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.drift',
  ignoreCase: true,

  keywords: [
    '@if',
    '@else',
    '@for',
    '@switch',
    '@case',
    '@default',
    '@async',
    '@key',
    'in',
    'key',
  ],

  tokenizer: {
    root: [
      // Directives
      [/@(?:if|else\s+if|else|for|switch|case|default|async|key)\b/, 'keyword.directive'],

      // Script block with embedded JavaScript
      [
        /(<)(script)(>)/,
        [
          { token: 'delimiter' },
          { token: 'tag' },
          { token: 'delimiter', next: '@scriptBody', nextEmbedded: 'javascript' },
        ],
      ],
      [
        /(<)(script)(?=\s)/,
        [{ token: 'delimiter' }, { token: 'tag', next: '@scriptAfterTag' }],
      ],

      // Style block with embedded CSS
      [
        /(<)(style)(>)/,
        [
          { token: 'delimiter' },
          { token: 'tag' },
          { token: 'delimiter', next: '@styleBody', nextEmbedded: 'css' },
        ],
      ],
      [
        /(<)(style)(?=\s)/,
        [{ token: 'delimiter' }, { token: 'tag', next: '@styleAfterTag' }],
      ],

      // Comments
      [/<!--/, 'comment', '@comment'],

      // Interpolations
      [/\{/, { token: 'delimiter.bracket', next: '@interpolation' }],

      // HTML tags
      [/<\/?[a-zA-Z0-9_\-]+/, 'tag', '@tagAttributes'],

      // Text
      [/[^<{@\s]+/, 'string.text'],
      [/\s+/, 'white'],
    ],

    // Inside <script ...> attributes
    scriptAfterTag: [
      [/>/, { token: 'delimiter', next: '@scriptBody', nextEmbedded: 'javascript' }],
      [/[ \t\r\n]+/, 'white'],
      [/[\w\-]+/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"([^"\\]|\\.)*"/, 'attribute.value'],
      [/'([^'\\]|\\.)*'/, 'attribute.value'],
      [/<\/script\s*>/, { token: '@rematch', next: '@pop' }],
    ],

    // Inside <script> body until </script>
    scriptBody: [
      [/<\/script\s*>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
    ],

    // Inside <style ...> attributes
    styleAfterTag: [
      [/>/, { token: 'delimiter', next: '@styleBody', nextEmbedded: 'css' }],
      [/[ \t\r\n]+/, 'white'],
      [/[\w\-]+/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"([^"\\]|\\.)*"/, 'attribute.value'],
      [/'([^'\\]|\\.)*'/, 'attribute.value'],
      [/<\/style\s*>/, { token: '@rematch', next: '@pop' }],
    ],

    // Inside <style> body until </style>
    styleBody: [
      [/<\/style\s*>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
    ],

    // Tag attributes
    tagAttributes: [
      [/\/>/, 'delimiter', '@pop'],
      [/>/, 'delimiter', '@pop'],
      [/[ \t\r\n]+/, 'white'],
      [/(?:on\w+|@\w+)/, 'variable.parameter'], // Event handlers
      [/[\w\-]+/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"([^"\\]|\\.)*"/, 'attribute.value'],
      [/'([^'\\]|\\.)*'/, 'attribute.value'],
      [/\{/, { token: 'delimiter.bracket', next: '@interpolation' }],
    ],

    // HTML comments
    comment: [
      [/-->/, 'comment', '@pop'],
      [/[^-]+/, 'comment'],
      [/[-]/, 'comment'],
    ],

    // Interpolation { expr }
    interpolation: [
      [/\}/, { token: 'delimiter.bracket', next: '@pop' }],
      [/[^{}]+/, 'variable.other'],
    ],
  },
};
