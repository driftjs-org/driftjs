---
title: "Quick Start"
description: "Get started with DriftJS in under two minutes using the create-drift scaffolding tool."
---

# Quick Start

Get your first DriftJS application up and running in minutes using the official `create-drift` project generator or by adding DriftJS to an existing project.

---

## Prerequisites

DriftJS requires:
* **Node.js** `>= 18.0.0`
* **Package Manager:** `pnpm` (recommended), `npm`, `yarn`, or `bun`

---

## Scaffolding a New Project

The easiest way to start is with `create-drift`:

```bash
# Using pnpm
pnpm create drift@latest

# Using npm
npm create drift@latest

# Using yarn
yarn create drift

# Using bun
bun create drift
```

The interactive CLI will prompt you for:
1. **Project name:** (e.g. `my-drift-app`)
2. **Template type:**
   * `Client SPA (CSR)`: Client-side single page app with `driftjs-dom` and `driftjs-vite-plugin`.
   * `Static Site (SSG)`: Zero-JS static site with Islands Architecture using `driftjs-ssg`.
   * `Fullstack SSR`: Headless server rendering with `driftjs-ssr` and client hydration.
3. **TypeScript:** Enable strict TypeScript support.
4. **Git initialization:** Initialize a fresh Git repository.

### Navigating to Your Project

```bash
cd my-drift-app
pnpm install
pnpm dev
```

Your app will be running at `http://localhost:3000` (or `http://localhost:5173`) with Hot Module Replacement (HMR).

---

## Project Structure Overview

A standard DriftJS project includes:

```
my-drift-app/
├── index.html            # HTML entry point (for SPA mode)
├── vite.config.ts        # Vite configuration with driftPlugin()
├── package.json
├── tsconfig.json
├── public/               # Static assets
└── src/
    ├── main.ts           # Client bootstrap script (mounts root component)
    ├── App.drift         # Root Single File Component
    └── style.css         # Global stylesheet
```

---

## The Root Component

Open `src/App.drift` in your editor:

```html
<script>
  let count = 0;
  const double = derive(() => count * 2);

  function increment() {
    count++;
  }

  function decrement() {
    count--;
  }
</script>

<div class="app-container">
  <header>
    <h1>Welcome to DriftJS</h1>
    <p>Register VM reactivity engine in action.</p>
  </header>

  <main>
    <div class="counter-box">
      <h2>Count: {count}</h2>
      <p>Double: {double}</p>
      <div class="actions">
        <button onclick={decrement}>-</button>
        <button onclick={increment}>+</button>
      </div>
    </div>
  </main>
</div>
```

---

## Mounting Your Component

In CSR mode, `src/main.ts` imports the compiled `.drift` module and mounts it into the DOM root using `mount()` from `driftjs-dom`:

```ts
import { mount } from 'driftjs-dom';
import App from './App.drift';
import './style.css';

const rootElement = document.getElementById('app');

if (rootElement) {
  mount(App, rootElement);
}
```

---

## Adding DriftJS to an Existing Vite Project

If you already have a Vite project, install the core packages:

```bash
pnpm add driftjs-compiler driftjs-dom driftjs-shared
pnpm add -D driftjs-vite-plugin
```

Update your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';

export default defineConfig({
  plugins: [driftPlugin()],
});
```

Now you can import `.drift` files anywhere in your application!
