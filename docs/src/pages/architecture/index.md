---
title: "Architecture & Internals"
description: "Deep dive into the internal design of the DriftJS register virtual machine, compiler pipeline, and LIS reconciler."
---

# Architecture & Internals

DriftJS is built from first principles to challenge traditional assumptions about web framework runtime architecture.

Rather than treating the browser DOM as an external side-effect of a tree diffing algorithm, DriftJS models UI rendering as a **bytecode interpretation process** operating on a fixed bank of virtual registers.

---

## Architectural Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPILATION PIPELINE                            │
│                                                                        │
│   .drift Source ──► DriftLexer ──► DriftParser ──► DriftTransformer    │
│                                                          │             │
│                                                          ▼             │
│                       CompiledModule ◄───────── DriftGenerator         │
│                       - Bytecode (Uint32Array)                         │
│                       - Constants Pool (Array)                         │
│                       - ReactiveBindings[]                             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       ┌────────────────────────┐    ┌────────────────────────┐
       │     DriftClientVM      │    │     DriftServerVM      │
       │   (Browser / Client)   │    │    (Server / Node)     │
       │                        │    │                        │
       │ - 256 Registers Bank   │    │ - 256 Registers Bank   │
       │ - Real DOM Nodes       │    │ - Virtual ServerNodes  │
       │ - LIS Keyed Reconciler │    │ - HTML String / Stream │
       │ - Microtask Batching   │    │ - Comment Hydration    │
       └────────────────────────┘    └────────────────────────┘
```

---

## Topics in this Section

* [**Virtual Machine & 256 Registers**](/architecture/virtual-machine/): Register architecture, register allocation, VM execution loop, and runtime modes (`MOUNT`, `UPDATE`, `HYDRATE`).
* [**Instruction Set Architecture (ISA)**](/architecture/isa-reference/): Complete specification of all 14 opcodes, operands, and execution semantics.
* [**AOT Compiler Pipeline**](/architecture/compiler-pipeline/): Lexer scanner, parser recursive descent, Acorn AST transformation, and code generation.
* [**Keyed LIS Reconciliation**](/architecture/reconciliation/): The Longest Increasing Subsequence algorithm and fast-path attribute patching.
