import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  Hover,
  MarkupKind,
  TextEdit,
  Range,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { compile } from 'driftjs-compiler';
import * as acorn from 'acorn';

let connection: ReturnType<typeof createConnection> | null = null;
try {
  connection = createConnection(ProposedFeatures.all);
} catch {
  // Ignored in test environment
}
const documents = new TextDocuments(TextDocument);

if (connection) {
  connection.onInitialize(() => {
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          triggerCharacters: ['@', '<', '{', '.', ' ', '(', '"', '\''],
          resolveProvider: true,
        },
        hoverProvider: true,
      },
    };
  });
}

export function validateTextDocument(textDocument: TextDocument): Diagnostic[] {
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  try {
    compile(text);
  } catch (err: any) {
    const msg = String(err?.message || err);
    let lineNum = Number(err?.line ?? err?.loc?.line ?? 1);
    let colNum = Number(err?.column ?? err?.loc?.column ?? 1);

    // If an inner JS parser coordinate is embedded in the message (e.g. "Unexpected token (2:8)")
    const innerCoord = msg.match(/\((\d+):(\d+)\)/);
    if (innerCoord && innerCoord[1] && innerCoord[2]) {
      const innerLine = Number(innerCoord[1]);
      const innerCol = Number(innerCoord[2]);
      if (!isNaN(innerLine) && !isNaN(innerCol)) {
        lineNum = (lineNum - 1) + innerLine;
        colNum = innerCol;
      }
    }

    const line = Math.max(0, (isNaN(lineNum) ? 1 : lineNum) - 1);
    const col = Math.max(0, (isNaN(colNum) ? 1 : colNum) - 1);

    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line, character: col },
        end: { line, character: col + 5 },
      },
      message: msg,
      source: 'DriftJS Compiler',
    });
  }

  if (connection) {
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }

  return diagnostics;
}

if (connection) {
  documents.onDidChangeContent((change) => {
    validateTextDocument(change.document);
  });
  documents.onDidOpen((event) => {
    validateTextDocument(event.document);
  });
  documents.onDidClose((event) => {
    connection?.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  });
}

/**
 * Extracts declared variable and function names from SFC <script> block.
 */
export function extractScriptVars(docText: string): CompletionItem[] {
  const scriptMatch = docText.match(/<script[^>]*>([\s\S]*?)(?:<\/script>|$)/i);
  if (!scriptMatch || !scriptMatch[1]) return [];

  const scriptBody = scriptMatch[1];
  const items: CompletionItem[] = [];
  const seen = new Set<string>();

  const addVar = (
    name: string,
    kind: CompletionItemKind = CompletionItemKind.Variable,
    detail?: string,
    doc?: string,
    insertText?: string
  ) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    items.push({
      label: name,
      kind,
      detail: detail ?? 'Reactive Component State Variable',
      documentation: doc ?? `Declared state variable '${name}' in <script> block.`,
      ...(insertText ? { insertText } : {}),
    });
  };

  const extractPatternBindings = (patternNode: any) => {
    if (!patternNode || typeof patternNode !== 'object') return;
    if (patternNode.type === 'Identifier') {
      addVar(patternNode.name);
    } else if (patternNode.type === 'ObjectPattern' && Array.isArray(patternNode.properties)) {
      for (const prop of patternNode.properties) {
        if (prop.type === 'Property') {
          extractPatternBindings(prop.value);
        } else if (prop.type === 'RestElement') {
          extractPatternBindings(prop.argument);
        }
      }
    } else if (patternNode.type === 'ArrayPattern' && Array.isArray(patternNode.elements)) {
      for (const elem of patternNode.elements) {
        if (elem) extractPatternBindings(elem);
      }
    } else if (patternNode.type === 'AssignmentPattern') {
      extractPatternBindings(patternNode.left);
    } else if (patternNode.type === 'RestElement') {
      extractPatternBindings(patternNode.argument);
    }
  };

  const processAstNode = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclaration' && Array.isArray(node.declarations)) {
      for (const decl of node.declarations) {
        extractPatternBindings(decl.id);
      }
    } else if (node.type === 'FunctionDeclaration' && node.id?.name) {
      addVar(
        node.id.name,
        CompletionItemKind.Function,
        'Component Handler Function',
        `Declared handler function '${node.id.name}()' in <script> block.`,
        `${node.id.name}()`
      );
    } else if (node.type === 'ClassDeclaration' && node.id?.name) {
      addVar(
        node.id.name,
        CompletionItemKind.Class,
        'Component Class',
        `Declared class '${node.id.name}' in <script> block.`
      );
    } else if (node.type === 'ImportDeclaration' && Array.isArray(node.specifiers)) {
      for (const spec of node.specifiers) {
        if (spec.local?.name) {
          addVar(spec.local.name);
        }
      }
    } else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      processAstNode(node.declaration);
    } else if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
      processAstNode(node.declaration);
    }
  };

  // 1. Try parsing full script with Acorn
  try {
    const ast = acorn.parse(scriptBody, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
    }) as any;

    if (ast && Array.isArray(ast.body)) {
      for (const node of ast.body) {
        processAstNode(node);
      }
    }
  } catch {
    // 2. If full script parsing fails (e.g. typing in progress), parse line by line or statement fragments
    const lines = scriptBody.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const lineAst = acorn.parse(trimmed, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          allowReturnOutsideFunction: true,
          allowAwaitOutsideFunction: true,
          allowImportExportEverywhere: true,
        }) as any;
        if (lineAst && Array.isArray(lineAst.body)) {
          for (const node of lineAst.body) {
            processAstNode(node);
          }
        }
      } catch {
        // Incomplete line, ignore safely without catastrophic backtracking or RHS regex extraction
      }
    }
  }

  return items;
}

