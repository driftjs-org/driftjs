# DriftJS VSCode Extension Defect & Bug Tracking

This document tracks all identified bugs, runtime defects, language server limitations, and grammar inconsistencies in `driftjs-vscode-plugin` (`packages/vscode-plugin`).

---

## Defect Summary Matrix

| Bug ID | Title | Severity | Status | Affected Files |
|---|---|---|---|---|
| **VSC-001** | Language Server startup crash via ESM/CJS module conflict | **Critical** | **Fixed** | [`package.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/package.json), [`vite.config.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/vite.config.ts), [`src/extension.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/extension.ts) |
| **VSC-002** | Extension client activation crash due to browser environment externalization (`path.join`) | **Critical** | **Fixed** | [`vite.config.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/vite.config.ts), [`src/extension.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/extension.ts) |
| **VSC-003** | Compiler diagnostics silenced by overbroad `isTransientError` regex | **High** | **Fixed** | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-004** | Acorn script errors ignored and missing document lifecycle diagnostics | **High** | **Fixed** | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-005** | Directive block opening braces mistaken for interpolations, disabling completions in blocks | **High** | **Fixed** | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-006** | TextMate grammar misclassifies `@case` body markup as JavaScript interpolations | **Medium** | **Fixed** | [`syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json) |
| **VSC-007** | TextMate grammar prematurely terminates on nested braces in interpolations | **Medium** | **Fixed** | [`syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json) |
| **VSC-008** | Missing modern directives (`@async`, `@fallback`, `@catch`) across LSP, snippets, and grammar | **Medium** | **Fixed** | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts), [`snippets.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json), [`syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json) |
| **VSC-009** | VSCode schema violation in `language-configuration.json` for `lineComment` | **Medium** | **Fixed** | [`language-configuration.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/language-configuration.json) |
| **VSC-010** | State variable hover false positives on plain HTML text and element tag names | **Medium** | **Fixed** | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-011** | HTML attribute autocompletion ineffective on multiline tags | **Medium** | **Fixed** | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-012** | Inconsistent directive snippet syntax between `snippets.json` and `server.ts` | **Low** | **Fixed** | [`snippets.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json), [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-013** | VSCode extension test suite omitted from root `vitest.config.ts` | **Low** | **Fixed** | [`vitest.config.ts`](file:///home/hrutav-modha/Documents/driftjs/vitest.config.ts) |

---

## Detailed Bug Reports

### VSC-001: Language Server Startup Crash via ESM/CJS Conflict (`ReferenceError: exports is not defined`)
* **Severity:** Critical
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/package.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/package.json)
  - [`packages/vscode-plugin/vite.config.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/vite.config.ts)
  - [`packages/vscode-plugin/src/extension.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/extension.ts)
* **Root Cause:**
  `package.json` was set to `"type": "module"`, but `vite.config.ts` built the server and extension as CommonJS with a `.js` extension (`entryFileNames: '[name].js'`). Under Node.js, any `.js` file within a `"type": "module"` package is parsed as an ES module. When VSCode spawned `node dist/server.js`, Node threw:
  ```
  ReferenceError: exports is not defined in ES module scope
  This file is being treated as an ES module because it has a '.js' file extension and 'package.json' contains "type": "module".
  ```
* **Resolution:**
  - Updated `vite.config.ts` to output `.cjs` files: `entryFileNames: '[name].cjs'`.
  - Updated `package.json` `"main"` to `./dist/extension.cjs`.
  - Updated `extension.ts` server entry resolution to `path.join('dist', 'server.cjs')`.
  - Node.js unconditionally executes `.cjs` files as CommonJS regardless of `package.json` `"type"`.

---

### VSC-002: Extension Client Activation Crash from Browser Environment Externalization (`path.join is not a function`)
* **Severity:** Critical
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/vite.config.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/vite.config.ts)
  - [`packages/vscode-plugin/src/extension.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/extension.ts)
