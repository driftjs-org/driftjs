# DriftJS Project Roadmap & TODO

This document outlines the strategic technical roadmap for DriftJS, covering the upcoming major version milestones, architecture refactoring, state engine redesign, and ecosystem tooling.

---

## 🗺️ Milestone Overview

| Milestone             | Focus Area                                                                | Status     |
| :-------------------- | :------------------------------------------------------------------------ | :--------- |
| **Milestone 1** | DevTools Cross-Browser Packaging & Release Automation                     | 📋 Planned |
| **Milestone 2** | Explicit State Declaration API (`$state`, `$derived`, `$effect`)    | 📋 Planned |
| **Milestone 3** | Compiler & Register VM Architecture Refactoring                           | 📋 Planned |
| **Milestone 4** | Two-Way Binding (`@bind`), Component Slots & `<Head>` Metadata        | 📋 Planned |
| **Milestone 5** | Tooling & TypeScript SFC Support (`<script lang="ts">`, VSCode, ESLint) | 📋 Planned |
| **Milestone 6** | Examples Showcase & Compiler Fixtures Infrastructure                      | 🚧 In Progress |
| **Milestone 7** | Cross-Browser Matrix Testing (Gecko, WebKit, Blink) & Benchmarks          | ✅ Done        |

---

## Milestone 1: DevTools Cross-Browser Packaging & Release

### 1.1 Dual-Target Build System

- [ ] Configure `devtool/vite.config.ts` with target environment flag (`TARGET=firefox | chrome`).
- [ ] Generate browser-specific manifest outputs:
  - **Firefox**: `"background": { "scripts": ["background.js"] }` + Gecko metadata.
  - **Chrome/Edge**: `"background": { "service_worker": "background.js" }`.
- [ ] Add dual packaging npm scripts in `devtool/package.json`:
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
- [ ] Host self-installable `.xpi` link on the official DriftJS website/docs.

### 1.3 DevTools Feature Enhancements

- [ ] **Component Filter/Search**: Real-time search box in sidebar to filter VM instances by name or ID.
- [ ] **State Time-Travel / History**: Record scope mutations with an undo/redo slider in the Timeline.
- [ ] **Interactive VM Stepper**: Step-by-step bytecode instruction execution for debugging reactive updates.
- [ ] **Performance Profiling**: Microtask flush timings, reconciliation duration, and DOM patch counters.

---

## Milestone 2: Explicit State Primitives Rewrite

### 2.1 Problem Statement with Implicit Reactivity

*Currently, all `let` variables in `<script>` are heuristically treated as potentially reactive, leading to:*

- Ambiguity between local transient helpers and tracked component state.
- Over-broad dependency tracking and unnecessary reactive binding entries.
- Inability to declare read-only derived computations cleanly without manual function calls.

### 2.2 New Explicit State Declaration API

- [ ] **`$state(initialValue)`**:
  - Explicit reactive state primitive.
  - Replaces arbitrary `let` tracking with unambiguous reactive state cells.

  ```typescript
  // In .drift <script>
  let count = $state(0);
  let user = $state({ name: 'Alice', active: true });
  ```
- [ ] **`$derived(expression)`**:
  - Memoized reactive computed value.
  - Automatically tracks dependencies and re-evaluates only when source state cells mutate.

  ```typescript
  let double = $derived(count * 2);
  let statusText = $derived(user.active ? 'Online' : 'Offline');
  ```
- [ ] **`$effect(callback)`**:
  - Declarative side-effect runner with automatic teardown/cleanup support.
  - Runs after microtask flush when dependencies change.

  ```typescript
  $effect(() => {
    console.log(`Count changed to: ${count}`);
    return () => console.log('Cleanup before next run');
  });
  ```
- [ ] **`$props()`**:
  - Explicit component input property definition with type safety and default fallbacks.

  ```typescript
  let { title = 'Default', count = 0 } = $props();
  ```

---

## Milestone 3: Compiler & Register VM Refactoring

### 3.1 Compiler Overhaul (`driftjs-compiler`)

- [ ] **Transformer AST Visitor**:
  - Detect `$state`, `$derived`, `$effect`, and `$props` AST call nodes during Acorn pass.
  - Segregate component scope into:
    - `reactiveState`: Variables declared with `$state`.
    - `derivedState`: Variables declared with `$derived`.
    - `staticVars`: Plain local variables and helper functions.
  - Build fine-grained dependency graph for `$derived` computations.
- [ ] **Bytecode Generator Updates**:
  - New opcode emission for explicit state primitives:
    - `OP_UPDATE_STATE` (`0x10`): In-place atomic state cell update.
    - `OP_EVAL_DERIVED` (`0x11`): Trigger cached derived re-computation.
    - `OP_REGISTER_EFFECT` (`0x12`): Register post-flush effect callback.
  - Eliminate dead-code reactive bindings for non-state variables.

### 3.2 Client Runtime Engine (`driftjs-dom`)

- [ ] **`DriftClientVM` State Core**:
  - Replace prototype-chain scope mutations with direct Signal/Cell subscription graph.
  - Fast-path dirty checking: only notify downstream regions when `$state` value actually changes (`Object.is` check).
  - Clean up microtask batching to flush `$derived` re-evaluations before DOM reconciliation.
- [ ] **SSR Synchronization (`driftjs-ssr`)**:
  - Adapt `DriftServerVM` to execute `$state` and `$derived` synchronously during initial HTML serialization.

---

## Milestone 4: Directives & Component Composition

### 4.1 Two-Way Binding (`@bind`)

