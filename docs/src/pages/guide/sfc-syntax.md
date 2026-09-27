---
title: "Single File Component (.drift) Syntax"
description: "Learn the structure, tags, interpolations, and directives of DriftJS Single File Components."
---

# Single File Component Syntax

DriftJS components are authored in `.drift` files. Single File Components (SFCs) unify logic, markup, and styling into a single cohesive, type-safe file.

---

## Component Anatomy

A typical `.drift` file consists of three parts:
1. `<script>`: Component logic, reactive variables, imports, and helper functions.
2. **Template Markup**: Declarative HTML elements, interpolations, and control flow directives (`@if`, `@for`, `@switch`, `@async`).
3. `<style>`: Optional component styles.

```html
<script>
  // 1. Script Block: Logic & Reactive State
  import Badge from './Badge.drift';

  let title = 'Drift Component';
  let counter = 0;
  const isPositive = derive(() => counter > 0);

  function increment() {
    counter++;
  }
</script>

<!-- 2. Template Markup -->
<article class="card">
  <header>
    <h2>{title}</h2>
    <Badge type="info">Active</Badge>
  </header>

  <p>Value: {counter}</p>

  @if isPositive {
    <span class="positive-indicator">Value is positive!</span>
  }

  <button onclick={increment}>Add</button>
</article>

<!-- 3. Styles -->
<style>
  .card {
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid #1e293b;
  }
  .positive-indicator {
    color: #10b981;
    font-weight: bold;
  }
</style>
```

---

## 1. The Script Block

The `<script>` block is executed during component scope initialization before any DOM construction.

### Variable Declarations and Reactivity
Any `let` variable declared in `<script>` is automatically tracked for reactivity:

```html
<script>
  let message = 'Hello World';
  let count = 0;

  function update() {
    // Direct assignment automatically marks 'count' as dirty
    count++;
  }
</script>
```

### Importing Other Components
Components can be imported using standard ESM syntax:

```html
<script>
  import Header from './Header.drift';
  import Button from '../ui/Button.drift';
</script>
```

Capitalized tags in the template matching imported names are treated as sub-components.

---

## 2. Dynamic Text Interpolation

Dynamic expressions are wrapped in single curly braces: `{ expression }`.

```html
<p>Hello, {user.name}!</p>
<p>Total: {price * quantity}</p>
<p>Status: {isOnline ? 'Online' : 'Offline'}</p>
```

DriftJS parses the expression with Acorn at build time, compiles it into a CSP-safe function in the constant pool, and emits an `INTERPOLATE_TEXT` instruction targeting the destination register.

---

## 3. Attributes and Event Handlers

### Static Attributes
Standard HTML attributes work exactly as expected:

```html
<div class="container" id="main" role="region"></div>
```

### Dynamic Attributes
Pass dynamic expressions to attributes using curly braces:

```html
<img src={avatarUrl} alt={userName} />
<button disabled={isLoading}>Submit</button>
<div class={isActive ? 'active-item' : 'item'}>Item</div>
```

### Event Handling
Attach event listeners using standard DOM property names (`onclick`, `oninput`, `onkeydown`, `onsubmit`):

```html
<script>
  function handleClick(event) {
    console.log('Button clicked', event);
  }

  function handleInput(event) {
    name = event.target.value;
  }
</script>

<button onclick={handleClick}>Click Me</button>
<input type="text" oninput={handleInput} />
```

Under the hood, `driftjs-dom` attaches global delegated event listeners on the document root for bubbling events, dispatching to component handlers with zero DOM memory leaks.

---

## 4. Directives Overview

DriftJS includes four expressive compiler directives:

* **Conditional:** `@if condition { ... } @else if condition { ... } @else { ... }`
* **Loops:** `@for item in items key item.id { ... }` or `@for (item, index) in items key item.id { ... }`
* **Pattern Matching:** `@switch value { @case match { ... } @default { ... } }`
* **Suspense & Async:** `@async promise as alias { ... } @fallback { ... } @catch (err) { ... }`

Each directive is anchored between DOM comment delimiters and compiled into optimized sub-modules in the constant pool.
