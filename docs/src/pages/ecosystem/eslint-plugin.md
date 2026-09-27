---
title: "DriftJS ESLint Plugin"
description: "ESLint plugin and parser for linting DriftJS Single File Components."
---

# DriftJS ESLint Plugin

`driftjs-eslint-plugin` provides official ESLint support for `.drift` Single File Components. It includes a custom parser (`parseForESLint`), template scope analyzer, and specialized lint rules.

---

## Installation

```bash
pnpm add -D eslint driftjs-eslint-plugin
```

---

## Configuration: ESLint Flat Config

Add the plugin to your `eslint.config.js`:

```js
import driftPlugin from 'driftjs-eslint-plugin';

export default [
  driftPlugin.configs.recommended,
  {
    rules: {
      'drift/prefer-for-key': 'error',
      'drift/no-duplicate-script': 'error',
    },
  },
];
```

---

## Custom Lint Rules

| Rule | Description | Recommended |
| :--- | :--- | :---: |
| `drift/no-duplicate-script` | Disallow multiple `<script>` tags in a single `.drift` file. | ✅ (error) |
| `drift/no-undef-in-template` | Warn when template interpolations reference undefined identifiers. | ✅ (error) |
| `drift/valid-directives` | Validate syntax and nesting of Drift directives (`@if`, `@for`, `@switch`, `@async`). | ✅ (error) |
| `drift/no-unclosed-tags` | Disallow unclosed HTML and component tags in templates. | ✅ (error) |
| `drift/prefer-for-key` | Require or suggest a `key` expression on `@for` loops (`@for item in items key item.id`). | ✅ (warn) |
| `drift/no-reserved-event-names` | Disallow reserved or invalid event handler attribute names. | ✅ (warn) |
| `drift/no-direct-dom-access` | Discourage manual DOM manipulation that bypasses the register VM. | Optional |
