---
title: "Control Flow Directives"
description: "Master @if, @for, @switch, and @async compiler directives in DriftJS templates."
---

# Control Flow Directives

DriftJS avoids JSX JavaScript ternaries (`cond ? <A/> : <B/>`) and `.map()` iterations. Instead, it provides first-class compiler directives designed for maximum readability and zero-overhead VM execution.

All directives in DriftJS use balanced curly braces `{ ... }` to delimit their branch bodies.

---

## The If Conditional Directive

Conditionals are declared using `@if`, `@else if`, and `@else`. Each branch block is enclosed in `{ ... }`:

```html
<script>
  let role = 'admin';
</script>

<div class="user-panel">
  @if role === 'admin' {
    <div class="badge admin">Administrator Access</div>
  } @else if role === 'editor' {
    <div class="badge editor">Editor Workspace</div>
  } @else {
    <div class="badge user">Standard User View</div>
  }
</div>
```

The condition expression can be authored either with or without outer parentheses (e.g. `@if role === 'admin' {` or `@if (role === 'admin') {`).

Try switching branches live:

```drift exe
<script>
  let role = 'admin';
  const roles = ['admin', 'editor', 'user'];

  function cycle() {
    role = roles[(roles.indexOf(role) + 1) % roles.length];
  }
</script>

<div style="padding: 1.25rem; font-family: system-ui, sans-serif; text-align: center;">
  <button onclick={cycle} style="margin-bottom: 1rem; padding: 0.4rem 1.2rem; border-radius: 6px; border: 1px solid #6366f1; background: #6366f1; color: #fff; font-weight: 600; cursor: pointer;">Switch Role ({role})</button>

  @if role === 'admin' {
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 0.75rem 1.25rem; color: #92400e; font-weight: 600;">👑 Administrator Access</div>
  } @else if role === 'editor' {
    <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 0.75rem 1.25rem; color: #1e40af; font-weight: 600;">✏️ Editor Workspace</div>
  } @else {
    <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 0.75rem 1.25rem; color: #166534; font-weight: 600;">👤 Standard User View</div>
  }
</div>
```

_✦ Click "Switch Role" to cycle branches — only the changed subtree is swapped between comment anchors._

### Virtual Machine Execution Mechanism with Reactive If
* The compiler creates two boundary DOM Comment nodes: `<!--if-->` and `<!--/if-->`.
* The consequent and alternate branches are compiled into isolated **sub-modules** stored in the constant pool.
* When dependencies change, the VM re-evaluates the condition. If the active branch flips, it tears down nodes strictly between the anchors and executes the new sub-module directly between them.

---

## The For Loop Directive

The `@for` directive renders iterables with automatic Longest Increasing Subsequence (LIS) keyed reconciliation.

### Basic Syntax
```html
<script>
  let todos = [
    { id: 1, title: 'Learn Register VM', done: true },
    { id: 2, title: 'Build Docs Site', done: false },
  ];
</script>

<ul>
  @for todo in todos key todo.id {
    <li class={todo.done ? 'completed' : ''}>
      <span>{todo.title}</span>
    </li>
  }
</ul>
```

### Capturing Item and Index
Enclose the item and index identifiers in parentheses `(item, index)`:

```html
@for (todo, idx) in todos key todo.id {
  <li>#{idx + 1}: {todo.title}</li>
}
```

### Object Destructuring in Loop Items
You can destructure objects directly in the loop target binding:

```html
@for { id, title } in todos key id {
  <li>{title} (ID: {id})</li>
}
```

### Keyed vs Unkeyed Reconciliation
* **Keyed (Recommended):** Providing a `key <expr>` clause (such as `key todo.id`) allows the VM reconciler (`reconcileKeyedList`) to compute the Longest Increasing Subsequence (LIS). When lists are reordered or updated, the VM moves only the minimal number of DOM nodes.
* **Row Attribute Fast-Patching:** If outer-scope state changes without modifying list item identities, `patchItemAttributes` updates text and attributes on existing rows without reordering or replacing DOM nodes.

Try the keyed `@for` list live — add tasks and toggle completion:

