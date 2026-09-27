---
title: "Create Drift CLI"
description: "Interactive project scaffolder for rapid DriftJS application development."
---

# Create Drift CLI

`create-drift` is the official scaffolding CLI tool for creating new DriftJS projects. Powered by `@clack/prompts`, it guides you through project setup with a modern terminal interface.

---

## Usage

Run `create-drift` using your favorite package manager:

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

---

## Command Line Arguments

You can bypass interactive prompts by passing arguments directly:

```bash
# Create a client SPA project named my-app
pnpm create drift my-app --template csr --pm pnpm

# Create an Islands SSG documentation site
pnpm create drift my-docs --template ssg --pm pnpm
```

### Options

| Flag | Description | Options |
| :--- | :--- | :--- |
| `[target-dir]` | Target directory name | e.g. `my-app`, `.` |
| `--template, -t` | Project architecture template | `csr`, `ssg`, `ssr` |
| `--pm` | Preferred package manager | `pnpm`, `npm`, `yarn`, `bun` |
| `--overwrite` | Overwrite target directory if non-empty | `true`, `false` |
| `--git` | Initialize a Git repository | `true`, `false` |

---

## Starter Templates

* **CSR (Client SPA):** Minimal setup with Vite, TypeScript, and `driftjs-dom`. Best for interactive dashboards and web applications.
* **SSG (Drift Static):** Pre-configured with `driftjs-ssg`, Markdown content collections, and islands architecture. Best for blogs and documentation sites.
* **SSR (Fullstack Server):** Includes an Express / Node.js server using `DriftServerVM` and streaming hydration.
