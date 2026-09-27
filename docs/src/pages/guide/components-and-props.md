---
title: "Components and Props"
description: "Component composition, passing static and dynamic properties, and slot content projection."
---

# Components and Props

DriftJS encourages building complex user interfaces from small, reusable components.

---

## 1. Importing and Using Components

Components are imported using ESM `import` statements inside `<script>`:

```html
<!-- Parent.drift -->
<script>
  import Card from './Card.drift';
  import Button from './Button.drift';

  let user = { name: 'Grace Hopper', rank: 'Rear Admiral' };
</script>

<main class="page">
  <Card title={user.name} subtitle={user.rank}>
    <p>Pioneer of computer programming and compiler development.</p>
    <Button variant="primary">View Profile</Button>
  </Card>
</main>
```

By convention, tags starting with an uppercase letter (`<Card>`, `<Button>`) are treated as component tags by the compiler.

---

## 2. Passing Props

### Static Props
Pass string literals directly:

```html
<Button variant="secondary" size="large" fullWidth>Click</Button>
```

### Dynamic Props
Pass reactive expressions using curly braces `{}`:

```html
<Avatar src={user.avatarUrl} alt={user.name} size={size * 2} />
```

---

## 3. Receiving Props in Child Components

In the child component, attributes passed by the caller are exposed on the `props` object:

```html
<!-- Card.drift -->
<script>
  // props are injected into component scope
</script>

<div class="card-container">
  <div class="card-header">
    <h3>{props.title}</h3>
    @if props.subtitle {
      <span class="subtitle">{props.subtitle}</span>
    }
  </div>

  <div class="card-body">
    {children}
  </div>
</div>
```

---

## Slot Content Projection with Children

When a component wraps child elements:

```html
<Modal isOpen={showModal}>
  <h2>Confirm Deletion</h2>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

The children are compiled into an isolated sub-module passed to the child component under `children`. In the child component, simply place `{children}` where you want the projected markup to render:

```html
<!-- Modal.drift -->
<div class="modal-backdrop">
  <div class="modal-dialog">
    <div class="modal-content">
      {children}
    </div>
  </div>
</div>
```

---

## Virtual Machine Execution with Mount Component

Under the hood:
1. The compiler emits `MOUNT_COMPONENT dstReg, tagIdx, propsSpecIdx`.
2. The VM creates a child VM instance (`new DriftClientVM()` or `new DriftServerVM()`).
3. The child VM inherits the parent's prototype scope via `Object.create(parentScope)`, binding `props` and `children`.
4. The mounted root node or fragment is stored directly in `dstReg` and appended into the parent tree.
