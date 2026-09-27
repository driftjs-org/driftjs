---
title: "The Register Virtual Machine"
description: "Detailed specification of the 256-register virtual machine engine powering DriftJS."
---

# The Register Virtual Machine

The DriftJS Virtual Machine is an execution engine that models UI rendering through direct register operations. It exists in two implementations sharing identical bytecode semantics:
* **`DriftClientVM` (`driftjs-dom`):** Runs in browser environments, manipulating physical DOM elements, text nodes, and document fragments.
* **`DriftServerVM` (`driftjs-ssr`):** Runs in Node.js / edge runtime environments, manipulating lightweight `ServerNode` trees for static serialization.

---

## The 256-Register Bank

Both VMs allocate a pre-sized array of **256 internal registers**:

```ts
// packages/dom/src/index.ts
export class DriftClientVM {
  private static readonly MAX_REGISTERS = 256;
  private readonly registers: (Node | any)[] = new Array(DriftClientVM.MAX_REGISTERS);
  ...
}
```

### Why 256 Registers?
* **Bytecode Density:** A single byte (`0x00` through `0xFF`) addresses any register in the VM.
* **Cache Locality:** An array of 256 references is compact, predictable, and stays in CPU cache.
* **Zero GC Overhead:** Registers are initialized once when the VM instance is created. No register objects are pushed or popped onto a heap stack during execution.

### Register Allocation Strategy
During compilation, `DriftGenerator` assigns registers using a high-water mark allocator:
1. `r0` is typically reserved as the root node or document fragment returned at the end of execution.
2. Parent elements hold their assigned register (e.g. `r1` for `<div class="card">`).
3. Child nodes allocate incremental registers (`r2` for `<h2>`, `r3` for dynamic text).
4. Once child nodes are appended into their parent (`APPEND_CHILD r1, r2`), those child registers can be reclaimed and reused for subsequent sibling nodes.

---

## Virtual Machine Execution Modes

The client VM operates in three distinct execution modes:

### Mount Execution Mode
* Triggered when a component is initially mounted via `mount()` or `MOUNT_COMPONENT`.
* The instruction pointer (`pc`) starts at index `0` and steps linearly through bytecode.
* DOM elements and text nodes are created, configured with static attributes, and stored in registers.
* Event handlers are registered and bound to elements.
* The instruction `RETURN reg` halts execution and returns the finished DOM subtree.

### Update Execution Mode
* Triggered by microtask flushing when variables are marked dirty.
* The VM does **not** re-execute from `pc = 0`.
* It jumps directly to the bytecode indices recorded in `reactiveBindings` for the dirty variables.
* Registers continue holding the live physical DOM nodes created during the mount phase.
* The VM computes the new value and applies it directly to the target node (e.g., `textNode.nodeValue = ...`).

### Hydrate Execution Mode
* Triggered during client hydration via `hydrate()` or `hydrateIslands()`.
* The VM pairs bytecode execution with a `HydrationCursor` wrapping a browser `TreeWalker`.
* When `CREATE_ELEMENT` runs, instead of allocating `document.createElement()`, the cursor claims the next matching element from server-rendered HTML.
* Event listeners are attached without destroying or recreating DOM nodes.

---

## Component Scope Hierarchy

State in DriftJS is stored on a scoped JavaScript object:
* Sub-modules (such as consequent branches of `@if` or row templates of `@for`) inherit variables from the parent component using standard JavaScript prototype delegation:
  ```ts
  const childScope = Object.create(parentScope);
  ```
* Reading outer-scope variables (`user`, `theme`) walks up the prototype chain naturally without copy overhead.
* Updates to loop iteration aliases (`item`, `index`) remain isolated on the child scope without polluting parent state.
