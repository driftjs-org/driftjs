---
title: "DriftJS VSCode Extension"
description: "Visual Studio Code extension and Language Server for DriftJS."
---

# DriftJS VSCode Extension

`driftjs-vscode` brings first-class editor support for `.drift` files to Visual Studio Code and compatible editors (Cursor, VSCodium).

---

## Features

* **Syntax Highlighting:** Custom TextMate grammar highlighting HTML tags, JavaScript in `<script>`, CSS in `<style>`, and directives (`@if`, `@for`, `@switch`, `@async`).
* **Interactive Snippets:** Built-in snippets for creating components, loops, and conditional ladders.
* **Language Server Protocol (LSP):**
  * Real-time compiler syntax errors and diagnostics.
  * Autocomplete for directive headers and props.
  * Hover documentation on directives and built-in primitives (`derive`, `effect`).

---

## Installation

Install from the Visual Studio Code Marketplace by searching for **DriftJS**, or install via command line:

```bash
code --install-extension driftjs.driftjs-vscode
```

---

## Editor Settings Recommendation

Add to your `.vscode/settings.json`:

```json
{
  "files.associations": {
    "*.drift": "drift"
  },
  "[drift]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```