* **Root Cause:**
  `vite.config.ts` was not configured with `build.ssr: true`. Vite therefore targeted the browser/client environment by default, causing:
  1. Node.js built-ins (`path`) to be stubbed with empty browser objects `{}`. In `extension.ts`, `path.join(...)` threw `TypeError: path.join is not a function`.
  2. `vscode-languageclient` to be resolved using the `browser` condition (`lib/browser/main.js` with `BrowserMessageReader`) rather than Node IPC transport.
* **Resolution:**
  - Enabled `build.ssr: true` and `ssr: { noExternal: true }` in `vite.config.ts`.
  - Added Node.js built-in modules and `vscode` to `rolldownOptions.external`.
  - Bundled the extension in Node mode using standard Node IPC transport (`IPCMessageReader` / `IPCMessageWriter`).

---

### VSC-003: Compiler Diagnostics Silenced by Overbroad `isTransientError` Regex
* **Severity:** High
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
* **Root Cause:**
  In `validateTextDocument`:
  ```ts
  const isTransientError = /unclosed|unexpected eof|unterminated|expected/i.test(msg);
  ```
  The compiler (`DriftLexer` and `DriftParser`) uses the word **"expected"** or **"unclosed"** in virtually every parse or syntax error:
  - `"Mismatched closing tag. Expected '</span>' but got '</div>'"`
  - `"Unclosed element '<div>', expected closing tag '</div>'"`
  - `"Invalid @for header syntax. Expected format: 'item in list'"`
  - `"Invalid @for target bindings. Expected at most 2 variables"`
  - `"Unexpected token inside @switch block. Expected @case or @default."`
  - `"Expected '{' after @else directive"`
  Because `/expected/i` matched these messages, nearly 100% of real compiler errors were classified as "transient" and discarded, leaving the Problems panel empty on broken code.
* **Resolution:**
  Removed the blanket suppression regex. Real compilation errors thrown by `compile(text)` now reliably surface as red squiggles in the editor and Problems view.

---

### VSC-004: Acorn JS Errors in `<script>` Ignored and Missing Document Lifecycle Diagnostics
* **Severity:** High
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
* **Root Cause:**
  - `server.ts` checked `if (err && ('line' in err || 'column' in err))`. Acorn parser errors store location coordinates under `err.loc.line` and `err.loc.column`. As `'line' in err` was `false`, Acorn syntax errors thrown during `<script>` validation were dropped.
  - Diagnostics were only dispatched on `onDidChangeContent`. Documents opened for the first time (`onDidOpenTextDocument`) were not validated, and closing a file (`onDidCloseTextDocument`) did not clear existing diagnostics from the workspace.
* **Resolution:**
  - Support `err.loc?.line`, `err.line`, and inner parser coordinate string patterns (`(line:col)`) to accurately highlight syntax errors within `<script>` blocks.
  - Added `documents.onDidOpen` listener to validate newly opened documents and `documents.onDidClose` listener to clear stale diagnostics upon file closure.

---

### VSC-005: Directive Block Opening Braces Mistaken for Interpolations, Disabling Completions in Blocks
* **Severity:** High
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
* **Root Cause:**
  `onCompletion` checked:
  ```ts
  const isInsideInterpolation = /\{[^{}]*$/.test(lookback);
  ```
  Whenever the cursor was inside the body of an `@if (...) {`, `@for (...) {`, or `@switch {` block, the opening `{` of the block matched `/\{[^{}]*$/`. `isInsideInterpolation` evaluated to `true` anywhere inside directive blocks, causing an early return of `scriptVars` and blocking all HTML tag completions, snippets, attribute completions, and nested directive autocompletions.
* **Resolution:**
  - Implemented `isInsideInterpolation(text, offset)` which scans backwards to find the innermost unclosed brace `{` and checks if it was opened by a directive header (`@if`, `@for`, etc.). If opened by a directive, the brace denotes a template block rather than an interpolation.
  - Updated `isInsideDirectiveHeader(linePrefix)` to require trailing whitespace or parentheses before treating a position as an expression context, preventing directive names like `@if` or `@for` from being misinterpreted as expression headers.
  - Refactored `computeCompletions` to enable full HTML tag, attribute, snippet, and directive autocompletion inside control flow blocks.

