---
title: "DriftJS DOM API"
description: "Reference for DriftJS DOM browser Virtual Machine, mount, hydrate, and reconciler."
---

# DriftJS DOM API

`driftjs-dom` is the browser client runtime for DriftJS. It executes compiled bytecode using `DriftClientVM`, manages physical DOM mutation, delegates events, and reconciles keyed lists.

---

## Primary Functions

### Mount Function
Mounts a compiled Drift component into a target DOM container.

```ts
import { mount } from 'driftjs-dom';
import App from './App.drift';

const vm = mount(App, document.getElementById('root')!, {
  props: { user: 'Ada' },
});
```

#### Parameters
* `module`: `CompiledModule` — Pre-compiled component module.
* `container`: `Element | DocumentFragment` — DOM element to mount into.
* `options`: `VMExecutionOptions` (optional) — Initial props, scope, or parent VM reference.

#### Returns
* `DriftClientVM`: The live VM instance controlling the component.

---

### Hydrate Function
Hydrates server-rendered HTML inside a container without destroying existing DOM nodes.

```ts
import { hydrate } from 'driftjs-dom';
import App from './App.drift';

const vm = hydrate(App, document.getElementById('root')!);
```

---

### Hydrate Islands Function
Scans a DOM subtree for elements with `[data-drift-island]` and hydra-gates them with their specified triggers (`eager`, `idle`, `visible`, `interaction`, `media`).

```ts
import { hydrateIslands } from 'driftjs-dom';
import Counter from './Counter.drift';
import SearchBox from './SearchBox.drift';

hydrateIslands(document.body, {
  Counter,
  SearchBox,
});
```

---

## The Drift Client VM Class

The register-based virtual machine executing bytecode instructions.

```ts
export class DriftClientVM {
  public scope: Record<string, any>;
  public parentVM: DriftClientVM | null;

  /** Executes compiled bytecode in MOUNT or HYDRATE mode. */
  execute(module: CompiledModule, options?: VMExecutionOptions): Node | null;

  /** Marks a declared variable as dirty and schedules a microtask flush. */
  markDirty(varName: string): void;

  /** Flushes all batched dirty variables and patches target DOM nodes in-place. */
  flushDirtyUpdates(): void;

  /** Unmounts child components and cleans up event listeners for a subtree. */
  unmountSubtree(node: Node): void;
}
```

---

## Reconciler Function

### Reconcile Keyed List Function
Executes Longest Increasing Subsequence (LIS) reconciliation between old item records and new iterables.

```ts
import { reconcileKeyedList } from 'driftjs-dom';

reconcileKeyedList({
  parent: ulElement,
  startAnchor,
  endAnchor,
  oldRecords,
  newItems,
  keyFn,
  renderFn,
  vm,
});
```
