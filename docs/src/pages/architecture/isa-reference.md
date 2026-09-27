---
title: "Instruction Set Architecture Reference"
description: "Complete reference for DriftJS bytecode opcodes, operands, and runtime execution semantics."
---

# Instruction Set Architecture Reference

DriftJS templates compile into a variable-length bytecode stream (`Uint32Array` or `number[]`). Instructions consist of a single-byte opcode followed by fixed-width register operands and constant pool indices.

---

## Opcode Summary Table

| Opcode | Hex | Mnemonic | Operands | Category | Description |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **0** | `0x00` | `RETURN` | `reg` | Control Flow | Halts execution and returns node/fragment in `reg`. |
| **1** | `0x01` | `CREATE_ELEMENT` | `dstReg, tagIdx, [propsSpecIdx]` | DOM Creation | Creates an Element node and stores in `dstReg`. |
| **2** | `0x02` | `CREATE_TEXT` | `dstReg, textIdx` | DOM Creation | Creates static or evaluated TextNode in `dstReg`. |
| **3** | `0x03` | `CREATE_COMMENT` | `dstReg, commentIdx` | DOM Creation | Creates a DOM Comment node in `dstReg`. |
| **4** | `0x04` | `APPEND_CHILD` | `parentReg, childReg` | DOM Mutation | Appends node in `childReg` into `parentReg`. |
| **5** | `0x05` | `SET_ATTR` | `elemReg, nameIdx, valIdx, isDynamic` | Attributes | Sets attribute or binds event handler on `elemReg`. |
| **6** | `0x06` | `CREATE_FRAGMENT` | `dstReg` | DOM Creation | Creates a `DocumentFragment` into `dstReg`. |
| **7** | `0x07` | `INTERPOLATE_TEXT` | `dstReg, exprIdx` | Dynamic Binding | Evaluates expression and creates dynamic TextNode. |
| **12** | `0x0C` | `EXEC_SCRIPT` | `scriptIdx` | Scope Setup | Executes `<script>` AST statements to populate scope. |
| **13** | `0x0D` | `REACTIVE_IF` | `parentReg, condIdx, consIdx, altIdx, depsIdx` | Reactive Region | Anchors `@if` block between comment delimiters. |
| **14** | `0x0E` | `REACTIVE_FOR` | `parentReg, iterIdx, itemIdx, idxIdx, keyIdx, bodyIdx, depsIdx, iterDepsIdx, rowDepsIdx` | Reactive Region | Keyed `@for` loop with LIS reconciliation. |
| **15** | `0x0F` | `MOUNT_COMPONENT` | `dstReg, tagIdx, propsSpecIdx` | Components | Instantiates and mounts a child SFC sub-module. |
| **16** | `0x10` | `REACTIVE_ASYNC` | `parentReg, promIdx, bodyIdx, fbIdx, catchIdx` | Async | Suspends and streams subtree on Promise resolution. |
| **17** | `0x11` | `REACTIVE_SWITCH` | `parentReg, discIdx, casesIdx, depsIdx` | Reactive Region | Evaluates discriminant once and renders matching case. |

---

## Detailed Opcode Specifications

### Return Instruction (0x00)
* **Operands:** `reg` (1 byte)
* **Description:** Terminates execution of the current module or sub-module. The value stored in `registers[reg]` is returned to the caller.

### Create Element Instruction (0x01)
* **Operands:** `dstReg` (1 byte), `tagIdx` (1-4 bytes), `[propsSpecIdx]` (optional)
* **Description:** Creates an HTML element corresponding to `constants[tagIdx]` (e.g. `'div'`, `'section'`) and assigns it to `registers[dstReg]`. In hydrate mode, claims the matching element from the hydration cursor.

### Append Child Instruction (0x04)
* **Operands:** `parentReg` (1 byte), `childReg` (1 byte)
* **Description:** Appends the node held in `registers[childReg]` into the parent element or fragment held in `registers[parentReg]`.

### Set Attribute Instruction (0x05)
* **Operands:** `elemReg` (1 byte), `nameIdx` (1-4 bytes), `valIdx` (1-4 bytes), `isDynamic` (1 byte)
* **Description:**
  * If `name` starts with `on` (e.g. `onclick`), registers an event listener on the element held in `elemReg`.
  * If `isDynamic` is `1`, evaluates the expression against current scope and patches the attribute or DOM property directly.

### Interpolate Text Instruction (0x07)
* **Operands:** `dstReg` (1 byte), `exprIdx` (1-4 bytes)
* **Description:**
  * **Mount Phase:** Evaluates the pre-compiled expression function at `constants[exprIdx]`, creates a DOM `TextNode` with the string result, and stores it in `registers[dstReg]`.
  * **Update Phase:** Re-evaluates the expression and sets `textNode.nodeValue = String(newValue)` if changed.

### Reactive If Instruction (0x0D)
* **Operands:** `parentReg, condIdx, consIdx, altIdx, depsIdx`
* **Description:**
  * Inserts `<!--if-->` and `<!--/if-->` comment anchors into `registers[parentReg]`.
  * Evaluates the condition at `constants[condIdx]`.
  * If truthy, executes consequent sub-module at `constants[consIdx]` between anchors; otherwise executes alternate at `constants[altIdx]`.
  * Registers dirty dependency tracking for variable names in `constants[depsIdx]`.

### Reactive For Instruction (0x0E)
* **Operands:** `parentReg, iterIdx, itemIdx, idxIdx, keyIdx, bodyIdx, depsIdx, iterDepsIdx, rowDepsIdx`
* **Description:**
  * Inserts `<!--for-->` and `<!--/for-->` comment anchors into `registers[parentReg]`.
  * Evaluates the iterable at `constants[iterIdx]`.
  * Evaluates key expressions and executes `reconcileKeyedList()` with Longest Increasing Subsequence (LIS) to minimize DOM moves.
  * When outer dependencies change without changing row identities, executes `patchRowsForChangedVars` fast-path without moving DOM nodes.