---

### VSC-006: TextMate Grammar Misclassifies `@case` Body Markup as JavaScript Interpolations
* **Severity:** Medium
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json)
* **Root Cause:**
  In `drift-directive-headers`, `@case` was matched only as a bare keyword. In `@case "value" {`, the expression ended with `"`, which was not followed by a word boundary `\b`. Consequently, `drift-directive-blocks` (`(?<=\\}|\\b|@else|@default)\\s*(\\{)`) failed to match the block opening `{`. The `{` was instead claimed by `drift-interpolations` (`begin: "\\{"`), causing the entire HTML markup inside `@case` to be scoped as JavaScript code (`source.js`). Furthermore, relying on lookbehinds like `(?<=\b)` created false positive directive blocks on template text like `<p>Hello {name}</p>`.
* **Resolution:**
  - Replaced fragile header/block split rules with a unified `drift-directives` rule structure where the directive begin pattern (`@(if|else\s+if|else|for|switch|case|default|async|fallback|catch)\b`) cleanly bounds both the expression header (`\G` to `(?=\{)`) and the template body block (`\{` to `\}`).
  - Directive bodies are explicitly scoped with `$self`, preventing `@case` block contents from falling into interpolation rules.

---

### VSC-007: TextMate Grammar Prematurely Closes on Nested Braces in Interpolations
* **Severity:** Medium
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json)
* **Root Cause:**
  `drift-interpolations` used a flat `begin: "\\{"` and `end: "\\}"` without nested brace counting. Expressions containing object literals or function blocks (`{ { id: 1 } }` or `{ () => { run(); } }`) terminated at the first inner `}`, corrupting the highlighting of subsequent JavaScript code and the enclosing tag.
* **Resolution:**
  - Implemented `#nested-braces` recursive rule in `syntaxes/drift.tmLanguage.json` with matching `punctuation.section.embedded.begin.js` and `punctuation.section.embedded.end.js` captures.
  - Included `#nested-braces` in `drift-interpolations` and recursively within `#nested-braces` itself to properly track balanced curly brace depth in complex JS expressions.

---

### VSC-008: Missing Modern Directives (`@async`, `@fallback`, `@catch`) Across LSP, Snippets, and Grammar
* **Severity:** Medium
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
  - [`packages/vscode-plugin/snippets.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json)
  - [`packages/vscode-plugin/syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json)
* **Root Cause:**
  The Drift compiler implements `@async`, `@fallback`, and `@catch` (`compiler/src/lexer.ts#L84`), but these directives were missing from the language server autocompletion list, hover regex, code snippets, and TextMate grammar rules.
* **Resolution:**
  - Added `@async`, `@fallback`, and `@catch` completion items with detailed Markdown documentation and snippet templates to `computeCompletions` in `server.ts`.
  - Added `@async`, `@fallback`, and `@catch` snippets to `snippets.json`.
  - Updated directive hover inspection (`computeHover`) to recognize `@async`, `@fallback`, and `@catch`.
  - Updated `isInsideDirectiveHeader` and `isInsideInterpolation` helpers in `server.ts` to recognize `@async` and `@catch` headers and blocks.
  - Included `@async`, `@fallback`, and `@catch` in `syntaxes/drift.tmLanguage.json`'s unified directive patterns.

---

### VSC-009: VSCode Schema Violation in `language-configuration.json` for `lineComment`
* **Severity:** Medium
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/language-configuration.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/language-configuration.json)
* **Root Cause:**
  `lineComment` was defined as an object:
  ```json
  "lineComment": {
    "comment": "//",
    "noIndent": false
  }
  ```
  The VSCode `LanguageConfiguration` schema defines `lineComment` strictly as a `string` (`"lineComment": "//"`). Supplying an object causes schema validation errors in VSCode and breaks line comment toggling (Ctrl+/).
