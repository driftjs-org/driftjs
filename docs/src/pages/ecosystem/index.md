---
title: "DriftJS Ecosystem & Tooling"
description: "Overview of official developer tooling, bundlers, linters, formatters, and IDE extensions for DriftJS."
---

# DriftJS Ecosystem & Tooling

DriftJS provides a full suite of first-party tools to deliver a world-class developer experience across bundling, routing, linting, formatting, and editor tooling.

---

## Ecosystem Packages

| Package | Name | Description |
| :--- | :--- | :--- |
| **`driftjs-unplugin`** | Build Plugin | Universal plugin (Vite, Rollup, Webpack, esbuild, Rspack) compiling `.drift` SFC files. |
| **`driftjs-router`** | Client SPA Router | Lightweight client-side router with HTML5 history, route guards, and nested routes. |
| **`create-drift`** | Project CLI | Interactive terminal generator for CSR, SSR, and SSG projects. |
| **`driftjs-eslint-plugin`** | ESLint Linter | Custom ESLint parser and rules for template scope and syntax validation. |
| **`driftjs-prettier-plugin`** | Prettier Formatter | Prettier plugin for formatting `.drift` SFC files with embedded JS/CSS support. |
| **`driftjs-vscode`** | VSCode Extension | Syntax highlighting, snippets, and Language Server Protocol (LSP) diagnostics. |
| **`devtool`** | DevTools Extension | Cross-browser DevTools extension for register VM, reactive scope, and bytecode debugging. |

---

## Topics in this Section

* [**driftjs-unplugin**](/ecosystem/unplugin/): Universal bundler plugin and HMR mechanics.
* [**driftjs-router**](/ecosystem/router/): SPA routing, navigation guards, and history drivers.
* [**create-drift CLI**](/ecosystem/cli/): Scaffolding project templates.
* [**driftjs-eslint-plugin**](/ecosystem/eslint-plugin/): ESLint parser and custom lint rules.
* [**driftjs-prettier-plugin**](/ecosystem/prettier-plugin/): Automatic code formatting for `.drift` files.
* [**driftjs-vscode**](/ecosystem/vscode-plugin/): TextMate grammar and language server for VSCode.
* [**DriftJS DevTools**](/ecosystem/devtools/): Register VM, reactive scope, and bytecode inspection.
