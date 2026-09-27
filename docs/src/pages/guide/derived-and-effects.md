---
title: "Derived Values and Effects"
description: "Computed values with derive(...) and reactive side effects with effect(...)."
---

# Derived Values and Effects

In addition to direct mutable variables, DriftJS provides two foundational primitives for managing computed state and side-effects: **`derive(...)`** and **`effect(...)`**.

---

## 1. Computed State with Derive

A derived value is a reactive value computed synchronously from other reactive state.

```html
<script>
  let firstName = 'Ada';
  let lastName = 'Lovelace';

  // Automatically recomputed whenever firstName or lastName changes
  const fullName = derive(() => `${firstName} ${lastName}`);

  let price = 100;
  let taxRate = 0.08;
  const total = derive(() => price * (1 + taxRate));
</script>

<h1>Welcome, {fullName}!</h1>
<p>Total due: ${total}</p>
```

### How Derive Operates Under the Hood
1. At compile time, the AOT compiler inspects the AST inside `derive(() => ...)` and extracts all referenced declared variables (e.g. `['firstName', 'lastName']`).
2. It registers a `DerivedBinding` on the `CompiledModule`:
   ```ts
   {
     name: "fullName",
     deps: ["firstName", "lastName"],
     exprIdx: 4
   }
   ```
3. When `firstName` or `lastName` is marked dirty, the VM re-evaluates the expression and caches the new value on the scope before any DOM instructions run.
4. Downstream bytecode instructions referencing `fullName` update immediately.

---

## 2. Reactive Side Effects with Effect

Use `effect(...)` to run side effects in response to state changes (such as logging, updating document titles, local storage persistence, or timers).

```html
<script>
  let count = 0;

  // Runs whenever 'count' changes
  effect(() => {
    console.log('Count is now:', count);
    if (typeof document !== 'undefined') {
      document.title = `Count: ${count}`;
    }
  });

  function increment() {
    count++;
  }
</script>

<button onclick={increment}>Increment: {count}</button>
```

### Effect Cleanup
If an effect sets up a subscription or timer, return a cleanup function from the callback:

```html
<script>
  let isRunning = false;

  effect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      console.log('Heartbeat tick...');
    }, 1000);

    // Cleanup function executes before re-running or on unmount
    return () => {
      clearInterval(timer);
    };
  });
</script>
```

---

## 3. Lifecycle Hooks: On Mount and On Unmount

For code that must execute strictly when the component enters or leaves the DOM:

```html
<script>
  import { onMount, onUnmount } from 'driftjs-dom';

  onMount(() => {
    console.log('Component mounted in DOM');
  });

  onUnmount(() => {
    console.log('Component destroyed from DOM');
  });
</script>
```