```drift exe
<script>
  let todos = [
    { id: 1, title: 'Learn Register VM', done: true },
    { id: 2, title: 'Build Docs Site', done: false },
    { id: 3, title: 'Ship to Production', done: false },
  ];

  function toggle(id) {
    todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
  }

  function addItem() {
    const id = Date.now();
    todos = [...todos, { id, title: `Task ${todos.length + 1}`, done: false }];
  }
</script>

<div style="padding: 1.25rem; font-family: system-ui, sans-serif; max-width: 340px; margin: 0 auto;">
  <ul style="list-style: none; padding: 0; margin: 0 0 0.75rem;">
    @for todo in todos key todo.id {
      <li onclick={() => toggle(todo.id)} style="display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.25rem; cursor: pointer; border-bottom: 1px solid #e2e8f0;">
        <span style="font-size: 1.1rem;">{todo.done ? '✅' : '⬜'}</span>
        <span style="text-decoration: {todo.done ? 'line-through' : 'none'}; color: {todo.done ? '#94a3b8' : '#1e293b'}">{todo.title}</span>
      </li>
    }
  </ul>
  <button onclick={addItem} style="padding: 0.4rem 1rem; border-radius: 6px; border: 1px solid #0284c7; background: #0284c7; color: #fff; font-size: 0.875rem; font-weight: 600; cursor: pointer;">+ Add Task</button>
</div>
```

_✦ Click items to toggle, add new tasks — keyed LIS reconciliation moves only the minimum DOM nodes._

---

## The Switch Directive

Pattern match against a discriminant expression with `@switch`, `@case`, and `@default`:

```html
<script>
  let status = 'loading';
</script>

<div class="status-container">
  @switch status {
    @case 'loading' {
      <div class="spinner">Loading data...</div>
    }
    @case 'success' {
      <div class="alert success">Operation succeeded!</div>
    }
    @case 'error' {
      <div class="alert error">An unexpected error occurred.</div>
    }
    @default {
      <div>Unknown state</div>
    }
  }
</div>
```

The discriminant expression in `@switch` is evaluated once, and the VM mounts the matching case branch sub-module.

Try it live:

```drift exe
<script>
  let status = 'loading';
  const states = ['loading', 'success', 'error', 'idle'];

  function next() {
    status = states[(states.indexOf(status) + 1) % states.length];
  }
</script>

<div style="padding: 1.25rem; font-family: system-ui, sans-serif; text-align: center;">
  <button onclick={next} style="margin-bottom: 1rem; padding: 0.4rem 1.2rem; border-radius: 6px; border: 1px solid #6366f1; background: #6366f1; color: #fff; font-weight: 600; cursor: pointer;">Next State ({status})</button>

  @switch status {
    @case 'loading' {
      <div style="background: #f0f9ff; border: 1px solid #38bdf8; border-radius: 8px; padding: 0.75rem 1.25rem; color: #0369a1;">⏳ Loading data...</div>
    }
    @case 'success' {
      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 0.75rem 1.25rem; color: #166534;">✅ Operation succeeded!</div>
    }
    @case 'error' {
      <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 0.75rem 1.25rem; color: #991b1b;">❌ An error occurred.</div>
    }
    @default {
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem 1.25rem; color: #475569;">💤 Idle</div>
    }
  }
</div>
```

_✦ Cycle through all four switch branches live._

---

## The Async Directive for Suspense and Streaming

Handle asynchronous Promises natively in your template with `@async`, `@fallback`, and `@catch`:

```html
<script>
  let fetchUserPromise = fetch('/api/user').then((res) => res.json());
</script>

<div class="profile-card">
  @async fetchUserPromise as user {
    <h2>User Profile: {user.name}</h2>
    <p>Email: {user.email}</p>
  } @fallback {
    <div class="skeleton-loader">Fetching profile details...</div>
  } @catch (err) {
    <div class="error-banner">Failed to load profile: {err.message}</div>
  }
</div>
```

* **Body Block:** Renders when the Promise resolves, binding the resolved value to the specified alias (e.g. `as user`).
* **`@fallback`:** Displayed while the Promise is pending.
* **`@catch`:** Displayed if the Promise rejects, exposing the error in `(err)`.
* On the server, `DriftServerVM` can stream the fallback HTML immediately and flush the resolved subtree once the promise completes.
