---
title: "The DriftJS Reactivity Engine"
description: "How fine-grained reactivity operates without Proxies or Virtual DOM diffing."
---

# The DriftJS Reactivity Engine

Most reactive frameworks introduce significant runtime machinery to detect and propagate state changes. React uses fiber tree reconciliation; Solid and Vue use Proxy traps and signal graph nodes.

DriftJS takes a radically different approach: **Compile-Time Variable Tracking + Bytecode Program Counter (PC) Invalidation**.

---

## How DriftJS Tracks State

When the compiler processes your `.drift` SFC, it executes three static passes:

1. **Declared Variable Detection (`declaredVars`):**
   The compiler inspects AST statements in the `<script>` block and identifies all mutable identifiers (e.g. `let count = 0; let items = [];`).
2. **Expression Dependency Extraction:**
   Every interpolation `{ count + 1 }`, directive condition `@if count > 0`, and attribute binding `class={theme}` is parsed with Acorn. The compiler inspects the AST identifiers and records which declared variables each expression depends on.
3. **Reactive Binding Table (`ReactiveBinding[]`):**
   The compiler constructs a binding table mapping variable names to their exact bytecode Program Counter (PC) positions:
   ```ts
   // Example ReactiveBinding entry
   {
     variable: "count",
     positions: [8, 24] // Bytecode PCs that reference `count`
   }
   ```

---

## State Mutation & Dirty Notification

In your component, state is updated via plain JavaScript assignment:

```html
<script>
  let count = 0;

  function inc() {
    count++; // or count = count + 1;
  }
</script>
```

At runtime, the component scope is configured with a change listener:

```
User Action (click) ──► Mutate Variable ──► markDirty("count") ──► queueMicrotask(flush)
```

1. **Mutation:** Modifying `count` calls the internal `markDirty("count")` hook.
2. **Microtask Batching:** The VM pushes `"count"` to a `dirtyVars` Set and checks if a flush is already scheduled. If not, it calls:
   ```ts
   queueMicrotask(() => this.flushDirtyUpdates());
   ```
   Multiple rapid mutations within the same event tick (e.g., updating 10 variables in a loop) collapse into a single microtask flush.

---

## The Update Phase: Direct In-Place Patching

When `flushDirtyUpdates()` runs, the VM does **not** re-render the component or compare a new DOM tree.

Instead:
1. The VM loops over the variables in `dirtyVars`.
2. For each variable, it looks up its `positions` in `reactiveBindings`.
3. It jumps directly to those bytecode PC positions and re-executes only the target instruction:
   * **`INTERPOLATE_TEXT` at PC 8:** The VM evaluates the compiled expression from the constant pool against the current scope, compares the result to the previous value, and if changed, sets:
     ```ts
     textNode.nodeValue = String(newValue);
     ```
   * **`SET_ATTR` at PC 14:** The VM patches the attribute or DOM property on the element held in register `r0` directly.
   * **`REACTIVE_IF` at PC 22:** The VM re-evaluates the condition and toggles or updates the subtree between comment anchors.

---

## Why This Delivers Maximum Performance

### 1. Zero Garbage Collection Churn
Because no virtual DOM nodes or temporary objects are created during updates, heap memory remains virtually flat.

### 2. Predictable O(1) Updates
Updating an interpolated number in a table of 10,000 rows executes in fractions of a microsecond. The VM performs a direct array lookup in `registers` and updates the text node without traversing parents or siblings.

### 3. Transparent Mental Model
You write standard JavaScript. No special `.value` accessors, no `useCallback`, no dependency arrays, and no risk of stale closures.
