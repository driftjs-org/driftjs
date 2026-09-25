---
title: Quick Start Guide
description: Get started building applications with DriftJS in under 2 minutes
---

# Quick Start Guide

Get up and running with DriftJS in seconds using `create-drift` or manual configuration.

---

## 1. Automatic Scaffolding

To create a new project interactively:

```bash
pnpm create drift my-app
# or
npm create drift@latest my-app
```

Choose between **Client-Side Rendering (CSR)** with Vite or **Server-Side Rendering (SSR)**.

---

## 2. Single File Component (.drift)

Drift components are authored in clean, single-file `.drift` files combining `<script>` logic and template markup:

```html
<script>
let count = 0;
let name = 'World';

function increment() {
  count = count + 1;
}
</script>

<div class="card">
  <h2>Hello, {name}!</h2>
  <p>The current count is: <strong>{count}</strong></p>
  
  @if (count > 5) {
    <p class="badge">High count reached!</p>
  }

  <button on:click={increment}>Click Me</button>
</div>
```

---

## 3. Mounting the Component

In your client entry point (`src/main.ts`):

```ts
import { mount } from 'driftjs-dom';
import App from './App.drift';

mount(App, document.getElementById('root'));
```

---

## 4. Running the Dev Server

```bash
pnpm dev
```
