---
title: "Introduction to DriftJS"
description: "Why DriftJS uses a register-based virtual machine and ahead-of-time compiler for reactivity."
---

# Introduction to DriftJS

DriftJS is a **register VM-based reactivity engine and Ahead-of-Time (AOT) compiler** engineered for high-performance browser applications and static/server rendering.

Instead of comparing trees of virtual DOM nodes or maintaining complex reactive dependency graphs at runtime, DriftJS compiles component templates into a compact stream of bytecode executed by a lightweight virtual machine.

---

## The Motivation: Moving Beyond VDOM & Proxies

Over the last decade, front-end architecture has navigated two major paradigms:

### 1. The Virtual DOM Era (React, Preact, Vue 2/3)
Virtual DOM was a breakthrough because it allowed developers to write declarative UI as a function of state: `UI = f(state)`. However, the cost is hidden under the hood:
* **Heap allocations on every update:** Every re-render creates hundreds or thousands of temporary VNode objects that are immediately discarded, triggering garbage collector (GC) spikes.
* **Diffing overhead:** Even with memoization (`useMemo`, `React.memo`), the framework must traverse trees to detect what changed.
* **Component boundary friction:** Re-renders propagate down the component hierarchy unless explicitly opted out.

### 2. The Proxy / Signal Era (Solid, Vue 3 reactivity, Svelte 5)
Signals and Proxies solved tree diffing by introducing fine-grained subscription graphs. When state changes, only the subscriber re-runs. But this comes with trade-offs:
* **Runtime Bookkeeping:** Every reactive primitive requires creating subscription arrays, tracking active observers, managing cleanup functions, and intercepting property reads via `Proxy` traps.
* **Complex Mental Model:** Developers must worry about tracking scopes, loss of reactivity through destructuring, and unwrapping wrappers.

---

## The DriftJS Solution: The Register VM Architecture

DriftJS re-thinks the relationship between the compiler and runtime.

Instead of emitting imperative JavaScript DOM mutations or building runtime reactive graph nodes, the DriftJS AOT compiler emits **Register-based Bytecode Instructions** operating on a fixed register bank of **256 registers (`r0..r255`)**.

```
                   .drift Source SFC
                          │
                          ▼
            Drift AOT Compiler (compile)
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
    Bytecode (Uint32Array)     Constant Pool
    [0x01, r0, const[0], ...]  [ "div", fn(), subMod ]
              │                       │
              └───────────┬───────────┘
                          ▼
               Virtual Machine Runtime
             (DriftClientVM / DriftServerVM)
                          │
                          ▼
                  In-Place DOM Mutation
```

### Why a Register Machine?
Virtual machines typically follow one of two designs:
1. **Stack Machines (e.g. JVM, WebAssembly, Python VM):** Operands are pushed onto and popped from an evaluation stack (`push a`, `push b`, `add`). While easy to generate, stack machines require more instructions and heavy stack pointer shuffling.
2. **Register Machines (e.g. LuaJIT, Dalvik, DriftJS VM):** Instructions explicitly name their source and destination registers (`ADD dst, src1, src2`). This mirrors real CPU hardware:
   * **Fewer instructions:** A register VM achieves the same rendering outcome in substantially fewer bytecode dispatches.
   * **Zero stack allocation:** 256 pre-allocated array slots (`registers[0..255]`) hold element references, text nodes, and values without allocating runtime objects.
   * **Direct Register Reuse:** Registers are allocated during AOT compilation and reused across sibling blocks.

---

## Architectural Pillars

* **Zero-VDOM Runtime:** DOM nodes are created directly and held in registers. No intermediate virtual nodes exist.
* **Static Dependency Map (`ReactiveBinding`):** The compiler analyzes expressions in `<script>` and maps each declared variable name directly to the exact bytecode instruction positions (PC) that depend on it.
* **Microtask Change Batching:** Variable assignments in `<script>` automatically trigger `markDirty(varName)`. All changes within the same tick are batched and flushed via `queueMicrotask()`.
* **In-Place Reactive Patching:** When a variable changes, only its registered bytecode instructions run. If `count` changes, the VM updates `textNode.nodeValue` directly without touching parent or sibling elements.
* **Longest Increasing Subsequence (LIS) List Reconciler:** Keyed loops (`@for`) compute the minimal set of DOM moves using LIS, pairing it with row attribute fast-path patching (`patchItemAttributes`).
* **Islands Architecture by Default:** Drift Static SSG renders 0 kB client JavaScript for static content, hydra-gating only components marked with client directives (`client:load`, `client:visible`, etc.).

---

## Framework Comparison

| Feature | React 19 | Svelte 5 | SolidJS | DriftJS |
| :--- | :--- | :--- | :--- | :--- |
| **Reactivity Primitive** | VDOM + Hooks | Runes / Signals | Fine-grained Signals | Register VM Bytecode |
| **Virtual DOM Diffing** | Yes (Tree) | No | No | **No (Register-based)** |
| **Runtime Architecture** | Component Fiber | Signal Graph | Dependency Graph | **256-Slot Register VM** |
| **Variable Mutation** | `setState(x)` | Direct (`x++`) | `setX(x)` | **Direct (`x++`)** |
| **Compilation Target** | JSX &rarr; JS | Runes &rarr; JS | JSX &rarr; Templates | **SFC &rarr; VM Bytecode** |
| **Selective Hydration** | React Server Components | Islands (SvelteKit) | Astro integration | **Native Islands Engine** |
| **SSR Model** | Node stream | SSR String | SSR String | **ServerVM + Stream** |
