---
title: "DriftJS Prettier Plugin"
description: "Prettier plugin for formatting DriftJS Single File Components."
---

# DriftJS Prettier Plugin

`driftjs-prettier-plugin` enables Prettier to format `.drift` Single File Components. It intelligently formats `<script>` blocks using Prettier's Babel/TypeScript printers, `<style>` blocks with CSS printers, and template directives with consistent indentation.

---

## Installation

```bash
pnpm add -D prettier driftjs-prettier-plugin
```

---

## Configuration

Add the plugin to your `.prettierrc` or `prettier.config.js`:

```json
{
  "plugins": ["driftjs-prettier-plugin"],
  "tabWidth": 2,
  "singleQuote": true,
  "semi": true,
  "driftScriptIndent": true,
  "driftStyleIndent": true,
  "driftSelfCloseVoid": true
}
```

### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `driftScriptIndent` | `boolean` | `true` | Whether to indent code inside `<script>` blocks. |
| `driftStyleIndent` | `boolean` | `true` | Whether to indent code inside `<style>` blocks. |
| `driftSelfCloseVoid` | `boolean` | `true` | Whether to self-close void HTML tags (e.g. `<input />` vs `<input>`). |

---

## Formatting via CLI

```bash
pnpm prettier --write "src/**/*.drift"
```
