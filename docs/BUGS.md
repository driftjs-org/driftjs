# DriftJS Known Defects & Bug Audit Log

This document tracks verified bugs, compiler edge cases, and runtime defects identified in the DriftJS engine, excluding router-specific issues.

---

## 📋 Defect Tracking Matrix

| Bug ID          | Component                                |     Severity     | Category              | Status | Summary                                                                                             |
| :-------------- | :--------------------------------------- | :--------------: | :-------------------- | :----: | :-------------------------------------------------------------------------------------------------- |
| **BUG-0** | `driftjs-compiler`, `driftjs-shared` |  **High**  | Scope & Reactivity    |  Open  | Destructuring & loop item populator mutates parent scope via`setScopeValue` prototype climbing    |
| **BUG-1** | `driftjs-compiler`                     | **Medium** | Parser / Directives   |  Open  | HTML comments between directive branches (`@if`, `@switch`, `@async`) break token lookahead   |
| **BUG-2** | `driftjs-compiler`, `driftjs-dom`    |  **High**  | Reactivity / Async    |  Open  | Unfiltered async alias dependencies in`compileAsyncNode` cause infinite fetch loops               |
| **BUG-3** | `driftjs-compiler`                     | **Medium** | Codegen / Expressions |  Open  | Logical assignment operators (`\|\|=`, `&&=`, `??=`) evaluate eagerly and lose short-circuiting |

---

## 🔍 Detailed Bug Reports

### BUG-0: Destructuring & Loop Item Populator Mutates Parent Scope via `setScopeValue`

- **Severity:** High
- **Components:** `driftjs-compiler` (generator), `driftjs-shared` (scope)
- **Files Affected:**
  - [`packages/utils/src/scope.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/utils/src/scope.ts#L4-L40) (`setScopeValue`)
  - [`packages/compiler/src/generator.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L921-L926) (`emitAssign`)
  - [`packages/compiler/src/generator.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L1082-L1098) (`buildItemPopulatorFn`)
  - [`packages/compiler/src/generator.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L1506-L1516) (`astToJS` `VariableDeclaration`)

#### Description

In DriftJS, per-item loop scopes and block scopes are created with prototypal inheritance (`itemScope = Object.create(parentScope)`).
When compiling `@for` item assignments (`@for item in list` or `@for { id, title } in list`) and destructured variable declarations (`let { x } = obj`), the code generator invokes `generatePatternAssignments`, which defaults to [`emitAssign`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L921-L926).

