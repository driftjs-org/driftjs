# Known Issues & Bug Tracking

This document tracks identified bugs, architectural defects, and security vulnerabilities across the DriftJS codebase, classified into audit categories and prioritized by severity. Summary Table

| ID               | Category                                                      | Severity | Summary                                                                                            |     Status     |
| :--------------- | :------------------------------------------------------------ | :------: | :------------------------------------------------------------------------------------------------- | :-------------: |
| **BUG-01** | #1 Duplicated Localized Implementations / #3 Correct-but-Poor |  🟡 P2  | `normalizePath()` duplicated between Router and SSG                                              | **Fixed** |
| **BUG-02** | #3 Correct-but-Poor Implementation                            |  🟡 P2  | SSG recompiles the same`.drift` source multiple times during one build                           | **Fixed** |
| **BUG-03** | #3 Correct-but-Poor / #5 Missed Optimizations                 |  🟡 P2  | Compiler constant-pool deduplication is potentially$O(n^2)$ + repeated `JSON.stringify()`      | **Fixed** |
| **BUG-04** | #5 Compiler Optimization / Architectural Inefficiency         |  🟡 P2  | Compiler walks expression ASTs repeatedly for dependency extraction                                | **Fixed** |
| **BUG-05** | #4 Security                                                   |  🔴 P1  | `wrapIslandHtml()` allows raw HTML attribute injection                                           | **Fixed** |
| **BUG-06** | #4 Security                                                   |  🔴 P1  | `generateIslandBootstrapSource()` generates import statements without escaping module specifiers | **Fixed** |
| **BUG-07** | #3 Correct-but-Poor Implementation                            |  🔴 P1  | Version bump scripts fail to update CLI template package versions                                  | **Fixed** |

---

## Detailed Bug Reports

### BUG-01: `normalizePath()` Duplicated Between Router and SSG

- **Category:** #1 Duplicated Localized Implementations / #3 Correct-but-Poor
- **Severity:** 🟡 P2
- **Status:** **Fixed**
- **Affected Files:**
  - `packages/utils/src/path.ts`
  - `packages/router/src/path.ts`
  - `packages/ssg/src/router/scanner.ts`
- **Description:**
  Two separate, localized implementations of path normalization existed across packages:
  - `packages/router/src/path.ts`
  - `packages/ssg/src/router/scanner.ts`
  While producing identical outputs for common paths, having two divergent implementations risked subtle behavioral discrepancies as router path handling evolved.
- **Resolution:**
  - Extracted the canonical `normalizePath` utility to `driftjs-shared` (`packages/utils/src/path.ts`).
  - Re-exported `normalizePath` from `packages/router/src/path.ts` and `packages/ssg/src/router/scanner.ts` to preserve public API compatibility.
  - Added unit test coverage in `packages/utils/tests/utils.test.ts`.

---

### BUG-02: SSG Recompiles the Same `.drift` Source Multiple Times During Build

- **Category:** #3 Correct-but-Poor Implementation
- **Severity:** 🟡 P2
- **Status:** **Fixed**
- **Affected Files:**
  - `packages/ssg/types/islands.ts`
  - `packages/ssg/src/islands/scanner.ts`
  - `packages/ssg/src/build/builder.ts`
  - `packages/ssg/src/router/paths.ts`
  - `packages/ssg/src/render/renderer.ts`
- **Description:**
  During static site generation, the same `.drift` file was repeatedly scanned, parsed, and compiled:
  1. `scanIslands()` called `collectScriptImports()` which invoked `compile()`.
  2. `scanIslands()` immediately afterwards separately lexed and parsed the source with `DriftLexer` and `DriftParser`.
  3. `builder.ts` called `extractCssImports()` which invoked `compile()` again.
  4. Later, during page resolution and layout application, `scanIslands()` was called repeatedly for every page and each enclosing layout.
- **Resolution:**
  - Defined `DriftSourceAnalysis` in `packages/ssg/types/islands.ts`.
  - Implemented `analyzeDriftSource()` in `packages/ssg/src/islands/scanner.ts`, executing a single pipeline (`DriftLexer` -> `DriftParser` -> `findIslandElements` -> `DriftTransformer` -> `DriftGenerator`) to generate AST, compiled module, script imports, CSS imports, and island descriptors in one pass.
  - Added an in-memory analysis cache (`sourceAnalysisCache` with `clearSourceAnalysisCache()`) ensuring that multiple references to identical `.drift` files (pages, layouts, document templates) execute in $O(1)$ time without re-lexing, re-parsing, or re-compiling.
  - Integrated `clearSourceAnalysisCache()` into the start of `build()` in `packages/ssg/src/build/builder.ts` and reused `analyzeDriftSource()` in `extractStaticPaths()` and `scanFile()`.
  - Added automated unit tests in `packages/ssg/tests/islands.test.ts` verifying single-pass analysis, cache hits, and cache resets.

---

### BUG-03: Compiler Constant-Pool Deduplication is $O(n^2)$ with Repeated `JSON.stringify()`

