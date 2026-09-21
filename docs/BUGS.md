# 🐛 DriftJS Defect & Architectural Technical Debt Log

This document tracks identified architectural shortcuts, LLM-generated code hacks, and known defects across the DriftJS monorepo, categorized by severity, component, and resolution status.

---

## Summary Matrix

| Bug ID                                                                                    | Component            | Severity |  Status  | Summary                                                                                                               |
| :---------------------------------------------------------------------------------------- | :------------------- | :------: | :------: | :-------------------------------------------------------------------------------------------------------------------- |
| [BUG-117](#bug-117-generator-omits-loop-alias-variables-from-sub-module-reactive-bindings) | `driftjs-compiler`   |  Medium  | **Fixed** | Compiler omits `@for` loop alias variables from `reactiveBindings`, causing duplicate runtime scanner              |
| [BUG-118](#bug-118-redundant-4-tier-nested-ternary-fallback-in-asttojs-identifier-codegen) | `driftjs-compiler`   |  Medium  | **Fixed** | Every variable identifier emits a 4-tier ternary fallback chain, introducing runtime overhead and constant pool bloat |

---

## Detailed Bug Reports

### BUG-109: Dead Code Island Anchors and Unimplemented Event Replay Stub

* **Package:** `packages/dom/src/hydration.ts` (lines 74–96) & `packages/dom/src/selective.ts` (lines 245–252)
* **Severity:** Low
* **Status:** **Open**
* **Description:**
  1. `HydrationCursor` includes `claimComponentAnchor()` and `claimComponentEndAnchor()` that look for `<!--comp:name-->`, `<!--drift-island:name-->`, and `<!--island:name-->`. Neither the compiler nor SSR emits these comments anywhere.
  2. In `hydrateOnInteraction()`, `options.replayEvent` is accepted, but the handler contains only:

     ```ts
     function handleInteraction(e: Event): void {
       if ((e as any).__drift_replayed__) return;
       cleanupPending();
       doHydrate();
     }
     ```

     The event is never replayed after hydration completes.
* **Impact:**
  Dead code paths and non-functional configuration options create false expectations about island hydration and event buffering capabilities.
* **Recommended Fix:**
  Either implement event queueing/replaying (similar to Google Closure / Qwik / Astro) and emit matching SSR island anchors, or remove the unused dead-code methods.

---

### BUG-110: Hallucinated Named Exports in Vite Plugin Documentation

* **Package:** `packages/vite-plugin/src/index.ts` (lines 122–135)
* **Severity:** Low
* **Status:** **Open**
* **Description:**
  The JSDoc header in `packages/vite-plugin/src/index.ts` documents:

  ```ts
  * Each `.drift` file is compiled at build / serve time through the DriftJS
  * pipeline and emitted as an ESM module exposing `render()`, `mount()`, and
  * the raw `compiledModule`.
  *
  * @example
  * import { mount } from './hero.drift';
  * mount(document.getElementById('app')!, { title: 'Hello' });
  ```

  However, `generateESM()` only emits `export default compiledModule;`.
* **Impact:**
  Attempting to `import { mount } from './comp.drift'` throws a runtime `SyntaxError: The requested module does not provide an export named 'mount'`.
* **Recommended Fix:**
  Update `generateESM()` to emit helper wrappers:

  ```js
  export function mount(container, options) { return clientMount(compiledModule, container, options); }
  ```

  Or correct the documentation to reflect `import App from './hero.drift'; mount(App, container);`.

---

### BUG-111: Hardcoded Version String in CLI Dependency Sanitizer

* **Package:** `packages/cli/src/index.ts` (line 80)
* **Severity:** Low
* **Status:** **Open**
* **Description:**
  `sanitizeDependencies()` sets a hardcoded default version:
  ```ts
  export function sanitizeDependencies(deps?: Record<string, string>, targetVersion: string = '^0.0.14'): void
  ```
* **Impact:**
  When scaffolding new projects, if `targetVersion` is not passed, newly scaffolded projects are pinned to a stale version (`^0.0.14`) instead of reading the actual published package version dynamically.
* **Recommended Fix:**
  Read the version dynamically from the monorepo root or package manifest at runtime.

---

### BUG-117: Generator Omits Loop Alias Variables from Sub-Module Reactive Bindings

* **Package:** `packages/compiler/src/generator.ts` (lines 477–528, 756–767, 781–792) & `packages/dom/src/index.ts` (lines 600–659)
* **Severity:** Medium
* **Status:** **Fixed**
* **Description:**
  When compiling `@for (item, index) in list` loop bodies, `compileNodesToSubModule()` runs with `this.declaredVars` populated only with top-level script variables. Loop aliases (`node.item`, `node.index`) are never registered in the compiler's declared variable set.

  Consequently:

  1. In `recordBindingPositions(expr, pc)`:
     ```ts
     for (const name of ids) {
       if (this.declaredVars.has(name)) { // Returns false for 'item' and 'index'!
         this.bindingPositions.get(name)!.push(pc);
       }
     }
     ```

     `bodyMod.reactiveBindings` completely omits loop variables like `item` and `index`.
  2. In `addExpressionConstant(ast)`:
     ```ts
     for (const name of this.extractIdentifiers(ast)) {
       if (this.declaredVars.has(name)) deps.push(name); // Returns false for 'item' and 'index'!
     }
     ```

     Inner row expressions like `{item.name}` receive an empty `deps: []` array.
* **Impact:**

  - Because `bodyMod.reactiveBindings` lacked entries for loop items, the client VM reconciler could not determine which bytecode PCs to execute when row data updates.
  - To compensate, an ad-hoc runtime scanner `getDynamicPcs()` was introduced into `driftjs-dom`. This duplicated the variable-length instruction set decoder in the client runtime.
* **Resolution:**

  1. In `DriftGenerator.compileForNode()`, loop aliases (`node.item`, `node.pattern` identifiers via `extractBindingNames()`, and `node.index`) are registered in `this.declaredVars` during `compileNodesToSubModule(node.body)`, properly recording their dynamic bytecode positions into `bodyMod.reactiveBindings`.
  2. In `compileForNode()`, `rowDepsSet` filters out loop aliases (`!loopAliases.has(binding.variable)`) so parent component change detection only tracks outer scope dependencies.
  3. Removed `getDynamicPcs()` and `dynamicPcsCache` from `DriftClientVM`, and updated `updateRowRegisters()` to execute dynamic instructions directly using `bodyMod.reactiveBindings`.


---

### BUG-118: Redundant 4-Tier Nested Ternary Fallback in `astToJS` Identifier CodeGen

* **Package:** `packages/compiler/src/generator.ts` (lines 1081–1084)
* **Severity:** Medium
* **Status:** **Fixed**
* **Description:**
  For every single variable identifier in an expression, `astToJS` generates a 4-tier ternary fallback chain:
  ```js
  (typeof getScopeValue === 'function' 
    ? getScopeValue(scope, "x") 
    : (typeof inScopeChain === 'function' && inScopeChain(scope, "x") 
        ? scope["x"] 
        : (typeof globalThis !== 'undefined' && globalThis && ("x" in globalThis) 
            ? globalThis["x"] 
            : (scope || {})["x"])))
  ```
* **Impact:**
  - Because `getScopeValue` is already guaranteed as a core parameter in every compiled `__drift_fn__` signature `(scope, declaredVars, setScopeValue, inScopeChain, resolveIterable, getScopeValue) => ...`, checking `typeof getScopeValue === 'function'` and falling through three redundant tiers on every variable lookup introduces unnecessary branching and runtime overhead during evaluation.
  - Generates massive string bloat in the constant pool (e.g., an expression with 3–4 identifiers expands to hundreds of characters of duplicate ternary checks and repeated string literals).
* **Recommended Fix:**
  Simplify identifier code generation in `astToJS` to invoke `getScopeValue(scope, "x")` directly (or `scope["x"]` when referencing local identifiers), removing the redundant 4-tier ternary chain.

---

### BUG-119: Keyed List Reconciler Silently Destroys Duplicate-Keyed Rows

* **Package:** `packages/dom/src/reconciler.ts` (lines 99–106, 159–165, 177–180)
* **Severity:** Low
* **Status:** **Open**
* **Description:**
  When a list contains duplicate keys, `reconcileKeyedList()` detects the collision and logs a warning, but still pushes both records into `newCache` with the duplicate key:

  ```ts
  if (newKeySet.has(baseKey)) {
    console.warn(`[DriftJS] Duplicate key "${String(baseKey)}" detected...`);
  } else {
    newKeySet.add(baseKey);
  }
  newCache.push({ key: baseKey, ... });
  ```

  However, when building `keyToNewIndexMap`:
  ```ts
  for (let k = s1; k <= e1; k++) {
    const kKey = newCache[k]!.key;
    if (!keyToNewIndexMap.has(kKey)) {
      keyToNewIndexMap.set(kKey, k); // Keeps ONLY the first occurrence!
    }
  }
  ```

  When the loop subsequently reconciles old rows against `keyToNewIndexMap`, any duplicate row after the first matches `sources[newIndex - s1] !== -1` and is passed to `removeRecordNodes(oldRec)`.
* **Impact:**
  Duplicate keys result in the second item's DOM node being unmounted and permanently removed from the rendered list rather than being kept or gracefully falling back.
* **Recommended Fix:**
  When duplicate keys are detected, fall back to index-based keys or composite keys (`${baseKey}__${index}`) to ensure all items remain mounted in the DOM.

---

### BUG-120: Global Delegated Event Listeners Accumulate Indefinitely on Document

* **Package:** `packages/dom/src/index.ts` (lines 520–553)
* **Severity:** Low
* **Status:** **Open**
* **Description:**
  `DriftClientVM.ensureEventDelegated()` registers event listeners directly on the global `document` or root node:
  ```ts
  let docListeners = DriftClientVM.globalDelegatedListeners.get(root);
  if (!docListeners.has(eventName)) {
    root.addEventListener(eventName, listener, useCapture);
    docListeners.set(eventName, { listener, useCapture });
  }
  ```
* **Impact:**
  While per-element event handlers stored in `WeakMap` get garbage collected, the delegated event listeners attached to the global `document` are never removed on VM unmount or teardown. In single-page applications or environments with frequent component mounting and unmounting, these listeners persist indefinitely.
* **Recommended Fix:**
  Add an event listener cleanup / teardown routine to `DriftClientVM.unmount()` that removes global event listeners from the document when the root VM or container is destroyed.
