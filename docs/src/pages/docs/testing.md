---
title: DriftJS Test Suite Documentation
description: Complete matrix and status of unit and integration tests across the DriftJS monorepo
---

# DriftJS Test Suite Documentation

This document provides a comprehensive inventory of all unit and integration test suites maintained across the **DriftJS** monorepo packages.

---

## 📊 Monorepo Test Overview

Total Test Suites: **41** | Total Test Cases: **537** | Pass Rate: **100%**

| Package Name | Package Directory | Test Environment | Pass Status |
| :--- | :--- | :---: | :---: |
| **`driftjs-compiler`** | `packages/compiler` | Node | ✅ 100% PASS |
| **`driftjs-shared`** | `packages/utils` | Node | ✅ 100% PASS |
| **`driftjs-dom`** | `packages/dom` | jsdom / browser | ✅ 100% PASS |
| **`driftjs-ssr`** | `packages/ssr` | Node | ✅ 100% PASS |
| **`driftjs-ssg`** | `packages/ssg` | Node | ✅ 100% PASS |
| **`driftjs-router`** | `packages/router` | jsdom / browser | ✅ 100% PASS |
| **`driftjs-vite-plugin`** | `packages/vite-plugin` | Node | ✅ 100% PASS |
| **`create-drift`** | `packages/cli` | Node | ✅ 100% PASS |
| **`driftjs-vscode`** | `packages/vscode-plugin` | Node | ✅ 100% PASS |
| **Total Workspace** | | | **537 / 537 PASS** |

---

## Key Test Coverage Areas

### 1. Drift Compiler (`driftjs-compiler`)
- **Lexer**: Stateful scanning of HTML tags, attributes, void elements, interpolations, and directives (`@if`, `@for`, `@switch`).
- **Parser**: Concrete syntax tree creation, element nesting, error diagnostics, self-closing tags.
- **Transformer**: Acorn JS expression analysis, whitespace collapsing, `@switch` case-table generation.
- **Generator**: Bytecode emission, register allocation, constant pool assembly, reactive binding tracking.

### 2. Client Register VM (`driftjs-dom`)
- In-place reactive updates (`INTERPOLATE_TEXT`, `SET_ATTR`).
- Keyed list reconciliation with Longest Increasing Subsequence (LIS) algorithm.
- SSR Hydration claiming elements and comment boundaries via `TreeWalker`.
- Event delegation and lifecycle management.

### 3. Static Site Generation (`driftjs-ssg`)
- File-system route scanning and dynamic parameter interpolation.
- Full nested layout composition (`{children}`) and document shells.
- Markdown rendering with frontmatter extraction and heading IDs.
- Islands detection and client hydration bundle generation.