- **Category:** #3 Correct-but-Poor / #5 Missed Optimizations
- **Severity:** 🟡 P2
- **Status:** **Fixed**
- **Affected Files:**
  - `packages/compiler/src/generator.ts`
  - `packages/compiler/tests/generator.test.ts`
- **Description:**
  When adding values to the constant pool, `addConstant()` scanned the existing constants array using `findIndex()` and performed deep comparison with `JSON.stringify(a) === JSON.stringify(b)`.
  Because the constant pool stores complex structures (expression AST thunks, sub-module objects, reactive dependency lists, props specifications, and switch tables), doing linear scans with JSON serialization on every constant addition led to quadratic $O(n^2)$ compile-time scaling and high GC pressure.
- **Resolution:**
  - Replaced linear array scanning with a frame-scoped `constantMap: Map<string, number>`.
  - Implemented `getConstantKey(value)` with fast deterministic prefixes (`s:`, `n:`, `b:`, `null`, `undefined`) to bypass JSON serialization entirely for primitives.
  - Single-stringified compound objects only once upon insertion into the map (`o:${JSON.stringify(value)}`), reducing pool deduplication from $O(n^2)$ comparisons to $O(1)$ lookups.
  - Handled sub-module recursion isolation in `compileNodesToSubModule()`: saved and restored `savedConstantMap` alongside `constants`, preventing sub-module constant indices from colliding with or contaminating the parent compilation frame.
  - Preserved `isConstantEqual(a, b)` for backward compatibility.
  - Added unit test coverage in `packages/compiler/tests/generator.test.ts`.

---

### BUG-04: Compiler Walks Expression ASTs Repeatedly for Dependency Extraction

- **Category:** #5 Compiler Optimization / Architectural Inefficiency
- **Severity:** 🟡 P2
- **Status:** **Fixed**
- **Affected Files:**
  - `packages/compiler/src/generator.ts`
  - `packages/compiler/src/index.ts`
  - `packages/compiler/tests/generator.test.ts`
- **Description:**
  The bytecode generator traversed the same Acorn AST multiple times:
  - `addExpressionConstant()` ran `this.extractIdentifiers(ast)` to determine reactive dependencies.
  - Reactive binding generation independently called `recordBindingPositions(expr, pc)`, which traversed the exact same AST again with `this.extractIdentifiers(expr)`.
  - Additional control flow generators (`compileIfNode`, `compileSwitchNode`, `compileForNode`, `processDerivedBindings`, `processEffectBindings`) performed independent traversals for extra dependencies.
- **Resolution:**
  - Implemented single-pass `analyzeExpression(ast, declaredVars)` and `extractIdentifiersFromAST(ast)`, returning `{ code, identifiers, deps, rootIdentifier }` in one traversal.
  - Added `exprAnalysisCache: WeakMap<object, ExpressionAnalysis>` to `DriftGenerator`, caching analysis results on the AST node reference during constant registration.
  - Updated `addExpressionConstant`, `recordBindingPositions`, `compileIfNode`, `compileSwitchNode`, `compileForNode`, `processDerivedBindings`, and `processEffectBindings` to consume the cached analysis in $O(1)$ time without repeated AST traversals.
  - Exported `analyzeExpression`, `extractIdentifiersFromAST`, and `type ExpressionAnalysis` from `packages/compiler/src/index.ts`.
  - Added unit test coverage in `packages/compiler/tests/generator.test.ts`.

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
- **Status:** **Fixed**
- **Affected Files:**
  - `scripts/version/bump.js`
  - `scripts/version/bump.d.ts`
  - `scripts/version/patch.js`
  - `scripts/version/minor.js`
  - `scripts/version/major.js`
  - `packages/cli/template/package.json`
  - `packages/cli/tests/bump.test.ts`
- **Description:**
  The version management scripts (`scripts/version/patch.js`, `minor.js`, `major.js` via `bump.js`) incremented package versions in workspace packages (`packages/*/package.json`), but failed to synchronize the versions inside the scaffolding templates (`packages/cli/template/package.json`).
  The previous implementation used a regex `/"driftjs-([^"]+)":\s*"\^[0-9.]+"/g` that strictly expected a leading `^`. Because `template/package.json` had bare versions (`0.0.16`), the regex never matched, causing `template/package.json` to remain permanently stale. Consequently, running `create-drift` generated projects with outdated dependency versions.
- **Resolution:**
  - Refactored `scripts/version/bump.js` to parse `package.json` as structured JSON and update all `driftjs-*`, `@driftjs/*`, and `create-drift` entries across `dependencies`, `devDependencies`, and `peerDependencies` to `^${newVersion}` via `updateTemplateDependencies()`.
  - Added `findCliTemplatePackageJsons()` and `updateTemplateFile()` with fallback regex handling to automatically detect and update any templates under `packages/cli`.
  - Added full TypeScript definitions in `scripts/version/bump.d.ts`.
  - Updated `packages/cli/template/package.json` to the current `^0.0.17` version.
  - Added unit test suite in `packages/cli/tests/bump.test.ts` verifying semver increment calculations, non-caret and caret template updates, workspace bump isolation, and canonical CLI template version synchronization.
