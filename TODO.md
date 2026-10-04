# DriftJS Project Roadmap & TODO

This document outlines the strategic technical roadmap for DriftJS, covering upcoming version milestones, architecture refactoring, state engine redesign, and ecosystem tooling.

---

## 🗺️ Milestone Overview

| Milestone | Focus Area | Status |
| :--- | :--- | :--- |
| **Milestone 1** | DevTools Cross-Browser Packaging & Release Automation | 📋 Planned |
| **Milestone 2** | Fine-Grained Reactive State Primitives (Signals, Computed Nodes, Effects, Props) | 📋 Planned |
| **Milestone 3** | Compiler & Register VM Architecture Refactoring | 📋 Planned |
| **Milestone 4** | Two-Way Form Data Binding, Component Content Projection (Slots) & Metadata Management | 📋 Planned |
| **Milestone 5** | Tooling & TypeScript SFC Integration (`<script lang="ts">`, VSCode, ESLint) | 📋 Planned |
| **Milestone 6** | Examples Showcase & Consumer Fixtures Infrastructure | 🚧 In Progress |
| **Milestone 7** | Cross-Browser Matrix Testing (Gecko, WebKit, Blink) & Benchmarks | ✅ Done |

---

## Milestone 1: DevTools Cross-Browser Packaging & Release

### 1.1 Dual-Target Build System

- [ ] Configure `devtool/vite.config.ts` with target environment flag (`TARGET=firefox | chrome`).
- [ ] Generate browser-specific manifest outputs:
  - **Firefox**: WebExtensions Manifest v2/v3 with background script declarations and Gecko ID metadata.
  - **Chrome/Edge**: Manifest v3 with background service worker integration.
- [ ] Add dual packaging scripts in `devtool/package.json`:
  ```bash
  pnpm --filter devtool build:firefox   # Emits dist/firefox & drift-devtools-firefox.zip
  pnpm --filter devtool build:chrome    # Emits dist/chrome & drift-devtools-chrome.zip
  ```

### 1.2 Store Submission & CI/CD Pipeline

- [ ] Create GitHub Actions workflow (`.github/workflows/devtools-release.yml`):
  - On version tag release: automatically build both browser packages.
  - Sign Firefox `.xpi` via Mozilla Add-ons (AMO) API (`web-ext sign`).
  - Attach signed `.xpi` (Firefox) and `.zip` (Chrome) to GitHub Releases.
- [ ] Submit public listing to **Mozilla Add-ons (AMO)** store.
- [ ] Submit public listing to **Chrome Web Store**.
- [ ] Host self-installable `.xpi` link on the official documentation site.

### 1.3 DevTools Feature Enhancements

- [ ] **Component Filter/Search**: Real-time search in sidebar to filter VM instances by name or instance ID.
- [ ] **State Time-Travel / History**: Record scope mutations with an undo/redo slider in the Timeline panel.
- [ ] **Interactive VM Stepper**: Step-by-step bytecode instruction execution for debugging reactive updates.
- [ ] **Performance Profiling**: Microtask flush timings, reconciliation duration, and DOM patch counters.

---

## Milestone 2: Fine-Grained Reactive State Primitives

### 2.1 Limitations of Heuristic Scope Reactivity

- Ambiguity between transient local variables and tracked component state.
- Over-broad dependency tracking and unnecessary reactive binding entries in constant pools.
- Inability to declare memoized computed values cleanly without runtime function execution overhead.

### 2.2 Technical Primitive Specifications

- [ ] **Reactive State Cells (Signals)**:
  - Explicit reactive state primitive holding atomic values or reactive references.
  - Eliminates broad `let` tracking in favor of precise state cells.
  - Notifies subscribers on mutation via strict equality checks (`Object.is`).
- [ ] **Computed / Derived State Nodes**:
  - Pure, memoized reactive derivation nodes.
  - Automatically track dependencies and re-evaluate only when upstream source state cells mutate.
  - Cache results across multiple reads within the same render pass.
- [ ] **Side-Effect Subscriptions**:
  - Declarative side-effect runner with automatic teardown and cleanup callbacks.
  - Executes post-microtask flush when tracked dependencies change.
- [ ] **Component Input Specifications (Props)**:
  - Explicit component input contract definition with compile-time type validation, immutability, and default fallback values.

---

## Milestone 3: Compiler & Register VM Refactoring

### 3.1 Compiler Overhaul (`driftjs-compiler`)

