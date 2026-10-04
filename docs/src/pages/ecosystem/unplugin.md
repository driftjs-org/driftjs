---
title: "DriftJS Vite Plugin"
description: "Build-time SFC compiler and Hot Module Replacement (HMR) plugin for Vite."
---

# DriftJS Vite Plugin

The `driftjs-vite-plugin` is the official Vite integration that turns `.drift` Single File Components into standard ECMAScript Modules (ESM) during development and production builds.

---

## Installation

```bash
pnpm add -D driftjs-vite-plugin
```

---

## Configuration

Add the plugin to your `vite.config.ts` or `vite.config.js`:

```ts
import { defineConfig } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';

export default defineConfig({
  plugins: [driftPlugin()],
});
```

### Options
```ts
export interface DriftPluginOptions {
  /** Enable compiler debug diagnostics and bytecode dump. Defaults to false. */
  debug?: boolean;
}
```

---

## How It Works

### Source Transformation Hook
When Vite encounters an import matching `*.drift`:
1. It invokes `compile(src)` from `driftjs-compiler`.
2. It serializes the resulting `CompiledModule` (bytecode, constant pool, reactive bindings, and imports) into a synthetic JavaScript ESM module.
3. The synthetic ESM module is returned to Vite for bundling.

```js
// Synthetic ESM emitted by driftPlugin
import Header from "./Header.drift";

const compiledModule = {
  bytecode: new Uint32Array([1, 0, 0, 5, 0, 1, 2, 0, 0, 0]),
  constants: ["div", "class", "app"],
  reactiveBindings: [],
  declaredVars: [],
  scope: { Header },
};

export default compiledModule;
```

### Hot Module Replacement Hook
During development (`vite dev`), editing any `.drift` file triggers the plugin's HMR handler:
* The module graph node for the file is invalidated.
* A reload notification is pushed through Vite's WebSocket channel to instantly update the running client.
