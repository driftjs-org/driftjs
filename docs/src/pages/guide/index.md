---
title: "DriftJS Documentation Guide"
description: "Comprehensive guide to mastering DriftJS, its register virtual machine, and compiler architecture."
---

# DriftJS Guide

Welcome to the official DriftJS documentation. This guide walks you through the core principles, syntax, reactivity model, and architecture that make DriftJS unique in the modern web ecosystem.

## What Makes DriftJS Different?

Most modern UI frameworks rely on one of two strategies:
1. **Virtual DOM Tree Diffing (React, Vue):** Every state change creates a new tree of JavaScript objects representing the UI, which must be recursively compared with the previous tree to compute DOM mutations. This introduces memory allocation churn, garbage collection pauses, and non-trivial CPU work.
2. **Signal / Proxy Graphs (Solid, Svelte 5):** Wrap application state inside Proxies or signal containers with dependency subscription nodes, which require bookkeeping structures at runtime.

**DriftJS introduces a third approach: The Register VM Model.**

DriftJS compiles Single File Components (`.drift`) at build time into an optimized, binary-like stream of virtual machine bytecode instructions operating on **256 virtual registers (`r0..r255`)**.

* **Zero Virtual DOM:** No virtual tree objects allocated on renders.
* **No Proxy Wrappers:** Primitive variables and objects remain standard JavaScript values.
* **Precise Bytecode Execution:** State mutations schedule microtasks that re-execute only the exact bytecode instructions bound to dirty variables.
* **In-Place DOM Mutation:** Text nodes and attributes are patched in-place at the exact bytecode program counter (PC) offset.

---

## Guide Structure

Explore the documentation through the following topics:

| Section | Description |
| :--- | :--- |
| [Introduction](/guide/introduction/) | Detailed background, design philosophy, and comparisons. |
| [Quick Start](/guide/quick-start/) | Install `create-drift`, scaffold your first app, and run dev server. |
| [SFC Syntax](/guide/sfc-syntax/) | Anatomy of `.drift` files: `<script>`, markup, directives, and styles. |
| [Reactivity Engine](/guide/reactivity/) | How variable mutation tracking and microtask scheduling work. |
| [Derived & Effects](/guide/derived-and-effects/) | Computed state with `derive(...)` and reactive side effects with `effect(...)`. |
| [Control Flow Directives](/guide/control-flow/) | Deep dive into `@if`, `@for`, `@switch`, and `@async` directives. |
| [Components & Props](/guide/components-and-props/) | Component composition, passing static & dynamic props, and slots. |
| [Context API](/guide/context-api/) | Hierarchical dependency injection using `createContext`, `provide`, and `inject`. |