- [ ] **Input Bindings**:
  - `@bind:value` on text inputs and textareas (auto-sync `value` property and `input` events).
  - `@bind:checked` on checkboxes and radio buttons.
  - `@bind:group` for radio and multi-checkbox collections.
- [ ] **Compiler Desugaring**:
  - Desugar `@bind:value={name}` into pair of:
    - Dynamic attribute assignment: `value={name}`.
    - Delegated event listener: `oninput={(e) => { name = e.target.value; }}`.

### 4.2 Component Slots & Content Projection

- [ ] Default slot projection (`<slot />` inside component sub-modules).
- [ ] Named slots (`<slot name="header" />` and `<div slot="header">`).
- [ ] Scoped slots: passing data from child VM to parent projection slot (`<slot {item} />`).
- [ ] Dynamic component mounting opcode (`OP_MOUNT_DYNAMIC`).

### 4.3 Declarative `<Head>` & Document Metadata Management (⚡ High Priority)

- [ ] **`<Head>` Template Tag Support**:
  - Declarative `<Head>` element inside `.drift` components to manage `<title>`, `<meta>`, `<link>`, and OpenGraph social tags:
    ```html
    <Head>
      <title>{post.title} - DriftJS</title>
      <meta name="description" content={post.summary} />
      <meta property="og:image" content={post.coverUrl} />
    </Head>
    ```
- [ ] **SSR Head Hoisting (`driftjs-ssr`)**:
  - Collect all `<Head>` child nodes during `renderToString` / `renderToStream`.
  - Hoist and inject tags into the server HTML document `<head>` without rendering comment anchors in the body.
- [ ] **CSR Dynamic Head Sync (`driftjs-dom`)**:
  - Dynamically patch `document.title` and `<head>` metadata in browser client on route transitions or reactive state updates.
  - Automatically de-duplicate meta tags by `name` or `property` attribute to avoid duplicate tag pollution.
  - Cleanup/restore previous tags on component unmount.

---

## Milestone 5: Tooling, Developer Ecosystem & TypeScript

### 5.1 First-Class TypeScript in SFCs (`<script lang="ts">`)

- [ ] Support `<script lang="ts">` in `.drift` single-file components.
- [ ] Integrate TypeScript type stripping via `acorn-typescript` / Sucrase in `driftjs-compiler` so type annotations don't throw syntax errors.
- [ ] Preserve full type checking and type inference in `driftjs-vscode` language server (diagnostics, completions, hover info).

### 5.2 VSCode Extension (`driftjs-vscode`)

- [ ] Syntax highlighting grammar for `$state`, `$derived`, `$effect`, `$props`, and `@bind`.
- [ ] Hover tooltips showing type signatures and reactive dependency links.
- [ ] Autocomplete snippets for explicit state primitives, `<Head>`, and component directives.

### 5.3 ESLint Plugin (`driftjs-eslint-plugin`)

- [ ] Rule: `drift/no-untracked-mutations` — Warn when reassigning variables not declared with `$state()`.
- [ ] Rule: `drift/no-derived-side-effects` — Forbid side-effects inside `$derived()` expressions.
- [ ] Rule: `drift/valid-slot-names` — Validate slot usage against component declarations.

### 5.4 Prettier Plugin (`driftjs-prettier-plugin`)

- [ ] Formatter rules for `@bind` directive syntax, `<Head>` tags, and `$state` declarations.
- [ ] Clean multiline formatting for reactive directive attributes.

---

## Milestone 6: Examples Showcase & Compiler Fixtures Infrastructure (🚧 In Progress)

### 6.1 `examples/` Directory (Official Runnable Demonstrations)

- [ ] **TodoMVC (`examples/todomvc`)**: Canonical TodoMVC implementation demonstrating keyed list reconciliation (`@for`), conditional editing (`@if`), and reactive item counts.
- [ ] **HackerNews App (`examples/hackernews`)**: SSR + client hydration demo with routing, async data fetching, story listings, and comments tree.
- [ ] **Interactive Realtime Dashboard (`examples/dashboard`)**: High-frequency state mutation demo with SVG charts, timer intervals, and multi-component state sharing.
- [ ] **Basic Directives Sandbox (`examples/basic`)**: Clean, minimal playground showcasing directives (`@if`, `@else if`, `@else`, `@for`, `@switch`), event delegation, and scope bindings.
- [ ] **E-Commerce Cart (`examples/cart`)**: Demonstrates derived sub-totals, coupon code recalculation, and fast-path row patching.

### 6.2 `fixtures/` Directory (Compiler & Runtime Golden Test Cases)

- [ ] **AST & Token Fixtures (`fixtures/compiler/ast`)**: Golden AST snapshots for diverse template combinations (nested control flow, comments, self-closing tags).
- [ ] **Bytecode Golden Disassembly (`fixtures/compiler/bytecode`)**: Expected bytecode instruction streams for every directive pattern to catch compiler regressions.
- [ ] **Hydration Mismatch Fixtures (`fixtures/dom/hydration`)**: Test cases verifying hydration behavior when server HTML diverges from client state.
- [ ] **Syntax Error Diagnostics (`fixtures/compiler/diagnostics`)**: Golden compiler error messages verifying line/column precision for invalid template syntax.

---

## Milestone 7: Cross-Browser Matrix Testing & Performance Optimizations (✅ Done)

### 7.1 Cross-Browser Testing Matrix (Gecko, WebKit, Chromium)

- [x] **Multi-Browser Runner Integration**:
  - Currently, browser-mode Vitest runs on **Chromium** only.
  - Expand `@vitest/browser` and Playwright configuration to run across all three major browser engines:
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