/**
 * Determines whether the cursor offset is inside a template interpolation `{ ... }`.
 * Avoids misidentifying directive block braces (`@if (...) {`, `@for ... {`, etc.) as interpolations.
 */
export function isInsideInterpolation(text: string, offset: number): boolean {
  let depth = 0;
  for (let i = offset - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '}') {
      depth++;
    } else if (ch === '{') {
      if (depth > 0) {
        depth--;
      } else {
        const textBeforeBrace = text.slice(Math.max(0, i - 120), i);
        const isDirectiveBlock = /@(?:if|else\s+if|else|for|switch|case|default|async|fallback|catch)\b[^{}]*$/.test(textBeforeBrace);
        return !isDirectiveBlock;
      }
    }
  }
  return false;
}

/**
 * Determines whether the cursor line prefix is inside a directive header before its opening `{`.
 */
export function isInsideDirectiveHeader(linePrefix: string): boolean {
  return /@(?:if|else\s+if|for|switch|case|async|catch)(?:\s+[^{}]*|\s*\([^{}]*)$/.test(linePrefix);
}

/**
 * Determines whether the cursor offset is inside a <script> block.
 */
export function isInsideScriptBlock(text: string, offset: number): boolean {
  const lastScriptOpen = text.lastIndexOf('<script', offset);
  if (lastScriptOpen === -1) return false;
  const lastScriptClose = text.lastIndexOf('</script>', offset);
  return lastScriptClose < lastScriptOpen;
}

/**
 * Determines whether the cursor offset is inside a directive expression header before its opening `{`.
 */
export function isInsideDirectiveExpression(text: string, offset: number): boolean {
  for (let i = offset - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '}' || ch === '{') {
      return false;
    }
    if (ch === '@') {
      const remaining = text.slice(i, offset);
      if (/@(?:if|else\s+if|for|switch|case|async|catch)\b/.test(remaining)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Determines whether the cursor offset is in a JavaScript expression context
 * (<script> block, template interpolation `{...}`, or directive expression header).
 */
export function isExpressionContext(text: string, offset: number): boolean {
  return (
    isInsideScriptBlock(text, offset) ||
    isInsideInterpolation(text, offset) ||
    isInsideDirectiveExpression(text, offset)
  );
}

export interface TagContext {
  insideTag: boolean;
  tagName?: string | undefined;
  insideAttrValue?: boolean | undefined;
  attrName?: string | undefined;
}

/**
 * Determines whether the cursor offset is inside an HTML opening tag,
 * correctly handling multiline tags, quotes, interpolations, and attribute values.
 */
export function getTagContext(text: string, offset: number): TagContext {
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === '<') {
      const slice = text.slice(i, offset);
      if (slice.startsWith('<!--') || slice.startsWith('</')) {
        return { insideTag: false };
      }
      const tagMatch = slice.match(/^<([a-zA-Z0-9_-]+)(\s+[\s\S]*)?$/);
      if (!tagMatch) {
        return { insideTag: false };
      }
      if (!tagMatch[2]) {
        // Still typing tag name without trailing whitespace (e.g. `<bu`)
        return { insideTag: false };
      }
      const tagName = tagMatch[1];

      // Scan forward from `i` to `offset` to verify the tag wasn't closed and inspect attribute state
      let inDouble = false;
      let inSingle = false;
      let inBrace = 0;
      let tagClosed = false;

      for (let j = i; j < offset; j++) {
        const c = text[j];
        const prev = j > i ? text[j - 1] : '';
        const isEscaped = prev === '\\';

        if (!isEscaped) {
          if (c === '"' && !inSingle && inBrace === 0) {
            inDouble = !inDouble;
          } else if (c === "'" && !inDouble && inBrace === 0) {
            inSingle = !inSingle;
          } else if (c === '{' && !inDouble && !inSingle) {
            inBrace++;
          } else if (c === '}' && !inDouble && !inSingle) {
            if (inBrace > 0) inBrace--;
          }
        }

        if (!inDouble && !inSingle && inBrace === 0) {
          if (c === '>') {
            tagClosed = true;
            break;
          }
        }
      }

      if (tagClosed) {
        return { insideTag: false };
      }

      const insideAttrValue = inDouble || inSingle;
      let attrName: string | undefined;
      if (insideAttrValue) {
        const attrMatch = text.slice(i, offset).match(/([a-zA-Z0-9_:-]+)\s*=\s*["'][^"']*$/);
        if (attrMatch) {
          attrName = attrMatch[1];
        }
      }

      return {
        insideTag: true,
        tagName,
        insideAttrValue,
        attrName,
      };
    }
  }

  return { insideTag: false };
}

export function computeCompletions(
  text: string,
  offset: number,
  position?: { line: number; character: number }
): CompletionItem[] {
  const linePrefix = text.slice(Math.max(0, offset - 50), offset);
  const pos = position ?? (() => {
    const lines = text.slice(0, offset).split('\n');
    return {
      line: Math.max(0, lines.length - 1),
      character: lines[lines.length - 1]?.length ?? 0,
    };
  })();

  const scriptVars = extractScriptVars(text);

  // 1. Trigger inside interpolation { ... }, directive header @if ..., or <script> block
  const insideInterp = isInsideInterpolation(text, offset);
  const insideDirHeader = isInsideDirectiveHeader(linePrefix) || isInsideDirectiveExpression(text, offset);
  const isInsideScript = isInsideScriptBlock(text, offset);

  if (insideInterp || insideDirHeader || isInsideScript) {
    return scriptVars;
  }

  // 2. Trigger @ directives
  if (/@\w*$/.test(linePrefix) || linePrefix.endsWith('@')) {
    return [
      {
        label: '@if',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Conditional Directive',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@if ${1:condition} {\n\t$0\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Renders element tree conditionally based on a reactive expression:\n```drift\n@if count > 0 {\n  <span>Positive</span>\n}\n```',
        },
      },
      {
        label: '@else if',
        filterText: '@else if @elseif',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Else-If Directive',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@else if ${1:condition} {\n\t$0\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Adds an alternate conditional branch to an existing `@if` block.',
        },
      },
      {
        label: '@elseif',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Else-If Directive (alias)',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@else if ${1:condition} {\n\t$0\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Alias for `@else if`. Adds an alternate conditional branch to an existing `@if` block.',
        },
      },
      {
        label: '@else',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Else Directive',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@else {\n\t$0\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Fallback branch executed when preceding conditions are false.',
        },
      },
      {
        label: '@for',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Loop Directive',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@for (${1:item}, ${2:index}) in ${3:items} {\n\t$0\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Reactively iterates over an array or iterable:\n```drift\n@for (item, index) in items {\n  <li>{item}</li>\n}\n```',
        },
      },
      {
        label: '@switch',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Switch Directive',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@switch ${1:status} {\n\t@case ${2:"active"} {\n\t\t$0\n\t}\n\t@default {\n\t\t\n\t}\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Evaluates discriminant expression against `@case` branches.',
        },
      },
      {
        label: '@case',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Switch Case Branch',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@case ${1:value} {\n\t$0\n}',
      },
      {
        label: '@default',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Switch Default Branch',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@default {\n\t$0\n}',
      },
      {
        label: '@async',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Async Directive',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@async (${1:promise}) as ${2:data} {\n\t$0\n} @fallback {\n\t<span>Loading...</span>\n} @catch (${3:error}) {\n\t<span>Error: {${3:error}}</span>\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Asynchronously resolves a Promise and handles fallback loading and catch states:\n```drift\n@async (fetchUser()) as user {\n  <span>{user.name}</span>\n} @fallback {\n  <span>Loading...</span>\n} @catch (err) {\n  <span>{err.message}</span>\n}\n```',
        },
      },
      {
        label: '@fallback',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Async Fallback Branch',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@fallback {\n\t$0\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Specifies fallback template rendered while an `@async` Promise is pending.',
        },
      },
      {
        label: '@catch',
        kind: CompletionItemKind.Snippet,
        detail: 'DriftJS Async Catch Branch',
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: '@catch (${1:error}) {\n\t$0\n}',
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'Specifies error handling template rendered when an `@async` Promise rejects.',
        },
      },
    ];
  }

  // 3. Trigger HTML attribute completion inside tag `<button ...>` (supports multiline tags)
  const tagCtx = getTagContext(text, offset);
  if (tagCtx.insideTag) {
    // If inside an attribute string value (e.g., class="...|"), don't suggest attribute names
    if (tagCtx.insideAttrValue) {
      if (tagCtx.attrName === 'type') {
        return [
          { label: 'text', kind: CompletionItemKind.Value },
          { label: 'password', kind: CompletionItemKind.Value },
          { label: 'number', kind: CompletionItemKind.Value },
          { label: 'checkbox', kind: CompletionItemKind.Value },
          { label: 'radio', kind: CompletionItemKind.Value },
          { label: 'submit', kind: CompletionItemKind.Value },
          { label: 'button', kind: CompletionItemKind.Value },
          { label: 'email', kind: CompletionItemKind.Value },
          { label: 'hidden', kind: CompletionItemKind.Value },
        ];
      }
      return [];
    }

    return [
      { label: 'class', kind: CompletionItemKind.Property, insertText: 'class="$1"', insertTextFormat: InsertTextFormat.Snippet },
      { label: 'id', kind: CompletionItemKind.Property, insertText: 'id="$1"', insertTextFormat: InsertTextFormat.Snippet },
      { label: 'style', kind: CompletionItemKind.Property, insertText: 'style="$1"', insertTextFormat: InsertTextFormat.Snippet },
      { label: 'type', kind: CompletionItemKind.Property, insertText: 'type="$1"', insertTextFormat: InsertTextFormat.Snippet },
      { label: 'value', kind: CompletionItemKind.Property, insertText: 'value={$1}', insertTextFormat: InsertTextFormat.Snippet },
      { label: 'placeholder', kind: CompletionItemKind.Property, insertText: 'placeholder="$1"', insertTextFormat: InsertTextFormat.Snippet },
      { label: 'disabled', kind: CompletionItemKind.Property, insertText: 'disabled={$1}', insertTextFormat: InsertTextFormat.Snippet },
      { label: 'checked', kind: CompletionItemKind.Property, insertText: 'checked={$1}', insertTextFormat: InsertTextFormat.Snippet },
      // Event handlers
      { label: 'onclick', kind: CompletionItemKind.Event, insertText: 'onclick={$1}', insertTextFormat: InsertTextFormat.Snippet, detail: 'Click Event Handler' },
      { label: 'oninput', kind: CompletionItemKind.Event, insertText: 'oninput={$1}', insertTextFormat: InsertTextFormat.Snippet, detail: 'Input Event Handler' },
      { label: 'onchange', kind: CompletionItemKind.Event, insertText: 'onchange={$1}', insertTextFormat: InsertTextFormat.Snippet, detail: 'Change Event Handler' },
      { label: 'onkeydown', kind: CompletionItemKind.Event, insertText: 'onkeydown={$1}', insertTextFormat: InsertTextFormat.Snippet, detail: 'Keydown Event Handler' },
      { label: 'onkeyup', kind: CompletionItemKind.Event, insertText: 'onkeyup={$1}', insertTextFormat: InsertTextFormat.Snippet, detail: 'Keyup Event Handler' },
      { label: 'onsubmit', kind: CompletionItemKind.Event, insertText: 'onsubmit={$1}', insertTextFormat: InsertTextFormat.Snippet, detail: 'Submit Event Handler' },
    ];
  }

  // 4. Default: HTML Element Snippets & Tags
  const htmlElements = [
    // Structural / Layout
    { name: 'div', snippet: '<div class="$1">\n\t$0\n</div>' },
    { name: 'span', snippet: '<span>$0</span>' },
    { name: 'header', snippet: '<header>\n\t$0\n</header>' },
    { name: 'footer', snippet: '<footer>\n\t$0\n</footer>' },
    { name: 'nav', snippet: '<nav>\n\t$0\n</nav>' },
    { name: 'main', snippet: '<main>\n\t$0\n</main>' },
    { name: 'section', snippet: '<section>\n\t$0\n</section>' },
    { name: 'article', snippet: '<article>\n\t$0\n</article>' },
    { name: 'aside', snippet: '<aside>\n\t$0\n</aside>' },
    { name: 'details', snippet: '<details>\n\t<summary>${1:Summary}</summary>\n\t$0\n</details>' },
    { name: 'summary', snippet: '<summary>$0</summary>' },
    { name: 'dialog', snippet: '<dialog>\n\t$0\n</dialog>' },

    // Headings & Text Formatting
    { name: 'h1', snippet: '<h1>$0</h1>' },
    { name: 'h2', snippet: '<h2>$0</h2>' },
    { name: 'h3', snippet: '<h3>$0</h3>' },
    { name: 'h4', snippet: '<h4>$0</h4>' },
    { name: 'h5', snippet: '<h5>$0</h5>' },
    { name: 'h6', snippet: '<h6>$0</h6>' },
    { name: 'p', snippet: '<p>$0</p>' },
    { name: 'a', snippet: '<a href="$1">$0</a>' },
    { name: 'strong', snippet: '<strong>$0</strong>' },
    { name: 'em', snippet: '<em>$0</em>' },
    { name: 'code', snippet: '<code>$0</code>' },
    { name: 'pre', snippet: '<pre>$0</pre>' },
    { name: 'blockquote', snippet: '<blockquote>$0</blockquote>' },
    { name: 'small', snippet: '<small>$0</small>' },
    { name: 'mark', snippet: '<mark>$0</mark>' },
    { name: 'time', snippet: '<time datetime="$1">$0</time>' },
    { name: 'hr', snippet: '<hr />' },
    { name: 'br', snippet: '<br />' },

    // Forms & Inputs
    { name: 'form', snippet: '<form onsubmit={$1}>\n\t$0\n</form>' },
    { name: 'label', snippet: '<label>$0</label>' },
    { name: 'input', snippet: '<input type="${1:text}" value={$2} />' },
    { name: 'button', snippet: '<button onclick={$1}>$0</button>' },
    { name: 'textarea', snippet: '<textarea value={$1}>$0</textarea>' },
    { name: 'select', snippet: '<select value={$1}>\n\t$0\n</select>' },
    { name: 'option', snippet: '<option value="$1">$0</option>' },
    { name: 'optgroup', snippet: '<optgroup label="$1">\n\t$0\n</optgroup>' },
    { name: 'fieldset', snippet: '<fieldset>\n\t<legend>${1:Legend}</legend>\n\t$0\n</fieldset>' },
    { name: 'legend', snippet: '<legend>$0</legend>' },
    { name: 'datalist', snippet: '<datalist id="$1">\n\t$0\n</datalist>' },
    { name: 'output', snippet: '<output>$0</output>' },

    // Lists
    { name: 'ul', snippet: '<ul>\n\t$0\n</ul>' },
    { name: 'ol', snippet: '<ol>\n\t$0\n</ol>' },
    { name: 'li', snippet: '<li>$0</li>' },
    { name: 'dl', snippet: '<dl>\n\t$0\n</dl>' },
    { name: 'dt', snippet: '<dt>$0</dt>' },
    { name: 'dd', snippet: '<dd>$0</dd>' },

    // Tables
    { name: 'table', snippet: '<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>$1</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>$2</td>\n\t\t</tr>\n\t</tbody>\n</table>' },
    { name: 'thead', snippet: '<thead>\n\t$0\n</thead>' },
    { name: 'tbody', snippet: '<tbody>\n\t$0\n</tbody>' },
    { name: 'tfoot', snippet: '<tfoot>\n\t$0\n</tfoot>' },
    { name: 'tr', snippet: '<tr>\n\t$0\n</tr>' },
    { name: 'th', snippet: '<th>$0</th>' },
    { name: 'td', snippet: '<td>$0</td>' },
    { name: 'caption', snippet: '<caption>$0</caption>' },

    // Media & Embedded Content
    { name: 'img', snippet: '<img src="$1" alt="$2" />' },
    { name: 'video', snippet: '<video src="$1" controls>$0</video>' },
    { name: 'audio', snippet: '<audio src="$1" controls>$0</audio>' },
    { name: 'source', snippet: '<source src="$1" type="$2" />' },
    { name: 'track', snippet: '<track kind="$1" src="$2" srclang="$3" label="$4" />' },
    { name: 'canvas', snippet: '<canvas width="$1" height="$2">$0</canvas>' },
    { name: 'svg', snippet: '<svg viewBox="$1">\n\t$0\n</svg>' },
    { name: 'iframe', snippet: '<iframe src="$1" title="$2"></iframe>' },
    { name: 'figure', snippet: '<figure>\n\t$0\n\t<figcaption>${1:Caption}</figcaption>\n</figure>' },
    { name: 'figcaption', snippet: '<figcaption>$0</figcaption>' },

    // Scripts & Metadata
    { name: 'script', snippet: '<script>\n\tlet ${1:count} = 0;\n</script>' },
    { name: 'style', snippet: '<style>\n\t$0\n</style>' },
    { name: 'template', snippet: '<template>\n\t$0\n</template>' },
    { name: 'slot', snippet: '<slot name="$1">$0</slot>' },
  ];

  const matchBefore = linePrefix.match(/<([a-zA-Z0-9_-]*)$/);
  const lineAfter = text.slice(offset, offset + 20);
  const hasTrailingGt = /^>/.test(lineAfter);

  let replaceRange: Range | undefined = undefined;

  if (matchBefore && matchBefore[1] !== undefined) {
    const typedWordLen = matchBefore[1].length;
    const startChar = pos.character - typedWordLen;
    const endChar = hasTrailingGt
      ? pos.character + 1
      : pos.character;

    replaceRange = Range.create(
      { line: pos.line, character: startChar },
      { line: pos.line, character: endChar }
    );
  }

  return [
    ...htmlElements.map((el) => {
      const item: CompletionItem = {
        label: el.name,
        kind: CompletionItemKind.Snippet,
        detail: `DriftJS HTML <${el.name}> Element`,
        insertTextFormat: InsertTextFormat.Snippet,
      };

      if (replaceRange) {
        const snippetNoLt = el.snippet.startsWith('<') ? el.snippet.slice(1) : el.snippet;
        item.textEdit = TextEdit.replace(replaceRange, snippetNoLt);
      } else {
        item.insertText = el.snippet;
      }

      return item;
    }),
    ...scriptVars,
  ];
}

