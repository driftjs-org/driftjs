---
title: Introduction to DriftJS
description: A high-performance register virtual machine reactivity engine and AOT compiler
---

# Introduction to DriftJS

**DriftJS** is a next-generation UI framework and AOT compiler that fundamentally rethinks how modern browser and server interfaces are rendered.

Instead of traditional Virtual DOM (VDOM) diffing trees or fine-grained runtime proxy graphs, Drift compiles templates directly into a **register-based virtual machine bytecode stream**.

---

## Why a Register VM?

Most modern frameworks rely on one of two approaches:
1. **Virtual DOM Diffing (React, Vue)**: Every state update generates temporary virtual node trees that are recursively compared against previous trees, creating garbage collection pressure and CPU overhead.
2. **Proxy-based Signal Graphs (Solid, Svelte 5)**: State is wrapped in reactive proxies that wire together dependency graphs at runtime.

Drift takes a third path inspired by high-performance language runtimes (like LuaJIT and Dalvik):
- Templates compile ahead-of-time (AOT) into linear bytecode executed against **256 hardware-like virtual registers**.
- Directives (`@if`, `@for`, `@switch`) compile into isolated sub-modules anchored by comment nodes.
- Reactive bindings map state variables directly to bytecode instructions, applying surgical DOM mutations in place with zero diffing overhead.

---

## Core Ecosystem Packages

The DriftJS monorepo is built as a set of modular, specialized packages:

- **`driftjs-compiler`**: Ahead-of-Time compiler featuring a custom scanner, parser, AST transformer, and bytecode generator.
- **`driftjs-dom`**: Browser client virtual machine and Longest Increasing Subsequence (LIS) keyed reconciler.
- **`driftjs-ssr`**: Headless server-side register VM and HTML serializer for Node.js and edge runtimes.
- **`driftjs-ssg`**: Static Site Generation meta-framework and Islands architecture bundler.
- **`driftjs-router`**: High-performance client-side router with browser, hash, and memory history drivers.
- **`driftjs-vite-plugin`**: Build-time Single File Component (`.drift`) transformer for Vite.
- **`create-drift`**: Scaffolding CLI for rapid project generation.
