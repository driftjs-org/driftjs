---
title: "Component Styling Conventions"
description: "Best practices for organizing styles, avoiding raw template style elements, and managing layouts in DriftJS."
---

# Component Styling Conventions

Styling in DriftJS is designed around maximum runtime performance, fast initial server delivery, and zero client overhead.

---

## How Drift Compiles Component Markup

Drift Single File Components (`.drift`) are compiled by the AOT compiler directly into lightweight register VM bytecode instructions:

* `<script>` blocks are compiled into component scope setup logic (`Opcode.EXEC_SCRIPT`).
* HTML tags are compiled directly into element creation and attribute instructions (`Opcode.CREATE_ELEMENT`, `Opcode.SET_ATTR`, `Opcode.APPEND_CHILD`).

---

## Why Avoid Raw Style Tags in Component Templates

Placing raw `<style>` tags directly inside a `.drift` component template:

```html
<!-- Anti-pattern in current versions -->
<div class="user-card">...</div>

<style>
  .user-card {
    background: #ffffff;
    border-radius: 8px;
  }
</style>
```

Because `<style>` is not currently intercepted as a special compiler block during template compilation, the generator treats it as a standard HTML element. This results in:

1. **DOM Element Instruction Generation:** The compiler generates `CREATE_ELEMENT 'style'` and `CREATE_TEXT` containing the entire CSS string.
2. **Bytecode Constant Pool Bloat:** The full unminified CSS text is stored in the constant pool of the component module.
3. **Body Injection:** When rendered via SSR and hydrated in the browser, the `<style>` element is injected directly into the document `<body>` inside the component container rather than the document `<head>`.
4. **Hydration Node Walking:** The CSS text becomes an active DOM text node traversed by `HydrationCursor`.

---

## Recommended Solution: Centralized Stylesheets

Manage component and application styles through standard CSS stylesheets imported in layout or page `<script>` blocks:

### 1. Centralize Styles in a CSS File

Organize component classes inside a project stylesheet (e.g. `src/styles/docs.css` or `src/styles/components.css`):

```css
/* src/styles/components.css */
.user-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  padding: 1.5rem;
}
```

### 2. Import Styles in Layouts or Pages

Import the CSS file at the top of your root layout (`_layout.drift`) or specific page templates:

```html
<script>
  import Header from '../components/Header.drift';
  import Footer from '../components/Footer.drift';
  import '../styles/components.css';
</script>

<div class="site-wrapper">
  <Header />
  <main>{children}</main>
  <Footer />
</div>
```

### Benefits of Centralized Styles

* **Optimal Bundling:** Vite bundles, deduplicates, and minifies your CSS into static `<link rel="stylesheet">` tags in the document `<head>`.
* **Zero Runtime Bytecode Overhead:** Keeps your compiled `.drift` bytecode stream compact without embedding large CSS strings into the VM constant pool.
* **Clean DOM Hierarchy:** Keeps component containers completely free of raw `<style>` DOM nodes, preventing any unintended styling display issues or TreeWalker hydration mismatches.

---

## Future Roadmap Note

> **Current Version Note:**
> This styling convention applies **as of now only** in current versions (v0.0.x).
> 
> Future versions of DriftJS and `driftjs-unplugin` will introduce native SFC style extraction:
> 1. **Automated Style Extraction:** The compiler will automatically extract `<style>` blocks from `.drift` files at build time and emit them as standalone CSS modules processed by your bundler.
> 2. **Scoped CSS Support:** Automatic class scoping (e.g. `<style scoped>`) to isolate component styles without manual naming conventions.
> 
> Until automated SFC style extraction is shipped in a future release, organizing styles in centralized stylesheets imported at the layout or page level is the recommended convention.
