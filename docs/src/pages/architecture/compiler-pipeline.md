---
title: "The AOT Compiler Pipeline"
description: "How DriftJS compiles Single File Components into register bytecode through Lexer, Parser, Transformer, and Generator passes."
---

# The AOT Compiler Pipeline

The DriftJS compiler (`driftjs-compiler`) is an Ahead-of-Time (AOT) compilation engine that transforms `.drift` SFC text into an optimized `CompiledModule`.

---

## Compiler Pipeline Architecture

```
.drift Source String
        │
        ▼
   ┌─────────┐
   │  Lexer  │  DriftLexer: Scans tokens (tags, text, interpolations, directives)
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Parser  │  DriftParser: Produces raw template AST (ProgramNode)
   └────┬────┘
        │
        ▼
   ┌─────────────┐
   │ Transformer │  DriftTransformer: Parses JS expressions with Acorn, strips whitespace
   └────┬────────┘
        │
        ▼
   ┌───────────┐
   │ Generator │  DriftGenerator: Emits bytecode, registers, constants, and bindings
   └────┬──────┘
        │
        ▼
  CompiledModule { bytecode, constants, reactiveBindings, declaredVars }
```

---

## Lexer: Drift Lexer Pass

The lexer scans the raw SFC source string into a stream of typed tokens:
* **Token Types:** `TagOpen`, `TagClose`, `TagSelfClose`, `Identifier`, `Equals`, `StringLiteral`, `Interpolation`, `DirectiveIf`, `DirectiveFor`, `DirectiveSwitch`, `DirectiveAsync`, `Text`, `Comment`, `EOF`.
* **Interpolation Nesting:** Carefully tracks curly braces inside `{ ... }`, respecting nested object literals, template strings, and nested arrow functions.
* **Raw Content Preservation:** `<script>` and `<style>` blocks are tokenized as raw unparsed text so their inner JavaScript and CSS syntax remains untouched until later stages.

---

## Parser: Drift Parser Pass

The parser executes recursive descent to build a structured AST:
* **Element Nodes (`ElementNode`):** Tag names, attribute lists, event bindings, and child hierarchies.
* **Text & Interpolation Nodes:** Static text segments and dynamic expressions.
* **Directive Nodes (`IfNode`, `ForNode`, `SwitchNode`, `AsyncNode`):** Capture control flow tests, iterables, keys, and branch bodies.

---

## Transformer: Drift Transformer Pass

The transformer enriches raw AST nodes using a structured AST visitor:
* **Acorn Integration:** Expression strings in `{ expr }`, `@if condition`, `@for item in items`, and `<script>` blocks are parsed into standard ESTree/Acorn AST nodes.
* **Redundant Whitespace Pruning:** Strips formatting whitespace and newlines between element tags, preventing unnecessary TextNode allocations in the runtime.

---

## Code Generator: Drift Generator Pass

The generator translates the enriched AST into the final `CompiledModule`:

### Register Allocation
Maintains an internal register counter. Allocates destination registers for parent elements, increments for children, and reclaims registers once children are appended.

### Bytecode Emission
Emits byte instructions according to the ISA:
* Elements: `CREATE_ELEMENT`, `SET_ATTR`, `APPEND_CHILD`
* Interpolations: `INTERPOLATE_TEXT`
* Blocks: `REACTIVE_IF`, `REACTIVE_FOR`, `REACTIVE_SWITCH`

### Sub-Module Compilation
Branches of `@if` and loop bodies of `@for` are compiled recursively into isolated sub-modules placed in the constant pool.

### AST to JavaScript Code Generation
Converts Acorn expression AST nodes into CSP-safe executable JavaScript function strings stored under `{ __drift_fn__: ... }` in the constant pool, avoiding runtime `eval()`.

### Reactive Binding Analysis
Inspects identifiers in expressions against declared `<script>` variables and populates `reactiveBindings`, linking each variable to its bytecode PC positions.
