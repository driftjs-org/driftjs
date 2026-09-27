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
