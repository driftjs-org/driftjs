# DriftJS VSCode Extension Defect & Bug Tracking

This document tracks all identified bugs, runtime defects, language server limitations, and grammar inconsistencies in `driftjs-vscode-plugin` (`packages/vscode-plugin`).

---

## Defect Summary Matrix

| Bug ID | Title | Severity | Status | Affected Files |
|---|---|---|---|---|
| **VSC-001** | Language Server startup crash via ESM/CJS module conflict | **Critical** | **Fixed** | [`package.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/package.json), [`vite.config.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/vite.config.ts), [`src/extension.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/extension.ts) |
| **VSC-002** | Extension client activation crash due to browser environment externalization (`path.join`) | **Critical** | **Fixed** | [`vite.config.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/vite.config.ts), [`src/extension.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/extension.ts) |
| **VSC-003** | Compiler diagnostics silenced by overbroad `isTransientError` regex | **High** | Open | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-004** | Acorn script errors ignored and missing document lifecycle diagnostics | **High** | Open | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-005** | Directive block opening braces mistaken for interpolations, disabling completions in blocks | **High** | Open | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-006** | TextMate grammar misclassifies `@case` body markup as JavaScript interpolations | **Medium** | Open | [`syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json) |
| **VSC-007** | TextMate grammar prematurely terminates on nested braces in interpolations | **Medium** | Open | [`syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json) |
| **VSC-008** | Missing modern directives (`@async`, `@fallback`, `@catch`) across LSP, snippets, and grammar | **Medium** | Open | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts), [`snippets.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json), [`syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json) |
| **VSC-009** | VSCode schema violation in `language-configuration.json` for `lineComment` | **Medium** | Open | [`language-configuration.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/language-configuration.json) |
| **VSC-010** | State variable hover false positives on plain HTML text and element tag names | **Medium** | Open | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-011** | HTML attribute autocompletion ineffective on multiline tags | **Medium** | Open | [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-012** | Inconsistent directive snippet syntax between `snippets.json` and `server.ts` | **Low** | Open | [`snippets.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json), [`src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts) |
| **VSC-013** | VSCode extension test suite omitted from root `vitest.config.ts` | **Low** | Open | [`vitest.config.ts`](file:///home/hrutav-modha/Documents/driftjs/vitest.config.ts) |

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
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts#L52`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts#L52)
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
  Because `/expected/i` matches these messages, nearly 100% of real compiler errors are classified as "transient" and discarded, leaving the Problems panel empty on broken code.
* **Recommendation:**
  Detect transient errors by checking specific unterminated token boundaries at the active cursor position rather than blanket-filtering error strings that contain "expected".

---

### VSC-004: Acorn JS Errors in `<script>` Ignored and Missing Document Lifecycle Diagnostics
* **Severity:** High
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts#L55-L81`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts#L55-L81)
* **Root Cause:**
  - `server.ts` checks `if (err && ('line' in err || 'column' in err))`. Acorn parser errors store location coordinates under `err.loc.line` and `err.loc.column`. As `'line' in err` is `false`, Acorn syntax errors thrown during `<script>` validation are dropped.
  - Diagnostics are only dispatched on `onDidChangeContent`. Documents opened for the first time (`onDidOpenTextDocument`) are not validated, and closing a file (`onDidCloseTextDocument`) does not clear existing diagnostics from the workspace.
* **Recommendation:**
  Extract line/column using `err.loc?.line ?? err.line ?? 1` and `err.loc?.column ?? err.column ?? 1`. Add `documents.onDidOpen` and `documents.onDidClose` listeners.

---

### VSC-005: Directive Block Opening Braces Mistaken for Interpolations, Disabling Completions in Blocks
* **Severity:** High
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts#L225-L231`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts#L225-L231)
* **Root Cause:**
  `onCompletion` checks:
  ```ts
  const isInsideInterpolation = /\{[^{}]*$/.test(lookback);
  ...
  if (isInsideInterpolation || isInsideDirectiveHeader || isInsideScript) {
    return scriptVars;
  }
  ```
  Whenever the cursor is inside the body of an `@if (...) {`, `@for (...) {`, or `@switch {` block, the opening `{` of the block matches `/\{[^{}]*$/`. `isInsideInterpolation` evaluates to `true` anywhere inside directive blocks, causing an early return of `scriptVars` and blocking all HTML tag completions, snippets, attribute completions, and nested directive autocompletions.
* **Recommendation:**
  Distinguish directive block openers (`@if (...) {`) from template interpolations (`{ expr }`).

---

### VSC-006: TextMate Grammar Misclassifies `@case` Body Markup as JavaScript Interpolations
* **Severity:** Medium
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/syntaxes/drift.tmLanguage.json#L70-L100`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json#L70-L100)
* **Root Cause:**
  In `drift-directive-headers`, `@case` is matched only as a bare keyword. In `@case "value" {`, the expression ends with `"`, which is not followed by a word boundary `\b`. Consequently, `drift-directive-blocks` (`(?<=\\}|\\b|@else|@default)\\s*(\\{)`) fails to match the block opening `{`. The `{` is instead claimed by `drift-interpolations` (`begin: "\\{"`), resulting in the entire HTML markup inside `@case` being scoped as JavaScript code (`source.js`).
* **Recommendation:**
  Add a dedicated pattern for `@case <expr> {` in `drift-directive-headers` and `drift-directive-blocks`.

---

### VSC-007: TextMate Grammar Prematurely Closes on Nested Braces in Interpolations
* **Severity:** Medium
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/syntaxes/drift.tmLanguage.json#L101-L114`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json#L101-L114)
* **Root Cause:**
  `drift-interpolations` uses a flat `begin: "\\{"` and `end: "\\}"` without nested brace counting. Expressions containing object literals or function blocks (`{ { id: 1 } }` or `{ () => { run(); } }`) terminate at the first inner `}`, corrupting the highlighting of subsequent JavaScript code and the enclosing tag.
* **Recommendation:**
  Support recursive balanced brace patterns inside `drift-interpolations`.

---

### VSC-008: Missing Modern Directives (`@async`, `@fallback`, `@catch`) Across LSP, Snippets, and Grammar
* **Severity:** Medium
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts)
  - [`packages/vscode-plugin/snippets.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json)
  - [`packages/vscode-plugin/syntaxes/drift.tmLanguage.json`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/syntaxes/drift.tmLanguage.json)
* **Root Cause:**
  The Drift compiler implements `@async`, `@fallback`, and `@catch` (`compiler/src/lexer.ts#L84`), but these directives are missing from the language server autocompletion list, hover regex, code snippets, and TextMate grammar rules.
* **Recommendation:**
  Add completion items, hover descriptions, snippets, and syntax grammar rules for `@async`, `@fallback`, and `@catch`.

---

### VSC-009: VSCode Schema Violation in `language-configuration.json` for `lineComment`
* **Severity:** Medium
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/language-configuration.json#L4-L7`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/language-configuration.json#L4-L7)
* **Root Cause:**
  `lineComment` is defined as an object:
  ```json
  "lineComment": {
    "comment": "//",
    "noIndent": false
  }
  ```
  The VSCode `LanguageConfiguration` schema defines `lineComment` strictly as a `string` (`"lineComment": "//"`). Supplying an object causes schema validation errors in VSCode and breaks line comment toggling (Ctrl+/).
* **Recommendation:**
  Change `"lineComment"` to `"//"`.

---

### VSC-010: State Variable Hover False Positives on Plain HTML Text and Element Tag Names
* **Severity:** Medium
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts#L505-L524`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts#L505-L524)
* **Root Cause:**
  `onHover` scans all identifiers on the line with `/([a-zA-Z0-9_$]+)/g` and matches against declared script variables without checking if the hovered token is inside an interpolation `{ ... }` or `<script>` block. If a script declares a common name like `div`, `title`, or `count`, hovering over `<div ...>`, attribute `title="..."`, or plain text inside a `<p>` displays state variable documentation.
* **Recommendation:**
  Verify that the hovered cursor offset is inside an interpolation or `<script>` block before displaying variable tooltips.

---

### VSC-011: HTML Attribute Autocompletion Ineffective on Multiline Tags
* **Severity:** Medium
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/src/server.ts#L309`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts#L309)
* **Root Cause:**
  `linePrefix` is tested with `/<[a-zA-Z0-9_-]+\s+[^>]*$/.test(linePrefix)`. Because `.` and `[^>]` do not match newlines by default, multiline opening tags spanning across newlines fail the regex test, preventing attribute suggestions.
* **Recommendation:**
  Use multiline tag scanning or stateful lookback that tracks unclosed `<` across line boundaries.

---

### VSC-012: Inconsistent Directive Snippet Syntax Between `snippets.json` and `server.ts`
* **Severity:** Low
* **Status:** Open
* **Affected Files:**
  - [`packages/vscode-plugin/snippets.json#L5, #L12`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/snippets.json#L5)
  - [`packages/vscode-plugin/src/server.ts#L241`](file:///home/hrutav-modha/Documents/driftjs/packages/vscode-plugin/src/server.ts#L241)
* **Root Cause:**
  `snippets.json` defines `@if` without parentheses (`@if ${1:condition} {`) and uses prefix `"@elseif"`, while `server.ts` emits `@if (${1:condition}) {\n\t$0\n}` and `@else if`.
* **Recommendation:**
  Standardize both files to use canonical DriftJS syntax with consistent prefix triggers.

---

### VSC-013: VSCode Extension Test Suite Omitted from Root `vitest.config.ts`
* **Severity:** Low
* **Status:** Open
* **Affected Files:**
  - [`vitest.config.ts#L8-L84`](file:///home/hrutav-modha/Documents/driftjs/vitest.config.ts#L8-L84)
* **Root Cause:**
  The root Vitest configuration project list includes `compiler`, `utils`, `ssr`, `vite-plugin`, `cli`, `dom`, and `router`, but omits `packages/vscode-plugin/tests/**/*.test.ts`. Running root `pnpm test` skips testing the VSCode extension.
* **Recommendation:**
  Add a `vscode-plugin` project entry to root `vitest.config.ts`.