- [ ] **Transformer AST Visitor**:
  - Detect state declarations, computed nodes, effect subscriptions, and props declarations during Acorn AST traversal.
  - Segregate component scope into:
    - `reactiveState`: State cells triggering dependency invalidation.
    - `derivedState`: Memoized computed nodes.
    - `staticVars`: Immutable local variables and static helper functions.
  - Build fine-grained dependency graph for computed derivations.
- [ ] **Bytecode Generator Updates**:
  - Dedicated opcode emission for fine-grained state primitives:
    - `OP_UPDATE_STATE` (`0x10`): In-place atomic state cell mutation.
    - `OP_EVAL_DERIVED` (`0x11`): Trigger cached derived re-computation.
    - `OP_REGISTER_EFFECT` (`0x12`): Register post-flush side-effect callback.
  - Eliminate dead-code reactive bindings for non-reactive local variables.

### 3.2 Client Runtime Engine (`driftjs-dom`)

- [ ] **`DriftClientVM` State Core**:
  - Replace prototype-chain scope mutations with direct signal/cell dependency graph.
  - Fast-path dirty checking: only notify downstream regions when state values actually change (`Object.is` check).
  - Synchronized microtask batching to flush derived re-evaluations before DOM reconciliation.
- [ ] **SSR Synchronization (`driftjs-ssr`)**:
  - Adapt `DriftServerVM` to evaluate state cells and derived expressions synchronously during initial HTML serialization.

---

## Milestone 4: Directives, Form Synchronization & Component Projection

### 4.1 Two-Way Form Data Binding & Input Synchronization

- [ ] **Form Control Synchronization**:
  - Bidirectional data synchronization for text inputs and textareas (auto-syncing `value` property and `input` events).
  - Boolean property synchronization for checkboxes and radio buttons (`checked` property).
  - Collection synchronization for grouped radio and multi-checkbox controls.
  - Native support for Input Method Editor (IME) composition sessions to prevent dropped keystrokes.
- [ ] **Compiler Desugaring**:
  - Desugar bidirectional form directives into paired:
    - Unidirectional dynamic property assignment.
    - Centralized delegated event listener dispatch.

### 4.2 Component Content Projection (Slots)

- [ ] Default content projection outlet (`<slot />` inside component sub-modules).
- [ ] Named projection outlets for multi-slot component composition.
- [ ] Scoped content projection: passing child VM parameters back to parent projection templates.
- [ ] Dynamic component mounting opcode (`OP_MOUNT_DYNAMIC`).

### 4.3 Declarative Document Metadata Management (`<Head>`)

- [ ] **`<Head>` Component Element**:
  - Declarative `<Head>` component inside `.drift` templates to manage `<title>`, `<meta>`, `<link>`, and OpenGraph social tags.
- [ ] **SSR Head Hoisting (`driftjs-ssr`)**:
  - Collect all `<Head>` child nodes during `renderToString` / `renderToStream`.
  - Hoist and inject tags into the server HTML document `<head>` without rendering comment anchors in the body.
- [ ] **CSR Dynamic Head Sync (`driftjs-dom`)**:
  - Dynamically patch `document.title` and `<head>` metadata in browser client on route transitions or reactive state updates.
  - Automatically deduplicate meta tags by `name` or `property` attributes to prevent tag pollution.
  - Clean up and restore previous tags on component unmount.

---

## Milestone 5: Tooling, Developer Ecosystem & TypeScript

### 5.1 First-Class TypeScript in SFCs (`<script lang="ts">`)

- [ ] Support `<script lang="ts">` in `.drift` single-file components.
- [ ] Integrate TypeScript type stripping via `acorn-typescript` / Sucrase in `driftjs-compiler` so type annotations don't throw syntax errors.
- [ ] Preserve full type checking and type inference in `driftjs-vscode` language server (diagnostics, completions, hover info).

### 5.2 VSCode Extension (`driftjs-vscode`)

- [ ] Syntax highlighting grammar for state primitives, form bindings, metadata elements, and component directives.
- [ ] Hover tooltips showing type signatures and reactive dependency links.
- [ ] Autocomplete snippets for explicit state primitives, `<Head>`, and component contracts.

### 5.3 ESLint Plugin (`driftjs-eslint-plugin`)

- [ ] Rule: `drift/no-untracked-mutations` — Warn when reassigning variables outside reactive state cell declarations.
- [ ] Rule: `drift/no-derived-side-effects` — Forbid side-effects inside computed expressions.
- [ ] Rule: `drift/valid-slot-names` — Validate slot usage against component declarations.

