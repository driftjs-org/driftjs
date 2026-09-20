# 🐛 DriftJS Defect & Architectural Technical Debt Log

This document tracks identified architectural shortcuts, LLM-generated code hacks, and known defects across the DriftJS monorepo, categorized by severity, component, and resolution status.

---

## Summary Matrix

| Bug ID                                                                             | Component               | Severity |       Status       | Summary                                                                                |
| :--------------------------------------------------------------------------------- | :---------------------- | :------: | :----------------: | :------------------------------------------------------------------------------------- |
| [BUG-106](#bug-106-ad-hoc-runtime-string-parsing-for-destructuring-defaults)        | `driftjs-shared`      |  Medium  |   **Open**   | Runtime string slicing and trial`JSON.parse` in `parseDefaultValue`                |
| [BUG-107](#bug-107-inlined-switch-discriminant-assignment-pollutes-component-scope) | `driftjs-compiler`    |  Medium  |   **Open**   | `@switch` lowering injects `__drift_sw_N` directly into reactive component scope   |
| [BUG-108](#bug-108-synchronous-ssr-silently-drops-promises-in-async-boundaries)     | `driftjs-ssr`         |  Medium  |   **Open**   | `renderToString` drops promises and synchronously outputs fallback markup            |
| [BUG-109](#bug-109-dead-code-island-anchors-and-unimplemented-event-replay-stub)    | `driftjs-dom`         |   Low   |   **Open**   | Dead`claimComponentAnchor` comments and no-op `__drift_replayed__` stub            |
| [BUG-110](#bug-110-hallucinated-named-exports-in-vite-plugin-documentation)         | `driftjs-vite-plugin` |   Low   |   **Open**   | JSDoc documents`import { mount } from './comp.drift'` but only default export exists |
| [BUG-111](#bug-111-hardcoded-version-string-in-cli-dependency-sanitizer)            | `create-drift`        |   Low   |   **Open**   | `sanitizeDependencies` has hardcoded default version `'^0.0.14'`                   |

---

## Detailed Bug Reports

### BUG-106: Ad-Hoc Runtime String Parsing for Destructuring Defaults

* **Package:** `packages/utils/src/scope.ts` (lines 172–196)
* **Severity:** Medium
* **Status:** **Open**
* **Description:**
  `populateItemScope()` delegates destructuring default values to `parseDefaultValue()` at runtime:
  ```ts
  function parseDefaultValue(defStr: string, scope?: Record<string, any>): any {
    const trimmed = defStr.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || ...) return trimmed.slice(1, -1);
    if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
    try {
      return JSON.parse(trimmed);
    } catch {
      if (scope && inScopeChain(scope, trimmed)) return getScopeValue(scope, trimmed);
      return trimmed;
    }
  }
  ```
* **Impact:**
  Evaluating default values using `JSON.parse` trial-and-error, manual string slicing, and heuristic scope lookups is fragile, fails for valid expressions (e.g. arithmetic, ternary, function calls, or template literals), and incurs runtime string parsing overhead on every loop iteration.
* **Recommended Fix:**
  Compile default value expressions into the constant pool as pre-compiled executable functions during build time, rather than parsing raw strings in the runtime scope helper.

---

### BUG-107: Inlined `@switch` Discriminant Assignment Pollutes Component Scope

* **Package:** `packages/compiler/src/transformer.ts` (lines 268–336)
* **Severity:** Medium
* **Status:** **Open**
* **Description:**
  When `@switch (expr)` contains a complex discriminant expression, `transformSwitchToIfChain` emits an assignment in the first case test:
  ```ts
  const discVarName = `__drift_sw_${this.switchCounter++}`;
  // Emits: (__drift_sw_0 = expr) === caseVal
  ```
* **Impact:**
  `__drift_sw_0` is never added to `declaredVars` or allocated to a VM register. At runtime, evaluating this expression invokes `setScopeValue(scope, "__drift_sw_0", expr)`, polluting the user's reactive component scope with internal compiler variables.
* **Recommended Fix:**
  Allocate a dedicated VM register for the discriminant value or evaluate the discriminant once into an internal evaluation frame outside the reactive scope.

---

### BUG-108: Synchronous SSR Silently Drops Promises in `@async` Boundaries

* **Package:** `packages/ssr/src/index.ts` (lines 388–398)
* **Severity:** Medium
* **Status:** **Open**
* **Description:**
  In `renderToString()`, when an `@async` boundary encounters a Promise:
  ```ts
  if (rawPromise && typeof rawPromise.then === 'function') {
    parentNode.children.push({ type: 'comment', content: `drift-async:${boundaryId}`, children: [] });
    if (fallbackMod) {
      const subResult = subVm.execute(fallbackMod, { scope: childScope });
      if (subResult) parentNode.children.push(subResult);
    }
    parentNode.children.push({ type: 'comment', content: `/drift-async:${boundaryId}`, children: [] });
  }
  ```
* **Impact:**
  `renderToString()` is strictly synchronous, so it drops the pending Promise without awaiting it, immediately rendering only the fallback shell. The resolved data is never included in the initial SSR string.
* **Recommended Fix:**
  Provide an `async renderToStringAsync()` function that awaits all async boundaries, or clearly document that `@async` with promises requires `renderToStream()`.

---

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

