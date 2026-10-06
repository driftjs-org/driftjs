# Known Issues & Bug Tracking

This document tracks identified bugs, architectural defects, and security vulnerabilities across the DriftJS codebase, classified into audit categories and prioritized by severity.

## Summary Table

| ID | Category | Severity | Summary | Status |
| :--- | :--- | :---: | :--- | :---: |
| **BUG-01** | #1 Duplicated Localized Implementations / #3 Correct-but-Poor | 🟡 P2 | `normalizePath()` duplicated between Router and SSG | **Open** |
| **BUG-02** | #3 Correct-but-Poor Implementation | 🟡 P2 | SSG recompiles the same `.drift` source multiple times during one build | **Open** |
| **BUG-03** | #3 Correct-but-Poor / #5 Missed Optimizations | 🟡 P2 | Compiler constant-pool deduplication is potentially $O(n^2)$ + repeated `JSON.stringify()` | **Open** |
| **BUG-04** | #5 Compiler Optimization / Architectural Inefficiency | 🟡 P2 | Compiler walks expression ASTs repeatedly for dependency extraction | **Open** |
| **BUG-05** | #4 Security | 🔴 P1 | `wrapIslandHtml()` allows raw HTML attribute injection | **Fixed** |
| **BUG-06** | #4 Security | 🔴 P1 | `generateIslandBootstrapSource()` generates import statements without escaping module specifiers | **Fixed** |
| **BUG-07** | #3 Correct-but-Poor Implementation | 🔴 P1 | Version bump scripts fail to update CLI template package versions | **Open** |

---

## Detailed Bug Reports

### BUG-01: `normalizePath()` Duplicated Between Router and SSG

- **Category:** #1 Duplicated Localized Implementations / #3 Correct-but-Poor
- **Severity:** 🟡 P2
- **Status:** **Open**
- **Affected Files:**
  - `packages/router/src/path.ts`
  - `packages/ssg/src/router/scanner.ts`
- **Description:**
  Two separate, localized implementations of path normalization exist across packages:
  - `packages/router/src/path.ts`:
    ```ts
    export function normalizePath(path: string): string {
      if (!path || path === '/') return '/';
      let norm = path.replace(/\/+/g, '/');
      if (!norm.startsWith('/')) norm = '/' + norm;
      if (norm.length > 1 && norm.endsWith('/')) norm = norm.slice(0, -1);
      return norm;
    }
    ```
  - `packages/ssg/src/router/scanner.ts`:
    ```ts
    export function normalizePath(p: string): string {
      if (!p || p === '/') return '/';
      let clean = p.replace(/\/+/g, '/');
      if (clean.length > 1 && clean.endsWith('/')) {
        clean = clean.slice(0, -1);
      }
      return clean.startsWith('/') ? clean : `/${clean}`;
    }
    ```
  While currently producing identical outputs for common paths, having two divergent implementations risks subtle behavioral discrepancies as router path handling evolves.
- **Action Plan:**
  Extract a canonical `normalizePath` utility to `packages/utils/src/path.ts` (`driftjs-shared`) and consume it in both Router and SSG.

---

### BUG-02: SSG Recompiles the Same `.drift` Source Multiple Times During Build

- **Category:** #3 Correct-but-Poor Implementation
- **Severity:** 🟡 P2
- **Status:** **Open**
- **Affected Files:**
  - `packages/ssg/src/islands/scanner.ts`
  - `packages/ssg/src/build/builder.ts`
- **Description:**
  During static site generation, the same `.drift` file is repeatedly scanned, parsed, and compiled:
  1. `scanIslands()` calls `collectScriptImports(templateSource)` which invokes `compile(templateSource)`.
  2. `scanIslands()` immediately afterwards separately lexes and parses the same source with `new DriftLexer()` and `new DriftParser()`.
  3. `builder.ts` calls `extractCssImports(src, filePath)` which invokes `compile(templateSource)` again.
  4. Later, during page resolution and layout application, `scanIslands()` is called again for the page and layout components.
  For projects with dozens or hundreds of pages and components, this results in significant redundant CPU overhead.
- **Action Plan:**
  Implement a unified source analysis pass (e.g., `analyzeDriftSource()`) that compiles/parses once and caches/reuses the AST, compiled bytecode module, island metadata, and imports throughout the SSG pipeline.

---

### BUG-03: Compiler Constant-Pool Deduplication is $O(n^2)$ with Repeated `JSON.stringify()`

- **Category:** #3 Correct-but-Poor / #5 Missed Optimizations
- **Severity:** 🟡 P2
- **Status:** **Open**
- **Affected Files:**
  - `packages/compiler/src/generator.ts`
