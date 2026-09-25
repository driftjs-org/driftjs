---
title: System Architecture
description: Comprehensive overview of the DriftJS compilation pipeline and register virtual machine
---

# System Architecture

DriftJS eliminates traditional frontend performance bottlenecks by shifting work to compile-time and executing a compact, register-based bytecode stream.

---

## The Compilation Pipeline

```
.drift Source Code
       │
       ▼
 ┌───────────┐
 │   Lexer   │  Tokenizes HTML tags, directives (@if, @for), text, interpolations
 └─────┬─────┘
       ▼
 ┌───────────┐
 │  Parser   │  Constructs a structured ProgramNode AST
 └─────┬─────┘
       ▼
 ┌───────────┐
 │Transformer│  Enriches AST, parses JS expressions with Acorn
 └─────┬─────┘
       ▼
 ┌───────────┐
 │ Generator │  Emits bytecode array, constants pool, and reactive bindings
 └─────┬─────┘
       ▼
 CompiledModule { bytecode, constants, reactiveBindings, declaredVars }
```

---

## 1. Register Virtual Machine Execution

Drift utilizes 256 virtual registers (`r0` to `r255`):
- `CREATE_ELEMENT (0x01)` instantiates a DOM node and stores the reference into a register.
- `APPEND_CHILD (0x04)` appends the node in one register to a parent node in another register.
- `SET_ATTR (0x05)` attaches static attributes and reactive properties.
- `INTERPOLATE_TEXT (0x07)` binds dynamic text nodes with variable dependency tracking.

---

## 2. Islands Architecture (`client:*`)

Drift Static (`driftjs-ssg`) provides an Astro-like Islands Architecture:
- By default, all pages produce **Zero-JS static HTML**.
- Components marked with `client:*` directives are automatically identified during compilation.
- At runtime, `hydrateIslands()` mounts only the interactive islands using lazy triggers:
  - `client:load`: Eager hydration as soon as page scripts load.
  - `client:idle`: Hydrates when the browser main thread is idle (`requestIdleCallback`).
  - `client:visible`: Hydrates when the island enters viewport (`IntersectionObserver`).
  - `client:media`: Hydrates only if a CSS media query matches.
