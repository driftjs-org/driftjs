---
title: "Context API"
description: "Share state across deep component subtrees with createContext, provide, and inject."
---

# Context API

The DriftJS Context API provides dependency injection across deeply nested component hierarchies, avoiding "prop drilling" without external state management libraries.

---

## 1. Creating a Context

Create a strongly typed Context token using `createContext()`:

```ts
// context/theme.ts
import { createContext } from 'driftjs-shared';

export interface ThemeContextValue {
  theme: 'dark' | 'light';
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>(
  { theme: 'dark', toggle: () => {} },
  'ThemeContext'
);
```

---

## 2. Providing Context with the Provide Function

In an ancestor component, use `provide()` to associate a value with the context token on the active VM instance:

```html
<!-- App.drift -->
<script>
  import { provide } from 'driftjs-dom'; // or driftjs-shared
  import { ThemeContext } from './context/theme';
  import MainView from './MainView.drift';

  let currentTheme = 'dark';

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  }

  // Provide state to all child components
  provide(ThemeContext, {
    theme: currentTheme,
    toggle: toggleTheme,
  });
</script>

<div class={currentTheme}>
  <MainView />
</div>
```

---

## 3. Injecting Context with the Inject Function

In any descendant component (regardless of how deeply nested), call `inject()`:

```html
<!-- ThemeButton.drift -->
<script>
  import { inject } from 'driftjs-dom';
  import { ThemeContext } from '../context/theme';

  const { theme, toggle } = inject(ThemeContext);
</script>

<button onclick={toggle} class="theme-btn">
  Current theme: {theme}
</button>
```

---

## 4. How Context Works Across VM Instances

DriftJS maintains an active VM execution stack (`pushActiveVM` / `popActiveVM`):
1. When `provide(context, value)` is called, the value is stored on the active VM's `providedContexts` map.
2. When a child component is mounted via `MOUNT_COMPONENT`, it records its `parentVM`.
3. When `inject(context)` is called in a descendant, the runtime walks up the `parentVM` chain until it finds the nearest provided value, or falls back to `context.defaultValue`.
4. Context works identically in browser client environments (`driftjs-dom`) and server rendering environments (`driftjs-ssr`).

---

## Try It Now

The sandbox below demonstrates the *result* of what Context achieves — shared theme state consumed anywhere in the tree, with no prop passing. In a real multi-component app this state would live in a `provide()` call in the root and be read with `inject()` in any descendant:

```drift exe
<script>
  // In a real app: createContext + provide() in root, inject() in children.
  // Here we simulate the shared state directly.
  let theme = 'dark';
  const isDark = derive(() => theme === 'dark');

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }
</script>

<div style="padding: 1.5rem; font-family: system-ui, sans-serif; border-radius: 10px; background: {isDark ? '#0d1117' : '#f8fafc'}; border: 1px solid {isDark ? '#30363d' : '#e2e8f0'};">
  <p style="margin: 0 0 0.5rem; font-size: 0.85rem; color: {isDark ? '#8b949e' : '#64748b'};">
    Injected theme value: <strong style="color: {isDark ? '#79c0ff' : '#0284c7'};">{theme}</strong>
  </p>
  <p style="margin: 0 0 1rem; font-size: 0.8rem; color: {isDark ? '#6e7681' : '#94a3b8'};">
    Any deeply nested component would call inject(ThemeCtx) to read this.
  </p>
  <button onclick={toggle} style="padding: 0.45rem 1.1rem; border-radius: 6px; border: none; background: #0284c7; color: #fff; font-weight: 600; cursor: pointer;">
    Switch to {isDark ? 'Light' : 'Dark'} Mode
  </button>
</div>
```

_In production, `provide(ThemeCtx, value)` in a root component makes this state injectable anywhere in the subtree — no props needed._
