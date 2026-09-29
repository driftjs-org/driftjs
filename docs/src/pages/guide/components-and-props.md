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

Try a live component that receives and reacts to props-style values:

```drift exe
<script>
  let name = 'Grace Hopper';
  let rank = 'Rear Admiral';
  let variant = 'primary';
  const variants = ['primary', 'success', 'warning'];

  function cycleVariant() {
    variant = variants[(variants.indexOf(variant) + 1) % variants.length];
  }
</script>

<div style="padding: 1.25rem; font-family: system-ui, sans-serif; max-width: 340px;">
  <div style="margin-bottom: 0.6rem;">
    <label style="font-size: 0.8rem; color: #64748b; display: block; margin-bottom: 0.2rem;">Name</label>
    <input type="text" value={name} oninput={(e) => name = e.target.value} style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; box-sizing: border-box;" />
  </div>
  <div style="margin-bottom: 0.75rem;">
    <label style="font-size: 0.8rem; color: #64748b; display: block; margin-bottom: 0.2rem;">Rank</label>
    <input type="text" value={rank} oninput={(e) => rank = e.target.value} style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; box-sizing: border-box;" />
  </div>

  <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
    <div style="padding: 0.75rem 1rem; background: {variant === 'primary' ? '#0284c7' : variant === 'success' ? '#10b981' : '#f59e0b'}; color: #fff;">
      <strong>{name}</strong> — {rank}
    </div>
    <div style="padding: 0.75rem 1rem; color: #475569; font-size: 0.875rem;">
      Pioneer of computer programming and compiler development.
    </div>
  </div>

  <button onclick={cycleVariant} style="margin-top: 0.75rem; padding: 0.4rem 1rem; border-radius: 6px; border: 1px solid #6366f1; background: #6366f1; color: #fff; font-weight: 600; cursor: pointer; font-size: 0.875rem;">Variant: {variant}</button>
</div>
```

_✦ Edit name, rank, or cycle the variant — props-driven reactive UI in action._

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