### 5.4 Prettier Plugin (`driftjs-prettier-plugin`)

- [ ] Formatter rules for form binding attributes, `<Head>` tags, and state primitive declarations.
- [ ] Clean multiline formatting for reactive directive attributes.

---

## Milestone 6: Examples Showcase & Consumer Fixtures Infrastructure (🚧 In Progress)

### 6.1 `examples/` Directory (Official Runnable Demonstrations)

- [ ] **TodoMVC (`examples/todomvc`)**: Canonical TodoMVC implementation demonstrating keyed list reconciliation (`@for`), conditional editing (`@if`), and reactive item counts.
- [ ] **HackerNews App (`examples/hackernews`)**: SSR + client hydration demo with routing, async data fetching, story listings, and comments tree.
- [ ] **Interactive Realtime Dashboard (`examples/dashboard`)**: High-frequency state mutation demo with SVG charts, timer intervals, and multi-component state sharing.
- [ ] **Basic Directives Sandbox (`examples/basic`)**: Clean, minimal playground showcasing directives (`@if`, `@else if`, `@else`, `@for`, `@switch`), event delegation, and scope bindings.
- [ ] **E-Commerce Cart (`examples/cart`)**: Demonstrates derived sub-totals, coupon code recalculation, and fast-path row patching.

### 6.2 `fixtures/` Directory (Consumer & Packaging Integration Fixtures)

Maintainer-facing minimal consumer projects to verify package distribution, bundling, and TypeScript declaration resolution in CI (distinct from module unit tests and human-facing examples):

- [ ] **Basic Vite Consumer (`fixtures/basic`)**:
  - Minimal consumer project (`package.json`, `vite.config.ts`, `App.drift`) consuming built packages as external dependencies.
  - Verifies `driftjs-unplugin` transform pipeline, template compilation, DOM mounting, and event delegation from a consumer perspective.
- [ ] **SSR & Hydration Consumer (`fixtures/ssr`)**:
  - Minimal Node.js application performing server-side HTML generation with `driftjs-ssr` and client-side hydration via `driftjs-dom`.
  - Verifies server-side HTML rendering, comment anchor preservation, and hydration parity without workspace source links.
- [ ] **Published Package / NPM Consumer (`fixtures/npm-consumer`)**:
  - Independent project consuming local package tarballs (`pnpm pack`) or published npm releases.
  - Verifies `package.json` `"exports"` field mappings, ESM/CJS compatibility, and TypeScript declaration (`index.d.ts`) resolution.
- [ ] **Automated CI Build & Verification Suite**:
  - Automated CI task running `pnpm build` across all fixture projects to catch packaging, export, or bundler plugin regressions before releases.

---

## Milestone 7: Cross-Browser Matrix Testing & Performance Optimizations (✅ Done)

### 7.1 Cross-Browser Testing Matrix (Gecko, WebKit, Chromium)

- [x] **Multi-Browser Runner Integration**:
  - Configure `@vitest/browser` and Playwright across all three major browser engines:
    - **Chromium** (Google Chrome, Microsoft Edge, Brave)
    - **Firefox (Gecko)**
    - **WebKit** (Apple Safari engine)
- [x] **Engine-Specific Edge Case Verification**:
  - Keyed list LIS moves and DOM layout recalculation quirks in Gecko vs WebKit vs Chromium.
  - Event delegation handling across synthetic and native browser events.
  - SSR hydration cursor traversal across different browser DOM parser implementations.
- [x] **CI Matrix Automated Testing**:
  - GitHub Actions matrix running automated test suites on Linux, macOS, and Windows across Chromium, Firefox, and WebKit.

### 7.2 Performance Benchmarking & VM Memory Optimizations

- [x] **Official JS Framework Benchmark Integration**:
  - Integrate official **JS Framework Benchmark** (krausest/js-framework-benchmark) runner.
  - Measure and publish metrics:
    - 1,000 / 10,000 rows creation time.
    - Row swap (1k rows swap indices 1 and 998).
    - Clear rows and partial updates.
    - Memory consumption (retained heap size after 100 iterations).
- [x] **VM Register Pooling**:
  - Implement register allocation reuse in the compiler generator to minimize VM register array sizes from fixed 256 to active high-water mark.
  - Constant pool deduplication across compiled sub-modules.
