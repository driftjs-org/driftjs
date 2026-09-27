---
title: "DriftJS Shared API"
description: "Reference for shared scope evaluators, context management, and runtime utilities."
---

# DriftJS Shared API

`driftjs-shared` provides common utilities, scope evaluators, and context dependency injection used by both client (`driftjs-dom`) and server (`driftjs-ssr`) virtual machines.

---

## Context Management

### Create Context Function
Creates a unique Context token for dependency injection.

```ts
import { createContext, type Context } from 'driftjs-shared';

export const UserContext: Context<User | null> = createContext<User | null>(null, 'UserContext');
```

### Provide Context Function
Associates a context value with the currently active VM instance.

```ts
import { provide } from 'driftjs-shared';
import { UserContext } from './user-context';

provide(UserContext, currentUser);
```

### Inject Context Function
Resolves the nearest provided context value by traversing up the VM parent hierarchy.

```ts
import { inject } from 'driftjs-shared';
import { UserContext } from './user-context';

const user = inject(UserContext);
```

---

## Expression Evaluation and Scope Helpers

### Evaluate Expression Helper
Safely evaluates a pre-compiled function or constant AST node against a component scope.

```ts
import { evaluateExpression } from 'driftjs-shared';

const result = evaluateExpression(compiledFn, scope, declaredVars);
```

### Resolve Iterable Helper
Coerces raw values, arrays, sets, or generator objects into a standard iterable array for `@for` directives.

```ts
import { resolveIterable } from 'driftjs-shared';

const items = resolveIterable(maybeArray);
```

### Resolve Component Module Helper
Unwraps imported component modules, resolving ESM default exports and `CompiledModule` structures.

```ts
import { resolveComponentModule } from 'driftjs-shared';

const module = resolveComponentModule(imported);
```

---

## Constants

* **`MAX_REGISTERS`**: `256` — The maximum number of registers allocated per VM instance.
* **`VOID_ELEMENTS`**: `Set<string>` — Set of self-closing void HTML elements (`img`, `input`, `br`, `hr`, `meta`, `link`, etc.).
