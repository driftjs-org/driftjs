---
title: "DriftJS SSR API"
description: "Reference for DriftJS SSR headless server Virtual Machine, string serialization, and streaming."
---

# DriftJS SSR API

`driftjs-ssr` provides headless server-side rendering for DriftJS. It executes compiled bytecode without browser DOM globals (`window`, `document`) and serializes virtual server nodes directly into escaped HTML strings or Node.js streams.

---

## Primary Functions

### Render to String Function
Executes a compiled Drift component and serializes its virtual server node tree to an HTML string.

```ts
import { renderToString } from 'driftjs-ssr';
import App from './App.drift';

const html: string = renderToString(App, {
  props: { title: 'Server Rendered' },
  scope: { globalConfig: {} },
});
```

#### Parameters
* `component`: `CompiledModule` — Pre-compiled component module.
* `options`: `SSRExecutionOptions` (optional) — Initial props, scope, and parent VM reference.

#### Returns
* `string`: Serialized, escaped HTML with hydration comment delimiters (`<!--if-->`, `<!--for-->`).

---

### Render to Stream Function
Renders a component into a readable stream, flushing chunks progressively as asynchronous branches (`@async`) resolve.

```ts
import { renderToStream } from 'driftjs-ssr';
import App from './App.drift';

const stream = renderToStream(App, {
  props: { userPromise },
});

stream.pipe(response);
```

---

### Serialize Node Function
Low-level serializer converting a `ServerNode` tree into escaped HTML.

```ts
import { serializeNode, type ServerNode } from 'driftjs-ssr';

const node: ServerNode = {
  type: 'element',
  tag: 'div',
  attrs: new Map([['class', 'box']]),
  children: [{ type: 'text', content: 'Hello SSR' }],
};

const html = serializeNode(node);
// '<div class="box">Hello SSR</div>'
```

---

## The Drift Server VM Class

The headless server virtual machine.

```ts
export class DriftServerVM {
  public scope: Record<string, any>;
  public parentVM: DriftServerVM | null;

  /** Executes compiled bytecode and returns the root ServerNode. */
  execute(component: CompiledModule, options?: SSRExecutionOptions): ServerNode | null;
}
```

---

## Types

### Server Node Type
```ts
export interface ServerNode {
  type: 'element' | 'text' | 'comment' | 'fragment';
  tag?: string;
  attrs?: Map<string, string | boolean | null>;
  content?: string;
  children: ServerNode[];
}
```
