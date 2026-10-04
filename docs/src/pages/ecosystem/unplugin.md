---
title: "DriftJS Unplugin"
description: "Universal build plugin for Vite, Rollup, Webpack, esbuild, and Rspack."
---

# DriftJS Unplugin

`driftjs-unplugin` is the official build-tool agnostic plugin powered by [unplugin](https://github.com/unjs/unplugin) that turns `.drift` Single File Components into standard ECMAScript Modules (ESM) across Vite, Rollup, Webpack, esbuild, and Rspack.

---

## Installation

```bash
pnpm add -D driftjs-unplugin
```

---

## Usage

### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { vite } from 'driftjs-unplugin';

export default defineConfig({
  plugins: [vite()],
});
```

### Rollup

```js
// rollup.config.js
import { rollup } from 'driftjs-unplugin';

export default {
  plugins: [rollup()],
};
```

### Webpack

```js
// webpack.config.js
const { webpack } = require('driftjs-unplugin');

module.exports = {
  plugins: [webpack()],
};
```

### esbuild

```js
// esbuild.config.js
import { build } from 'esbuild';
import { esbuild } from 'driftjs-unplugin';

build({
  plugins: [esbuild()],
});
```

### Rspack

```js
// rspack.config.js
const { rspack } = require('driftjs-unplugin');

module.exports = {
  plugins: [rspack()],
};
```

---

## Options

```ts
export interface DriftPluginOptions {
  /** Enable compiler debug diagnostics and bytecode dump. Defaults to false. */
  debug?: boolean;
}
```

---

## How It Works

### Source Transformation Hook
When the bundler encounters an import matching `*.drift`:
1. It invokes `compileToESM(src, options)` from `driftjs-compiler`.
2. The compiler runs lexing, parsing, AST transformation, and bytecode generation, then emits CSP-safe ESM JavaScript code.
3. The synthetic ESM module is returned to the bundler for packaging.

### Hot Module Replacement Hook (Vite)
During development (`vite dev`), editing any `.drift` file triggers the plugin's HMR handler:
* The module graph node for the file is invalidated.
* A reload notification is pushed through Vite's WebSocket channel to instantly update the running client.

