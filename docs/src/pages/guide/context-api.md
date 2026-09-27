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