export function computeHover(
  text: string,
  position: { line: number; character: number }
): Hover | null {
  const lines = text.split('\n');
  const lineText = lines[position.line] ?? '';
  const charInLine = position.character;

  // Match directives ONLY when explicitly prefixed with `@`
  const directiveMatches = Array.from(lineText.matchAll(/@(if|else\s+if|else|for|switch|case|default|async|fallback|catch)\b/g));
  for (const dm of directiveMatches) {
    const dirIdx = dm.index ?? 0;
    if (charInLine >= dirIdx && charInLine <= dirIdx + dm[0].length) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**DriftJS Directive \`${dm[0]}\`**\n\nReactive AOT directive compiled into 32-bit register VM bytecode.`,
        },
      };
    }
  }

  // Calculate cursor offset in full document
  let lineStart = 0;
  for (let i = 0; i < position.line; i++) {
    lineStart += (lines[i]?.length ?? 0) + 1;
  }
  const cursorOffset = lineStart + charInLine;

  // Check state variable hover under cursor ONLY when inside an expression context:
  // (<script> block, template interpolation `{...}`, or directive expression header)
  if (!isExpressionContext(text, cursorOffset)) {
    return null;
  }

  // Check state variable hover under cursor
  const words = Array.from(lineText.matchAll(/([a-zA-Z0-9_$]+)/g));
  for (const w of words) {
    const start = w.index ?? 0;
    const end = start + w[0].length;
    if (charInLine >= start && charInLine <= end) {
      const word = w[0];
      const scriptVars = extractScriptVars(text);
      const matchedVar = scriptVars.find((v) => v.label === word);
      if (matchedVar) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**${matchedVar.detail}**\n\n${matchedVar.documentation}`,
          },
        };
      }
    }
  }

  return null;
}

if (connection) {
  connection.onCompletion((params): CompletionItem[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const text = doc.getText();
    const offset = doc.offsetAt(params.position);
    return computeCompletions(text, offset, params.position);
  });

  connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return item;
  });

  connection.onHover((params): Hover | null => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    return computeHover(doc.getText(), params.position);
  });

  documents.listen(connection);
  connection.listen();
}
