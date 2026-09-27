---
title: "DriftJS Compiler API"
description: "Reference for DriftJS compiler functions, classes, and compiled module types."
---

# DriftJS Compiler API

The `driftjs-compiler` package parses, transforms, and generates register VM bytecode from `.drift` source strings.

---

## Primary Function

### Compile Function
Compiles a `.drift` Single File Component source string into a `CompiledModule`.

```ts
import { compile, type CompiledModule } from 'driftjs-compiler';

const sfcSource = `
  <script>
    let count = 0;
  </script>
  <button onclick={() => count++}>Count: {count}</button>
`;

const compiled: CompiledModule = compile(sfcSource, false);
console.log(compiled.bytecode); // Uint32Array [...]
console.log(compiled.constants); // Array of constant pool entries
```

#### Parameters
* `source`: `string` — Raw `.drift` SFC template string.
* `debug`: `boolean` (optional, default: `false`) — When true, emits AST diagnostics and instruction disassembly to console.

#### Returns
* `CompiledModule`: The executable module containing bytecode and constant pool entries.

---

## Core Classes

### Drift Lexer Class
Stateful scanner converting raw template text into a stream of `Token` records.

```ts
import { DriftLexer, type Token } from 'driftjs-compiler';

const lexer = new DriftLexer(source);
let token: Token = lexer.nextToken();
while (token.type !== 'EOF') {
  console.log(token.type, token.value, token.loc);
  token = lexer.nextToken();
}
```

### Drift Parser Class
Recursive descent parser producing a typed AST (`ProgramNode`).

```ts
import { DriftLexer, DriftParser, type ProgramNode } from 'driftjs-compiler';

const lexer = new DriftLexer(source);
const parser = new DriftParser(lexer);
const ast: ProgramNode = parser.parse();
```

### Drift Transformer Class
Enriches the raw AST by parsing JavaScript expressions with Acorn, extracting `<script>` code, and pruning whitespace text nodes.

```ts
import { DriftTransformer } from 'driftjs-compiler';

const transformer = new DriftTransformer(ast);
const enrichedAst = transformer.transform();
```

### Drift Generator Class
Walks enriched AST nodes, allocates 256 registers, and generates the final `CompiledModule`.

```ts
import { DriftGenerator } from 'driftjs-compiler';

const generator = new DriftGenerator(enrichedAst);
const module = generator.generate();
```

---

## Interfaces and Types

### Compiled Module Interface
```ts
export interface CompiledModule {
  readonly bytecode: Uint32Array | readonly number[];
  readonly constants: readonly any[];
  readonly reactiveBindings?: readonly ReactiveBinding[];
  readonly declaredVars?: readonly string[];
  readonly derived?: readonly DerivedBinding[];
  readonly effects?: readonly EffectBinding[];
  readonly imports?: readonly ImportSpec[];
  readonly scope?: Record<string, any>;
}
```

### Reactive Binding Interface
```ts
export interface ReactiveBinding {
  readonly variable: string;
  readonly positions: readonly number[]; // Bytecode PC indices
}
```