* **Resolution:**
  Changed `"lineComment"` to string `"//"`, conforming to VSCode's `LanguageConfiguration` schema specification.

---

### VSC-010: State Variable Hover False Positives on Plain HTML Text and Element Tag Names
* **Severity:** Medium
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
* **Root Cause:**
  `computeHover` matched all identifiers on the line with `/([a-zA-Z0-9_$]+)/g` against declared script variables without checking if the hovered token was inside a JavaScript expression context. If a component script declared a common variable name like `div`, `title`, or `count`, hovering over `<div ...>`, attribute `title="..."`, or plain template text inside a `<p>` falsely displayed state variable documentation.
* **Resolution:**
  - Added `isInsideScriptBlock`, `isInsideDirectiveExpression`, and unified `isExpressionContext` helper functions.
  - Guarded state variable hover resolution in `computeHover` with `isExpressionContext(text, cursorOffset)`, ensuring state variable documentation is only surfaced when hovering inside `<script>` blocks, template interpolations `{...}`, or directive expression headers (`@if (...)`, etc.).

---

### VSC-011: HTML Attribute Autocompletion Ineffective on Multiline Tags
* **Severity:** Medium
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
* **Root Cause:**
  Attribute autocompletion used a 50-character `linePrefix` tested against `/<[a-zA-Z0-9_-]+\s+[^>]*$/`. When an HTML opening tag spanned across newlines or exceeded 50 characters, `linePrefix` truncated the opening tag `<tagName` and failed the regex match. Consequently, pressing autocompletion on multiline tags failed to suggest HTML attributes.
* **Resolution:**
  - Implemented `getTagContext(text, offset): TagContext` that accurately detects opening tags, handles multiline tag bodies, balances quotes and interpolations, and extracts active attribute names (`attrName`).
  - Rewrote attribute autocompletion in `computeCompletions` to use `getTagContext`, providing robust attribute suggestions across arbitrary multiline tags and properly suppressing attribute name suggestions while inside quoted attribute values.

---

### VSC-012: Inconsistent Directive Snippet Syntax Between `snippets.json` and `server.ts`
* **Severity:** Low
* **Status:** Fixed
* **Affected Files:**
  - [`packages/vscode-plugin/snippets.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json)
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
* **Root Cause:**
  `snippets.json` defined `@if` without parentheses (`@if ${1:condition} {`) and used prefix `"@elseif"`, while `server.ts` emitted `@if (${1:condition}) {\n\t$0\n}` and `@else if`.
* **Resolution:**
  - Standardized `snippets.json` and `server.ts` to use canonical DriftJS syntax with parentheses for condition headers: `@if (${1:condition}) {` and `@else if (${1:condition}) {`.
  - Added support for both `"@else if"` and `"@elseif"` prefixes in `snippets.json` (`prefix: ["@else if", "@elseif"]`).
  - Added `@elseif` completion item and updated `@else if` completion in `server.ts` with `filterText: '@else if @elseif'` to support both prefix variants seamlessly in the Language Server.

---

### VSC-013: VSCode Extension Test Suite Omitted from Root `vitest.config.ts`
* **Severity:** Low
* **Status:** Fixed
* **Affected Files:**
  - [`vitest.config.ts`](file:///home/hrutav-modha/Documents/driftjs/vitest.config.ts)
* **Root Cause:**
  The root Vitest configuration project list included `compiler`, `utils`, `ssr`, `vite-plugin`, `cli`, `dom`, and `router`, but omitted `packages/vscode-plugin/tests/**/*.test.ts`. Running root `pnpm test` skipped testing the VSCode extension.
* **Resolution:**
  - Added a `vscode-plugin` project entry to root `vitest.config.ts` targeting `packages/vscode-plugin/tests/**/*.test.ts` in the `node` environment.
  - Root `pnpm test` now automatically includes all 31 tests in `driftjs-vscode-plugin`, raising monorepo test coverage to 35 test files and 512 total unit tests.
