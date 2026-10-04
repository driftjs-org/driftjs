<div align="center">
  <h1>⚡ DriftJS</h1>
  <p>
    <strong>Register-Based Bytecode Virtual Machine UI Framework</strong><br />
    <em>256-Register Virtual Machine • AOT Bytecode Stream • Comment-Anchored Reactive Regions • Zero Virtual DOM</em>
  </p>
  <br />
  <img src="assets/icon.png" alt="DriftJS Logo" width="180" />
  <br /><br />

  <a href="https://www.npmjs.com/package/create-drift"><img src="https://img.shields.io/badge/version-v0.0.17-blue.svg?style=flat-square" alt="NPM Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-7.0-3178C6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="packages"><img src="https://img.shields.io/badge/tests-565%2B%20passing-brightgreen.svg?style=flat-square&logo=vitest&logoColor=white" alt="Vitest Tests" /></a>
  <a href="https://discord.gg/T66TStRvd"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Join Discord" /></a>
</div>

<br />

Have questions, feature ideas, or want to discuss compiler optimizations and register VM architecture? Connect with the core developers on [Discord](https://discord.gg/T66TStRvd), share feedback, and help shape the future of DriftJS.

---

## 📌 Overview

**DriftJS** is a frontend UI framework and reactivity engine powered by an in-browser **register-based Bytecode Virtual Machine (VM)** and an ahead-of-time (AOT) optimizing compiler.

Unlike traditional Virtual DOM frameworks (e.g. React) that allocate and diff heavy JavaScript object trees on every state change, or fine-grained proxy frameworks (e.g. Svelte, Solid) that track complex dependency graphs in runtime memory, DriftJS compiles `.drift` Single File Components (SFCs) ahead-of-time into compact, linear instruction streams (`CompiledModule`) and constant pools.

At runtime, a lightweight 256-register VM (`DriftClientVM`) executes these instructions directly against the DOM with minimal memory footprint and surgical in-place updates. The same compiled bytecode runs headlessly on the server (`driftjs-ssr`) and in static site generation (`driftjs-ssg`), creating identical comment-anchored boundaries for deterministic 1:1 hydration.

---

## 🔥 Key Architectural Features

- **⚡ 256-Register Virtual Machine (`r0`–`r255`)**: Executes a streamlined bytecode stream across dedicated register slots for DOM elements, text nodes, fragments, and primitives—eliminating virtual DOM diffing and object allocation churn.
- **📦 AOT Bytecode & Constant Pool Emission**: Ahead-of-time compilation transforms `.drift` SFCs into linear binary-like instruction streams, thunk arrays, and constant pools, with reactive state dependencies mapped directly to bytecode program counters.
- **📍 Comment-Anchored Reactive Regions**: Dynamic subtrees are isolated between DOM comment boundaries (`<!--if-->`, `<!--for-->`, `<!--switch-->`, `<!--async-->`), enabling surgical sub-tree updates without touching parent or sibling nodes.
- **🔄 Unified CSR, SSR & SSG Execution**: Universal execution across client browser DOM (`driftjs-dom`), server-side HTML streaming (`driftjs-ssr`), and static site generation (`driftjs-ssg`) with zero-mismatch hydration.
- **⚡ Keyed LIS Reconciliation**: `@for` loops employ a Longest Increasing Subsequence algorithm to calculate minimal DOM operations with fast-path in-place attribute patching when row objects update.
- **⏳ Native Async Suspense Streaming**: First-class `@async <promise> as <alias>` directive with declarative `@fallback` skeletons and `@catch` error boundaries.
- **🛠️ Comprehensive First-Party Ecosystem**: DevTools browser extension (Chrome & Firefox), VS Code extension with Language Server, ESLint plugin, Prettier plugin, SPA router, and Vite plugin.

---

## 🚀 Quick Start (CLI Scaffolder)

Create a new DriftJS app instantly using `create-drift`:

```bash
# Using pnpm
pnpm create drift my-app

# Or using npm, yarn, or bun
npm create drift my-app
bun create drift my-app
```

The interactive CLI will guide you through:

- **Rendering Strategy**: CSR (Client-Side Rendering), SSR (Server-Side Rendering), or SSG (Static Site Generation).
- **Tooling Selection**: Automatic integration with TypeScript, Vite, ESLint (`driftjs-eslint-plugin`), and Prettier (`driftjs-prettier-plugin`).
- **Auto-Installation & Server Launch**: Automatically install dependencies and spin up the local development server.

Non-interactive quick start with defaults:

```bash
npx create-drift my-app -y
```

---

## 📦 Monorepo Packages

DriftJS is organized as a modular monorepo:

| Package / Tool                        | Path                                                    | Description                                                                                     |
| :------------------------------------ | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------- |
| **`create-drift`**            | [`packages/cli`](packages/cli)                         | Interactive CLI project scaffolder (`npm create drift`)                                       |
| **`driftjs-compiler`**        | [`packages/compiler`](packages/compiler)               | AOT Lexer, Parser, AST Transformer, & 14-Opcode Bytecode Generator emitting`CompiledModule`   |
| **`driftjs-dom`**             | [`packages/dom`](packages/dom)                         | 256-Register Client VM runtime, LIS reconciler, SSR hydration, &`mount()` API                 |
| **`driftjs-ssr`**             | [`packages/ssr`](packages/ssr)                         | Headless Server-Side Rendering VM engine & HTML serializer (`renderToString()`)               |
| **`driftjs-ssg`**             | [`packages/ssg`](packages/ssg)                         | Static Site Generation meta-framework, islands bundler, & content collections                   |
| **`driftjs-shared`**          | [`packages/utils`](packages/utils)                     | Shared Scope, Context API (`createContext`, `provide`, `inject`), & expression evaluators |
| **`driftjs-router`**          | [`packages/router`](packages/router)                   | Client-side SPA routing engine with HTML5 History, Hash, and Memory drivers                     |
| **`driftjs-unplugin`**        | [`packages/unplugin`](packages/unplugin)               | Universal build plugin (Vite, Rollup, Webpack, esbuild, Rspack) transforming `.drift` SFCs      |
| **`driftjs-eslint-plugin`**   | [`packages/eslint-plugin`](packages/eslint-plugin)     | ESLint plugin & parser with template variable scope analysis & Drift-specific rules             |
| **`driftjs-prettier-plugin`** | [`packages/prettier-plugin`](packages/prettier-plugin) | Prettier formatting plugin for`.drift` SFCs with embedded Babel and CSS formatting            |
| **`driftjs-vscode-plugin`**   | [`packages/vscode-plugin`](packages/vscode-plugin)     | VS Code Extension & Language Server for`.drift` syntax highlighting & diagnostics             |
| **`devtool`**                 | [`devtool`](devtool)                                   | Chrome & Firefox DevTools browser extension for live register, component, & state inspection    |
| **`playground`**              | [`playground`](playground)                             | Interactive in-browser IDE with Monaco editor, live bytecode viewer, & CSR/SSR preview          |
| **`docs`**                    | [`docs`](docs)                                         | Official documentation site built with Drift's own SSG meta-framework                           |
| **`benchmarks`**              | [`benchmarks`](benchmarks)                             | Automated benchmark suite (CPU, memory, bundle size) vs React, Solid, Svelte, Vue, Angular      |

---

## ⚙️ Architecture & Compiler Pipeline

The DriftJS pipeline compiles declarative templates into optimized bytecode for execution by the register VM:

```
.drift SFC Source String
        │
        ▼
   ┌─────────┐
   │  Lexer  │  DriftLexer.nextToken()
   └────┬────┘  Stateful scanner: HTML tags, raw script/style, interpolations, & directives
        │
        ▼
   ┌─────────┐
   │ Parser  │  DriftParser.parse()
   └────┬────┘  Constructs AST: ProgramNode, ElementNode, IfNode, ForNode, SwitchNode, AsyncNode
        │
        ▼
   ┌────────────┐
   │Transformer │  DriftTransformer.transform()
   └────┬───────┘  Parses JS with Acorn, strips whitespace, enriches reactive bindings
        │
        ▼
   ┌───────────┐
   │ Generator │  DriftGenerator.generate()
   └────┬──────┘  Emits 14-Opcode Bytecode Stream, Constant Pool, and Reactive Dependency Table
        │
        ▼
  CompiledModule {
    bytecode: Uint32Array,
    constants: any[],
    reactiveBindings: ReactiveBinding[],
    declaredVars: string[],
    scope: Record<string, any>
  }
        │
   ┌────┴─────────────────────────────┐
   ▼                                  ▼
[ Browser: DriftClientVM ]         [ Server / SSG: DriftServerVM ]
Executes against native DOM        Executes virtual nodes & serializes HTML
Surgical in-place text & attrs     Inserts deterministic comment anchors
Keyed LIS list reconciliation      1:1 exact SSR hydration with zero mismatch
256 fast register slots            Suspense & selective islands hydration
```

### Pipeline Stages

1. **Lexer (`packages/compiler/src/lexer.ts`)**: On-demand scanner emitting typed tokens. Preserves verbatim `<script>` and `<style>` content and tracks nested braces and string literals within `{ ... }`.
2. **Parser (`packages/compiler/src/parser.ts`)**: Converts tokens into structured AST nodes representing elements, text segments, interpolations, and directives (`@if`, `@for`, `@switch`, `@async`).
3. **Transformer (`packages/compiler/src/transformer.ts`)**: Parses JavaScript expressions with Acorn, normalizes whitespace between elements, and validates directive branch structures.
4. **Generator (`packages/compiler/src/generator.ts`)**: Compiles the enriched AST into linear bytecode, extracts sub-modules for conditional/loop bodies into the constant pool, and records reactive bindings mapping variable names to bytecode PC positions.
5. **Virtual Machine (`packages/dom` & `packages/ssr`)**: Executes instructions against the 256-register file (`r0`–`r255`). When state mutates, the client VM queues microtasks and executes surgical patches exclusively on affected PC targets.

---

## 🔢 Virtual Machine Instruction Set Architecture (ISA)

DriftJS VM instructions operate on 256 internal registers (`r0`..`r255`) and an indexed constant pool (`constants[i]`):

|    Opcode    |   Hex   | Mnemonic             | Operands                                                               | Category        | Summary                                                                          |
| :----------: | :------: | :------------------- | :--------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------- |
| **0** | `0x00` | `RETURN`           | `reg`                                                                | Control Flow    | Halts execution and returns DOM node/fragment from`reg`                        |
| **1** | `0x01` | `CREATE_ELEMENT`   | `dstReg, tagIdx, [propsSpecIdx]`                                     | DOM Creation    | Creates DOM Element / mounts component sub-module into`dstReg`                 |
| **2** | `0x02` | `CREATE_TEXT`      | `dstReg, textIdx`                                                    | DOM Creation    | Creates static or evaluated DOM TextNode into`dstReg`                          |
| **3** | `0x03` | `CREATE_COMMENT`   | `dstReg, commentIdx`                                                 | DOM Creation    | Creates DOM Comment node into`dstReg`                                          |
| **4** | `0x04` | `APPEND_CHILD`     | `parentReg, childReg`                                                | DOM Mutation    | Appends node`childReg` to `parentReg`                                        |
| **5** | `0x05` | `SET_ATTR`         | `elemReg, nameIdx, valIdx, isDynamic`                                | Attributes      | Sets attribute or binds event handler on`elemReg`                              |
| **6** | `0x06` | `CREATE_FRAGMENT`  | `dstReg`                                                             | DOM Creation    | Creates a`DocumentFragment` into `dstReg`                                    |
| **7** | `0x07` | `INTERPOLATE_TEXT` | `dstReg, exprIdx`                                                    | Dynamic Binding | Evaluates expression and creates dynamic TextNode into`dstReg`                 |
| **12** | `0x0C` | `EXEC_SCRIPT`      | `scriptIdx`                                                          | Scope Setup     | Executes`<script>` AST statements to initialize component scope                |
| **13** | `0x0D` | `REACTIVE_IF`      | `parentReg, condIdx, consIdx, altIdx, depsIdx`                       | Reactive Region | Anchors`@if` block between comment delimiters (`<!--if-->` / `<!--/if-->`) |
| **14** | `0x0E` | `REACTIVE_FOR`     | `parentReg, iterIdx, itemIdx, idxIdx, keyIdx, bodyIdx, depsIdx, ...` | Reactive Region | Keyed`@for` loop with LIS reconciliation (`<!--for-->` / `<!--/for-->`)    |
| **15** | `0x0F` | `MOUNT_COMPONENT`  | `dstReg, tagIdx, propsSpecIdx`                                       | Components      | Instantiates and mounts a child SFC sub-module into`dstReg`                    |
| **16** | `0x10` | `REACTIVE_ASYNC`   | `parentReg, promIdx, bodyIdx, fbIdx, catchIdx`                       | Async           | Suspends and streams subtree on Promise resolution (`<!--async-->`)            |
| **17** | `0x11` | `REACTIVE_SWITCH`  | `parentReg, discIdx, casesIdx, defaultIdx, depsIdx`                  | Reactive Region | Pattern matches discriminant expression to case branches                         |

---

## 📖 DriftJS Template Syntax Guide (`.drift`)

A `.drift` component blends standard HTML markup with JavaScript state logic inside top-level `<script>` blocks and control directives.

### 1. Script Logic & State Scope (`<script>`)

Declare component reactive state and functions inside a top-level `<script>` block. Any top-level variable declarations automatically become part of the component's reactive scope:

```html
<script>
  let user = "Alex";
  let items = [
    { id: 1, text: "Build DriftJS Compiler", done: true },
    { id: 2, text: "Write Keyed LIS Reconciler", done: true },
    { id: 3, text: "Deploy Web App", done: false }
  ];
  let filter = "all";

  function toggleItem(id) {
    items = items.map(item => item.id === id ? { ...item, done: !item.done } : item);
  }

  function removeItem(id) {
    items = items.filter(item => item.id !== id);
  }

  function setFilter(newFilter) {
    filter = newFilter;
  }
</script>
```

---

### 2. Expression Interpolation (`{ ... }`)

Embed dynamic values directly within DOM text content using curly braces `{}`. Any valid JavaScript expression is supported and evaluated inside the component scope:

```html
<!-- Property access -->
<h1>Welcome back, {user}!</h1>

<!-- Calculations & expressions -->
<p>Total Tasks: {items.length}</p>
<p>Completed Tasks: {items.filter(i => i.done).length}</p>

<!-- Ternary conditionals -->
<p>Status: {items.every(i => i.done) ? "All Completed! 🎉" : "In Progress ⏳"}</p>
```

---

### 3. Attributes & Event Delegation

Attributes can be static strings, dynamic JavaScript expressions, or event handlers:

```html
<!-- Static attributes -->
<div class="task-card" data-category="work">

<!-- Dynamic attribute evaluation -->
<div class={filter === "all" ? "tab active" : "tab"}>

<!-- Boolean attributes (present when true, removed when false) -->
<button disabled={items.length === 0}>Clear All</button>

<!-- Event delegation (automatically batched) -->
<button onclick={ () => setFilter("all") }>Show All</button>
<button onclick={ () => toggleItem(item.id) }>Toggle Status</button>
```

---

### 4. Conditional Directives (`@if`, `@else if`, `@else`)

Render DOM subtrees conditionally based on reactive expressions. Conditional blocks are anchored by comment nodes (`<!--if-->` / `<!--/if-->`) for targeted sub-tree mounting:

```html
@if filter === "all" {
  <p class="badge badge-info">Showing all {items.length} items</p>
}
@else if filter === "pending" {
  <p class="badge badge-warning">Showing pending items only</p>
}
@else {
  <p class="badge badge-success">Completed items view</p>
}
```

---

### 5. Loop Directives (`@for`)

Iterate over arrays with `@for`. DriftJS reconciliation uses the Keyed LIS (Longest Increasing Subsequence) algorithm to reorder and patch DOM elements efficiently with minimal DOM operations:

```html
<!-- Item iteration -->
@for item in items {
  <div class="task-row">
    <span class={item.done ? "line-through" : ""}>{item.text}</span>
    <button onclick={ () => toggleItem(item.id) }>Toggle</button>
  </div>
}

<!-- Item + index iteration -->
@for (item, index) in items {
  <li class="list-item">
    <span class="index">#{index + 1}</span>
    <span class="title">{item.text}</span>
    <button onclick={ () => removeItem(item.id) }>Remove</button>
  </li>
}
```

---

### 6. Pattern Matching Directives (`@switch`, `@case`, `@default`)

Pattern match discriminant expressions into distinct `@case` branches:

```html
@switch filter {
  @case "all" {
    <div class="view-all">All Tasks Summary</div>
  }
  @case "pending" {
    <div class="view-pending">Pending Tasks Overview</div>
  }
  @default {
    <div class="view-default">Custom Filter Mode</div>
  }
}
```

---

### 7. Async Suspense Directives (`@async`, `@fallback`, `@catch`)

Stream asynchronous data with declarative suspense boundaries and fallback states:

```html
<script>
  let userPromise = fetchUserProfile(userId);
</script>

@async userPromise as user {
  <div class="user-card">
    <img src={user.avatar} alt={user.name} />
    <h3>{user.name}</h3>
    <p>{user.email}</p>
  </div>
}
@fallback {
  <div class="skeleton-card">Loading user profile...</div>
}
@catch error {
  <div class="error-banner">Failed to load profile: {error.message}</div>
}
```

---

### 8. Component Composition & Props

Import and compose child components seamlessly with props passing:

```html
<script>
  import HeaderBar from './HeaderBar.drift';
  import TaskCard from './TaskCard.drift';

  let appTitle = "Team Dashboard";
  let activeTasks = [/* ... */];
</script>

<HeaderBar title={appTitle} />

<div class="tasks-container">
  @for task in activeTasks {
    <TaskCard task={task} oncomplete={handleComplete} />
  }
</div>
```

---

### 9. Complete Task Board Example

Here is a complete `.drift` component combining script scope, state reactivity, interpolations, conditional blocks, pattern matching, and loop reconciliation:

```html
<script>
  let newTaskTitle = "";
  let priority = "medium";
  let tasks = [
    { id: 101, title: "Configure Vite Plugin", priority: "high", done: true },
    { id: 102, title: "Optimize VM Registers", priority: "high", done: false },
    { id: 103, title: "Write Benchmarks", priority: "medium", done: false }
  ];

  function toggleTask(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
  }
</script>

<div class="app-container">
  <header class="app-header">
    <h1>Task Board</h1>
    <span class="counter">Pending: {tasks.filter(t => !t.done).length} / {tasks.length}</span>
  </header>

  @if tasks.length === 0 {
    <div class="empty-state">
      <p>🎉 All tasks are completed! Enjoy your day.</p>
    </div>
  }
  @else {
    <ul class="task-list">
      @for (task, idx) in tasks {
        <li class={task.done ? "task-item completed" : "task-item"}>
          <span class="task-num">#{idx + 1}</span>
          <span class="task-title">{task.title}</span>

          @switch task.priority {
            @case "high" { <span class="tag tag-red">High Priority</span> }
            @case "medium" { <span class="tag tag-amber">Medium Priority</span> }
            @default { <span class="tag tag-gray">Low Priority</span> }
          }

          <button onclick={ () => toggleTask(task.id) }>
            {task.done ? "Undo" : "Complete"}
          </button>
          <button class="danger" onclick={ () => deleteTask(task.id) }>Delete</button>
        </li>
      }
    </ul>
  }
</div>
```

---

## 🛠️ Developer Ecosystem & Tooling

DriftJS ships with a dedicated developer tooling suite:

- **🔍 [DevTools Extension](devtool)**: Chrome and Firefox browser extension built in DriftJS itself. Provides live inspection of 256 VM registers, reactive scope inspection, component hierarchy tree, and execution metrics.
- **⚡ [VS Code Extension](packages/vscode-plugin)**: Syntax highlighting (TextMate grammar), IntelliSense snippets, directive auto-completion, diagnostics, and language server support.
- **🛡️ [ESLint Plugin](packages/eslint-plugin)**: Custom ESLint parser and rules designed for `.drift` Single File Components. Includes template scope analysis to prevent false-positive `no-unused-vars` and enforces Drift best practices.
- **🎨 [Prettier Plugin](packages/prettier-plugin)**: Native Prettier plugin formatting `.drift` templates with embedded Babel (scripts), CSS (styles), and HTML directive alignment.
- **🧭 [Client-Side Router](packages/router)**: SPA routing engine supporting HTML5 History, Hash, and Memory drivers, route parameters, nested routes/outlets, navigation guards, and scroll restoration.
- **🏝️ [SSG Meta-Framework](packages/ssg)**: Static Site Generation engine with file-based routing, markdown content collections, and selective islands hydration.
- **🎮 [Interactive Playground](playground)**: Monaco-powered in-browser sandbox with live `.drift` compilation, bytecode disassembly view, register state inspector, and CSR/SSR preview.
- **📊 [Benchmark Suite](benchmarks)**: Automated browser performance runner measuring CPU durations, heap memory allocations, and bundle sizes against React, Solid, Svelte, Vue, Angular, and Ember.

---

## 💻 Getting Started & Local Development

### Prerequisites

- **Node.js** `>=20.0.0`
- **pnpm** `>=9.0.0` (or `pnpm@10`)
- **Git**

### Installation & Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/hrutavmodha/driftjs.git
   cd driftjs
   ```
2. **Install workspace dependencies**:

   ```bash
   pnpm install
   ```
3. **Build all workspace packages**:

   ```bash
   pnpm build
   ```
4. **Run the test suite**:

   ```bash
   pnpm test
   ```

   *Executes 565+ unit and integration tests across all packages via Vitest.*
5. **Typecheck all packages**:

   ```bash
   pnpm typecheck
   ```

### Running Local Tools & Examples

- **Run Interactive Playground**:

  ```bash
  pnpm --filter driftjs-playground dev
  ```

  Open `http://localhost:5173` to test `.drift` components live in the Monaco code editor.
- **Run Documentation Site**:

  ```bash
  pnpm docs:dev
  ```

  Runs the official documentation website locally via `drift-ssg dev`.
- **Run DevTools Extension Development**:

  ```bash
  pnpm --filter devtool dev
  ```
- **Run Performance Benchmarks**:

  ```bash
  pnpm bench:perf
  ```

---

## 🤝 Contributing

We welcome contributions of all kinds! Whether you want to optimize VM opcode execution, enhance compiler error diagnostics, improve tooling, or expand benchmark coverage:

1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Run tests to ensure everything passes:
   ```bash
   pnpm test
   ```
3. Verify TypeScript type checking:
   ```bash
   pnpm typecheck
   ```
4. Read our full contribution guidelines in [`CONTRIBUTING.md`](CONTRIBUTING.md).
5. Open a Pull Request detailing your changes.

Check out [`TODO.md`](TODO.md) to explore the active implementation roadmap and upcoming milestones.

---

## 📄 License

MIT © [Hrutav Modha](https://github.com/hrutavmodha)
