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

Try it live — type in the fields and watch `derive(...)` recompute automatically:

```drift exe
<script>
  let firstName = 'Ada';
  let lastName = 'Lovelace';
  const fullName = derive(() => `${firstName} ${lastName}`);

  let price = 100;
  let taxRate = 0.08;
  const total = derive(() => price * (1 + taxRate));
</script>

<div style="padding: 1.25rem; font-family: system-ui, sans-serif; max-width: 320px;">
  <div style="margin-bottom: 0.6rem;">
    <label style="font-size: 0.8rem; color: #64748b; display: block; margin-bottom: 0.2rem;">First Name</label>
    <input type="text" value={firstName} oninput={(e) => firstName = e.target.value} style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; box-sizing: border-box;" />
  </div>
  <div style="margin-bottom: 0.75rem;">
    <label style="font-size: 0.8rem; color: #64748b; display: block; margin-bottom: 0.2rem;">Last Name</label>
    <input type="text" value={lastName} oninput={(e) => lastName = e.target.value} style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; box-sizing: border-box;" />
  </div>
  <p style="font-weight: 700; color: #0284c7; margin: 0 0 0.75rem;">Full Name: {fullName}</p>
  <div style="margin-bottom: 0.5rem;">
    <label style="font-size: 0.8rem; color: #64748b; display: block; margin-bottom: 0.2rem;">Price ($)</label>
    <input type="number" value={price} oninput={(e) => price = +e.target.value} style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; box-sizing: border-box;" />
  </div>
  <p style="font-weight: 700; color: #10b981; margin: 0;">Total (8% tax): ${total.toFixed(2)}</p>
</div>
```

_✦ Both derived values update instantly — no manual wiring required._

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