- **Description:**
  When adding values to the constant pool, `addConstant()` scans the existing constants array using `findIndex()` and performs deep comparison with `JSON.stringify(a) === JSON.stringify(b)`.
  Because the constant pool stores complex structures (expression AST thunks, sub-module objects, reactive dependency lists, props specifications, and switch tables), doing linear scans with JSON serialization on every constant addition leads to quadratic $O(n^2)$ compile-time scaling and high GC pressure.
- **Action Plan:**
  Introduce keyed lookup using `Map<string, number>` with fast deterministic keys for primitive constants, and avoid repeated deep JSON stringification scans for compound constants.

---

### BUG-04: Compiler Walks Expression ASTs Repeatedly for Dependency Extraction

- **Category:** #5 Compiler Optimization / Architectural Inefficiency
- **Severity:** 🟡 P2
- **Status:** **Open**
- **Affected Files:**
  - `packages/compiler/src/generator.ts`
- **Description:**
  The bytecode generator traverses the same Acorn AST multiple times:
  - `addExpressionConstant()` runs `this.extractIdentifiers(ast)` to determine reactive dependencies.
  - Reactive binding generation calls `recordBindingPositions(expr, pc)`, which traverses the exact same AST again with `this.extractIdentifiers(expr)`.
- **Action Plan:**
  Consolidate expression inspection into a single analysis step (`analyzeExpression(ast)`) returning code string, referenced identifiers, and filtered reactive dependencies in one traversal.

---

### BUG-05: `wrapIslandHtml()` Allows Raw HTML Attribute Injection

- **Category:** #4 Security
- **Severity:** 🔴 P1
- **Status:** **Fixed**
- **Affected Files:**
  - `packages/ssg/src/islands/wrapper.ts`
  - `packages/utils/src/html.ts`
  - `packages/ssr/src/index.ts`
- **Description:**
  `wrapIslandHtml()` interpolated `islandName`, `islandTag`, `className`, `media`, `rootMargin`, and `props` directly into the wrapping HTML tag without HTML entity escaping or tag-name validation. An island name containing quotes or a malicious `islandTag` could inject arbitrary attributes or HTML tags (XSS / attribute breakout).
- **Resolution:**
  - Implemented centralized `escapeHtml()`, `unescapeHtml()`, and `isValidHtmlTagName()` in `driftjs-shared` (`packages/utils/src/html.ts`).
  - Updated `wrapIslandHtml()` to validate `options.islandTag` (falling back to `'div'`) and escape all attribute values (`islandName`, `trigger`, `className`, `media`, `rootMargin`, and serialized `props`).
  - Standardized SSR `renderIslandToString()` to use the shared validation and escaping logic.
  - Added security test coverage in `packages/ssg/tests/islands.test.ts`.

---

### BUG-06: `generateIslandBootstrapSource()` Generates Imports Without Escaping Module Specifiers

- **Category:** #4 Security
- **Severity:** 🔴 P1
- **Status:** **Fixed**
- **Affected Files:**
  - `packages/ssg/src/islands/bundler.ts`
- **Description:**
  `generateIslandBootstrapSource()` generated client-side JavaScript bootstrap code by concatenating module paths inside single quotes:
  ```ts
  `import ${importName} from '${resolvedImport}';`
  ```
  If a module path or export name contained single quotes or escaped characters, it would break out of the string literal in the generated JavaScript source file, causing syntax errors or arbitrary code execution during bundling.
- **Resolution:**
  - Replaced manual single-quote interpolation with `JSON.stringify(resolvedImport)`, matching the standard behavior in `packages/compiler/src/esm.ts`.
  - Added test verification in `packages/ssg/tests/islands.test.ts` verifying that module specifiers containing quotes and comments are safely escaped.

---

### BUG-07: Version Bump Scripts Fail to Update CLI Template Versions

- **Category:** #3 Correct-but-Poor Implementation
- **Severity:** 🔴 P1
- **Status:** **Open**
- **Affected Files:**
  - `scripts/version/patch.js`
  - `scripts/version/minor.js`
  - `scripts/version/major.js`
  - `packages/cli/template/package.json`
- **Description:**
  The version management scripts (`scripts/version/patch.js`, `minor.js`, `major.js`) increment package versions in workspace packages (`packages/*/package.json`), but do not synchronize the versions inside the scaffolding templates (e.g. `packages/cli/template/package.json`).
  As a result, running `create-drift` to scaffold a new project creates a `package.json` pointing to stale or nonexistent dependency versions.
- **Action Plan:**
  Update the version bump scripts to include `packages/cli/template/package.json` (and any other starter template package configs) in the list of files updated during patch, minor, and major version increments.
