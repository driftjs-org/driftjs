# 🐛 DriftJS Defect & Architectural Technical Debt Log

This document tracks identified architectural shortcuts, LLM-generated code hacks, and known defects across the DriftJS monorepo, categorized by severity, component, and resolution status.

---

## Summary Matrix

| Bug ID                                                                             | Component               | Severity |       Status       | Summary                                                                                |
| :--------------------------------------------------------------------------------- | :---------------------- | :------: | :----------------: | :------------------------------------------------------------------------------------- |
| [BUG-101](#bug-101-synthetic-arrow-function-hack-in-for-header-parsing)             | `driftjs-compiler`    |   High   | **Resolved** | Synthetic arrow function `${lhs} => {}` trial parsing in `@for` header              |
| [BUG-102](#bug-102-silent-key-mutation-via-__dup_n-in-lis-reconciler)               | `driftjs-dom`         |   High   | **Resolved** | Keyed list reconciler silently mutates duplicate keys with `__dup_N`                  |
| [BUG-103](#bug-103-compiler-rewrites-array-methods-into-self-assigning-iifes)       | `driftjs-compiler`    |   High   | **Resolved** | Array mutations and member updates wrapped in IIFE scope self-assignments              |
| [BUG-104](#bug-104-brute-force-dom-wipe-and-rebuild-inside-keyed-list-patch)        | `driftjs-dom`         |   High   | **Resolved** | List row patch destroys and recreates DOM children via `while (elem.firstChild)`      |
| [BUG-105](#bug-105-cascading-instruction-execution-in-executefrom-update-mode)      | `driftjs-dom`         |  Medium  | **Invalid**  | `executeFrom` executes to `RETURN` on reactive jumps, causing $O(N^2)$ cascades  |
| [BUG-106](#bug-106-ad-hoc-runtime-string-parsing-for-destructuring-defaults)        | `driftjs-shared`      |  Medium  |   **Open**   | Runtime string slicing and trial`JSON.parse` in `parseDefaultValue`                |
| [BUG-107](#bug-107-inlined-switch-discriminant-assignment-pollutes-component-scope) | `driftjs-compiler`    |  Medium  |   **Open**   | `@switch` lowering injects `__drift_sw_N` directly into reactive component scope   |
| [BUG-108](#bug-108-synchronous-ssr-silently-drops-promises-in-async-boundaries)     | `driftjs-ssr`         |  Medium  |   **Open**   | `renderToString` drops promises and synchronously outputs fallback markup            |
| [BUG-109](#bug-109-dead-code-island-anchors-and-unimplemented-event-replay-stub)    | `driftjs-dom`         |   Low   |   **Open**   | Dead`claimComponentAnchor` comments and no-op `__drift_replayed__` stub            |
| [BUG-110](#bug-110-hallucinated-named-exports-in-vite-plugin-documentation)         | `driftjs-vite-plugin` |   Low   |   **Open**   | JSDoc documents`import { mount } from './comp.drift'` but only default export exists |
| [BUG-111](#bug-111-hardcoded-version-string-in-cli-dependency-sanitizer)            | `create-drift`        |   Low   |   **Open**   | `sanitizeDependencies` has hardcoded default version `'^0.0.14'`                   |

---

## Detailed Bug Reports

### BUG-101: Synthetic Arrow Function Hack in `@for` Header Parsing

* **Package:** `packages/compiler/src/parser.ts`
* **Severity:** High
* **Status:** **Resolved** (Verified in parser & test suite)
* **Description:**
  To parse `@for (item, index) in list key expr`, the compiler previously looped character-by-character searching for `"in"` and wrapped candidate LHS slices into mock arrow function strings `${wrappedLhs} => {}`, feeding them into `acorn.parseExpressionAt` inside a `try/catch` loop to guess the delimiter.
* **Resolution:**
  Replaced with a formal 4-phase parsing architecture:
  1. Acorn's tokenizer (`acorn.tokTypes._in`) finds the delimiter at depth 0, with full depth tracking across `()`, `[]`, `{}`, and template literals (`tokTypes.dollarBraceL`).
  2. LHS bindings are inspected for top-level unparenthesized commas (`@for a, b in list` is rejected with a descriptive error).
  3. Single `item` binding is verified against Acorn AST ensuring strictly one variable declaration (`parsed.body.length === 1 && parsed.body[0].declarations.length === 1`).
  4. Non-null `index` is verified to be a single, non-empty `Identifier`.
  5. Acorn's Pratt parser parses the RHS iterable expression, followed by optional `key <expr>`.

---

### BUG-102: Silent Key Mutation via `__dup_N` in LIS Reconciler

* **Package:** `packages/dom/src/reconciler.ts` (lines 99–106)
* **Severity:** High
* **Status:** **Resolved**
* **Description:**
  In `reconcileKeyedList()`, when duplicate keys are supplied in a list, the reconciler previously silently mutated keys by appending a suffix:
  ```ts
  let keyVal = baseKey;
  let dupIdx = 0;
  while (newKeySet.has(keyVal)) {
    dupIdx++;
    keyVal = String(baseKey) + '__dup_' + dupIdx;
  }
  newKeySet.add(keyVal);
  ```
* **Resolution:**
  - Removed synthetic key suffix while loop entirely.
  - Preserved original `baseKey` without corruption.
  - Added developer console warning when duplicate keys are detected in `@for` loop.
  - Made `keyToNewIndexMap` deterministic by keeping the first occurrence.
  - Stale duplicates are cleanly unmounted and removed.

---

### BUG-103: Compiler Rewrites Array Methods into Self-Assigning IIFEs

* **Package:** `packages/compiler/src/generator.ts` (lines 997–1004)
* **Severity:** High
* **Status:** **Resolved**
* **Description:**
  Previously, the compiler intercepted method calls on arrays matching hardcoded names (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`) and wrapped them into synthetic self-assigning IIFEs:
  ```ts
  (() => {
    const _res = arr.push(item);
    if (typeof setScopeValue === 'function' && inScopeChain(scope, "arr")) {
      setScopeValue(scope, "arr", scope["arr"]);
    }
    return _res;
  })()
  ```
* **Resolution:**
  - Removed the hardcoded `arrayMutators` list and synthetic IIFE wrapping from `generator.ts`.
  - `CallExpression` now emits clean JavaScript (`(callee(args))`).
  - Contractual reactivity via declared variable reassignment is strictly enforced (`items = [...items, x]` or `items.push(x); items = items;`).

---

### BUG-104: Brute-Force DOM Wipe and Rebuild Inside Keyed List "Patch"

* **Package:** `packages/dom/src/index.ts` (lines 1155–1184)
* **Severity:** High
* **Status:** **Resolved**
* **Description:**
  Previously, when a list row in a keyed `@for` loop required an update, a destructive fallback executed:
  ```ts
  while (elem.firstChild) {
    vm.unmountSubtree(elem.firstChild);
    elem.removeChild(elem.firstChild);
  }
  while (newElem.firstChild) {
    elem.appendChild(newElem.firstChild);
  }
  ```
* **Resolution:**
  - Removed the destructive DOM wipe and rebuild fallback entirely.
  - Rows are always patched in-place via `updateRowRegisters` directly on their persistent register frames.
  - Input focus, internal element state, and DOM node identities are fully preserved.

---

### BUG-105: Cascading Instruction Execution in `executeFrom` UPDATE Mode

* **Package:** `packages/dom/src/index.ts` (lines 702–712, 1437–1439)
* **Severity:** Medium
* **Status:** **Invalid (Working by Design)**
* **Description:**
  Reported that `executeFrom` in `VMMode.UPDATE` executes to the end of the module because it breaks at `Opcode.RETURN`.
* **Resolution:**
  **False positive by auditor.** The compiler emits an inline `Opcode.RETURN` delimiter immediately following every dynamic instruction (`SET_ATTR`, `INTERPOLATE_TEXT`, `MOUNT_COMPONENT`). In `VMMode.MOUNT`, `RETURN` increments `pc += 1` to continue tree construction. In `VMMode.UPDATE`, `executeFrom` executes strictly that single dynamic instruction, hits the inline `Opcode.RETURN`, and halts immediately (`return null;`). There is zero cascading execution.

---

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