[`emitAssign`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L921-L926) emits code that calls `setScopeValue(scope, name, val)`. However, [`setScopeValue`](file:///home/hrutav-modha/Documents/driftjs/packages/utils/src/scope.ts#L15-L25) traverses up the prototype chain via `Object.getPrototypeOf(curr)` to find the existing owner of the property:

```ts
while (curr && curr !== Object.prototype) {
  if (typeof curr.__drift_mark_dirty__ === 'function') {
    dirtyFns.push(curr.__drift_mark_dirty__);
  }
  if (Object.prototype.hasOwnProperty.call(curr, name)) {
    curr[name] = val;
    setOn = curr;
    break;
  }
  curr = Object.getPrototypeOf(curr);
}
```

If the parent component scope declares a variable with the same name (such as `let item = 'outer'` or common names like `id`, `name`, `status`), [`setScopeValue`](file:///home/hrutav-modha/Documents/driftjs/packages/utils/src/scope.ts#L19-L23) finds the property on the parent scope and mutates the parent variable instead of shadowing it on `targetScope`.

Additionally, because `curr.__drift_mark_dirty__` is pushed for the parent scope, `dirtyFns` triggers reactive dirty notification on the parent VM during loop execution, scheduling redundant microtask render cycles.

#### Reproduction

```drift
<script>
  let item = "initial";
  let items = [{ 
  		item: "first" 
  	}, { 
    	item: "second" 
  }];
  console.log(item);
</script>

<div>
  @for { item } in items {
    <span>{item}</span>
  }
  <!-- Parent variable 'item' is now overwritten with "second" -->
  <p>Parent: {item}</p>
</div>
```

#### Expected Behavior

Loop variables and local variable declarations must bind strictly to the local `targetScope` (e.g. `targetScope[name] = val`) without walking up the prototype chain or dirty-marking parent VMs.

---

### BUG-1: HTML Comments Between Directive Branches Break Parser Control Flow

- **Severity:** Medium
- **Component:** `driftjs-compiler` (parser)
- **Files Affected:**
  - [`packages/compiler/src/parser.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L400-L417) (`parseIfDirective`)
  - [`packages/compiler/src/parser.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L440-L448) (`parseElseIfChain`)
  - [`packages/compiler/src/parser.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L780-L815) (`parseSwitchDirective`)
  - [`packages/compiler/src/parser.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L918-L935) (`parseAsyncDirective`)
  - [`packages/compiler/src/parser.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L981-L985) (`skipWhitespaceTokens`)

#### Description

When parsing branching directives (`@if / @else if / @else`, `@switch / @case / @default`, and `@async / @fallback / @catch`), the parser relies on [`skipWhitespaceTokens()`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L981-L985) to skip inter-block trivia.

However, [`skipWhitespaceTokens()`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L981-L985) only advances over tokens of type `TokenType.Text` where `.trim().length === 0`:

```ts
private skipWhitespaceTokens(): void {
  while (this.check(TokenType.Text) && this.peek().value.trim().length === 0) {
    this.advance();
  }
}
```

If an author places an HTML comment (`<!-- ... -->`) between directive blocks:

1. In `@if`, `skipWhitespaceTokens()` stops at `TokenType.Comment`. Lookahead fails to find `DirectiveElseIf` or `DirectiveElse`, ending the `@if` block early. When the parser resumes reading children, it encounters `@else if` or `@else` as an unexpected token and throws `DriftParserError`.
2. In `@switch`, encountering a comment between cases triggers the default branch error: `Unexpected token '<!-- ... -->' of type 'Comment' inside @switch block`.
3. In `@async`, a comment between `@async` and `@fallback` or `@catch` terminates branch parsing and leads to parser rejection.

#### Reproduction

```drift
@if (isLoggedIn) {
  <button onclick={logout}>Log Out</button>
}
<!-- Fallback for guest users -->
@else {
  <button onclick={login}>Log In</button>
}
```

**Parser Error:**

```
DriftParserError: Unexpected token '' of type 'DirectiveElse' at line 5, column 1
```

#### Expected Behavior

[`skipWhitespaceTokens()`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/parser.ts#L981-L985) should skip non-semantic tokens, including `TokenType.Comment` and whitespace-only `TokenType.Text`, or directives should explicitly handle comments between branches.

---

### BUG-2: Unfiltered Async Alias Dependencies in `compileAsyncNode` Cause Infinite Fetch Loops

- **Severity:** High
- **Components:** `driftjs-compiler` (generator), `driftjs-dom` (runtime)
- **Files Affected:**
  - [`packages/compiler/src/generator.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L559-L608) (`compileAsyncNode`)
  - Contrast with [`packages/compiler/src/generator.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L493-L506, #L541-L546) (`compileForNode`)

#### Description

In [`compileForNode`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L493-L506), the compiler registers loop aliases into `this.declaredVars` during sub-module compilation and then explicitly excludes them from the region's outer dependency lists (`iterDepsSet` / `rowDepsSet`):

```ts
for (const binding of bodyMod.reactiveBindings) {
  if (!iterDepsSet.has(binding.variable) && !loopAliases.has(binding.variable)) {
    rowDepsSet.add(binding.variable);
  }
}
```

In [`compileAsyncNode`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L559-L608), `node.alias` and `catchBranch.errorVar` are neither scoped nor filtered:

```ts
const depsSet = new Set<string>();
for (const dep of this.collectDepsFromSubModule(bodyMod, node.promise)) {
  depsSet.add(dep);
}
```

If an async alias identifier matches an outer variable in `<script>` (e.g. `let data = null;` and `@async (fetchData()) as data`), expressions inside the async body (such as `{data.name}`) match `this.declaredVars.has('data')` and get recorded into `bodyMod.reactiveBindings`.

Because `compileAsyncNode` does not filter out `node.alias`, `'data'` is stored into `depsIdx` as an outer dependency of the `REACTIVE_ASYNC` instruction. At runtime, when the promise resolves and populates `data` on the scope, `setScopeValue` marks `'data'` dirty. The VM's `triggerUpdates()` checks dirty variables, finds that the `REACTIVE_ASYNC` region depends on `'data'`, and re-triggers the async fetch, resulting in an infinite fetch and re-render loop.

#### Reproduction

```drift
<script>
  let user = null;
  function loadUser() {
    return fetch('/api/user').then((res) => res.json());
  }
</script>

@async (loadUser()) as user {
  <div>
    <h3>{user.name}</h3>
  </div>
}
```

When `loadUser()` resolves, `user` is set, `markDirty('user')` is called, and `REACTIVE_ASYNC` re-executes `loadUser()`, creating an infinite loop.

#### Expected Behavior

`compileAsyncNode` must filter out `node.alias` (and any destructured pattern identifiers) as well as `catchBranch.errorVar` from `depsSet` so resolved values do not trigger re-execution of the async block itself.

---

### BUG-3: Logical Assignment Operators (`||=`, `&&=`, `??=`) Lose Short-Circuiting Semantics

- **Severity:** Medium
- **Component:** `driftjs-compiler` (generator / `astToJS`)
- **Files Affected:**
  - [`packages/compiler/src/generator.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L1150-L1163) (`astToJS` `AssignmentExpression`)

#### Description

In [`generator.ts`](file:///home/hrutav-modha/Documents/driftjs/packages/compiler/src/generator.ts#L1159-L1162), `astToJS` handles compound assignment expressions by slicing the trailing `=` character:

```ts
if (node.operator === '=') {
  return `(typeof setScopeValue === 'function' ? setScopeValue(scope, ${JSON.stringify(name)}, ${valJS}) : ((scope || {})[${JSON.stringify(name)}] = ${valJS}))`;
} else {
  const op = node.operator.slice(0, -1);
  return `(typeof setScopeValue === 'function' ? setScopeValue(scope, ${JSON.stringify(name)}, (scope[${JSON.stringify(name)}] ${op} ${valJS})) : ((scope || {})[${JSON.stringify(name)}] ${node.operator} ${valJS}))`;
}
```

For logical assignment operators (`||=`, `&&=`, `??=`), `node.operator.slice(0, -1)` produces `||`, `&&`, or `??`.
This causes two distinct issues:

1. **Loss of Short-Circuiting:** The right-hand expression `valJS` is evaluated unconditionally. If `valJS` contains side effects or expensive function calls (e.g. `x ||= computeFallback()`), `computeFallback()` executes even when `x` is already truthy.
2. **Spurious Reactivity Invalidation:** `setScopeValue` is invoked unconditionally with `(scope["x"] || valJS)`. Even when the value does not change, `setScopeValue` climbs the prototype chain, triggers `__drift_mark_dirty__`, and schedules a microtask re-render.

#### Reproduction

```drift
<script>
  let config = { theme: 'dark' };
  let fetchCount = 0;

  function getDefaultTheme() {
    fetchCount++;
    return 'light';
  }

  function applyDefaults() {
    config.theme ||= getDefaultTheme();
  }

  applyDefaults();
</script>
```

`getDefaultTheme()` is called and increments `fetchCount`, despite `config.theme` already having a truthy value (`'dark'`).

#### Expected Behavior

Logical assignment expressions should preserve ECMAScript semantics:

- `a ||= b` should transpile to `(scope[name] || (setScopeValue(scope, name, valJS)))`
- `a &&= b` should transpile to `(scope[name] && (setScopeValue(scope, name, valJS)))`
- `a ??= b` should transpile to `(scope[name] ?? (setScopeValue(scope, name, valJS)))`
  Ensuring `valJS` is only evaluated and `setScopeValue` is only called when the condition necessitates assignment.
