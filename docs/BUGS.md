## Core Engine Bug Findings

### 1. Missing `Opcode.REACTIVE_ASYNC` Handler in Browser Client VM
- **Package:** `driftjs-dom`
- **File:** `packages/dom/src/index.ts` (`DriftClientVM.executeFrom`)
- **Severity:** High (Crash / Unsupported Feature)
- **Description:**
  When compiling Single File Components containing `@async (promise as value)` directives, `DriftGenerator` emits opcode 16 (`Opcode.REACTIVE_ASYNC`). `DriftServerVM` implements this opcode for SSR, but `DriftClientVM.executeFrom` omits `case Opcode.REACTIVE_ASYNC:` entirely from its bytecode execution loop.
- **Symptom / Reproduction:**
  Mounting or executing any component using `@async` in the browser DOM immediately throws an unhandled exception:
  ```
  Error: Unknown Opcode 16 at PC ...
  ```
- **Root Cause:**
  Omission of the opcode dispatcher in `DriftClientVM.executeFrom` for opcode 16.
- **Recommended Fix:**
  Add `case Opcode.REACTIVE_ASYNC:` handling in `DriftClientVM.executeFrom` to establish comment delimiters (`<!--drift-async:id-->`), execute fallback/catch templates, and swap in the resolved body module once the asynchronous promise resolves.

---

### 2. Hydrated `@for` LIS Reconciler Fails to Move or Remove SSR-Hydrated DOM Nodes
- **Package:** `driftjs-dom`
- **Files:**
  - `packages/dom/src/index.ts` (`executeFrom`, `createItem`)
  - `packages/dom/src/reconciler.ts` (`removeRecordNodes`)
- **Severity:** High (DOM Inconsistency / Memory Leak)
- **Description:**
  During client-side hydration of a server-rendered `@for` loop, item templates execute within an in-memory `DocumentFragment` (`nodeType === 11`). Under `Opcode.APPEND_CHILD`:
  ```ts
  if (!this.cursor || (child.parentNode !== parent && parent.nodeType !== 11))
  ```
  The condition evaluates to `false` because `parent.nodeType === 11`. As a result, claimed DOM elements are not appended to the fragment, leaving `frag.childNodes` empty. Consequently, `createItem()` populates `record.nodes` with an empty array `[]`.
- **Symptom / Reproduction:**
  When the list items are subsequently removed, reordered, or filtered after hydration, `removeRecordNodes` iterates over `record.nodes` (length 0). The server-hydrated DOM elements remain permanently attached to the live document as orphaned nodes.
- **Root Cause:**
  Hydration element claiming does not register nodes into `record.nodes` when operating inside an unattached fragment.
- **Recommended Fix:**
  In hydration mode, track the claimed top-level DOM nodes directly on the `ItemRecord` rather than relying on `frag.childNodes`.

---

### 3. Props-based `derive()` and `effect()` in Child Components Do Not Update
- **Package:** `driftjs-dom`
- **File:** `packages/dom/src/index.ts` (`updateChildComponentProps`, `triggerUpdates`)
- **Severity:** High (Reactivity Breakdown)
- **Description:**
  When parent component props change, `updateChildComponentProps` directly calls `childVM.triggerUpdates(dirtyPropVars)`. However:
  1. `triggerUpdates` never calls `this.invalidateDerived(varName)`, leaving `cacheEntry.isDirty = false` for derived values depending on props.
  2. `triggerUpdates` calls `this.invalidateEffects(varName)` which queues to `this.pendingEffects`, but `triggerUpdates` never calls `this.flushPendingEffects()` and `isUpdateScheduled` remains `false`.
- **Symptom / Reproduction:**
  Inside a child component, any `derive(() => ...)` value or `effect(() => ...)` callback whose dependencies include props will never re-evaluate or execute when the parent updates those props.
- **Root Cause:**
  `triggerUpdates` handles template bytecode PCs and reactive regions, but omits derived cache invalidation and does not flush or schedule pending effects.
- **Recommended Fix:**
  In `triggerUpdates`, call `this.invalidateDerived(varName)` for each dirty variable, and flush pending effects after completing binding evaluations.

---

### 4. Memory Leak of Slotted `childrenVM` in `unmountSubtree`
- **Package:** `driftjs-dom`
- **File:** `packages/dom/src/index.ts` (`unmountSubtree`, `MOUNT_COMPONENT`)
- **Severity:** Medium (Memory Leak)
- **Description:**
  When mounting child components with slotted children, a secondary `childrenVM` is instantiated and stored in `this.mountedChildVMs`:
  ```ts
  this.mountedChildVMs.set(entryKey, { vm: childVM, childrenVM });
  ```
  When the subtree is destroyed (such as in an `@if` branch switch or list item removal), `unmountSubtree()` only cleans up `entry.vm`:
  ```ts
  entry.vm.unmount();
  this.mountedChildVMs.delete(childKey);
  ```
- **Symptom / Reproduction:**
  `entry.childrenVM` is never unmounted, leaving active listeners, pending timers, and scope references retained in memory.
- **Root Cause:**
  `unmountSubtree` overlooks cleaning up `entry.childrenVM`.
- **Recommended Fix:**
  In `unmountSubtree`, check if `entry.childrenVM` exists and call `entry.childrenVM.unmount()`.

---

### 5. Colons in XML/SVG Attribute Names Crash the Lexer
- **Package:** `driftjs-compiler`
- **File:** `packages/compiler/src/lexer.ts` (`isIdentifierChar`)
- **Severity:** Medium (Compilation Failure)
- **Description:**
  `isIdentifierChar` only permits ASCII alphanumeric characters, underscores, dollar signs, and hyphens (`[a-zA-Z0-9_$-]`). Character code 58 (`:`) is not treated as a valid identifier character inside tag headers.
- **Symptom / Reproduction:**
  Standard SVG or XML namespaced attributes such as `<use xlink:href="#icon" />` or `<svg xml:space="preserve">` fail during tokenization:
  ```
  LexerError [1:16]: Unexpected character ':' inside tag <use>
  ```
- **Root Cause:**
  The identifier scanner character test rejects namespace colons.
- **Recommended Fix:**
  Allow character code 58 (`:`) in `isIdentifierChar` when scanning attribute names.

---

### 6. Plain `@` Characters in Text Content Crash Lexer as Unknown Directives
- **Package:** `driftjs-compiler`
- **File:** `packages/compiler/src/lexer.ts` (`readDataToken`, `readDirectiveToken`)
- **Severity:** Medium (Compilation Failure)
- **Description:**
  In template data scanning mode (`readDataToken`), encountering an `@` character unconditionally routes to `readDirectiveToken`, which requires the following identifier to exist in `KNOWN_DIRECTIVES` (`if`, `for`, `switch`, etc.).
- **Symptom / Reproduction:**
  Any normal text in templates containing email addresses or user mentions (e.g. `<p>Contact support@example.com</p>` or `<span>@driftjs</span>`) causes compilation to fail:
  ```
  LexerError [1:25]: Unknown directive '@example'
  ```
- **Root Cause:**
  The lexer assumes every `@` character in text is the start of a Drift directive without checking if it matches a valid directive keyword.
- **Recommended Fix:**
  In `readDataToken`, verify if `@` is followed by a known directive identifier before dispatching to directive tokenization; otherwise, continue consuming it as plain text.

---

### 7. Unparenthesized Object Destructuring in `@for` Header Fails to Lex
- **Package:** `driftjs-compiler`
- **File:** `packages/compiler/src/lexer.ts` (`readDirectiveHeader`)
- **Severity:** Medium (Syntax Parsing Failure)
- **Description:**
  In `readDirectiveHeader`, an opening brace `{` is only treated as part of the header expression if the lookbehind matches `/\b(as|catch)\s*$/` or if brace depth is greater than 0. For headers like `@for { id, name } in items {`, brace depth starts at 0 and the regex does not match.
- **Symptom / Reproduction:**
  The lexer prematurely treats `{ id` as the directive body's opening brace, resulting in an empty header string and throwing:
  ```
  ParserError: Invalid @for header syntax ''. Expected format: 'item in list' or '(item, index) in list'
  ```
- **Root Cause:**
  Header brace tracking does not account for object destructuring syntax preceding the `in` / `of` delimiter.
- **Recommended Fix:**
  Track whether the loop expression has reached the `in` or `of` keyword before treating `{` as the directive block delimiter.

---

### 8. Hyphenated Keys in Destructured Rest Parameters Produce Invalid JavaScript
- **Package:** `driftjs-compiler`
- **File:** `packages/compiler/src/generator.ts` (`generatePatternAssignments`)
- **Severity:** Medium (Code Generation Syntax Error)
- **Description:**
  When generating destructuring helper functions for object rest patterns (e.g. `@for ({ 'content-type': ct, ...rest } in items)`), `knownParams` directly interpolates property names without escaping or identifier validation:
  ```js
  (({ content-type, ...rest }) => rest)
  ```
- **Symptom / Reproduction:**
  Evaluating the generated code via Acorn or JS runtime throws:
  ```
  SyntaxError: Unexpected token '-'
  ```
- **Root Cause:**
  String property keys with dashes or special characters are placed directly into JavaScript parameter lists as identifiers.
- **Recommended Fix:**
  Quote or compute non-identifier keys in emitted destructuring patterns (e.g. `({ ['content-type']: _0, ...rest }) => rest`).

---

### 9. Kebab-case Unitless CSS Properties in `normalizeStyle` Append `px`
- **Package:** `driftjs-shared`
- **File:** `packages/utils/src/style.ts` (`normalizeStyle`, `UNITLESS_PROPERTIES`)
- **Severity:** Low / Bug (Invalid CSS Output)
- **Description:**
  `UNITLESS_PROPERTIES` stores property names in camelCase format (`zIndex`, `lineHeight`, `flexGrow`). In `normalizeStyle`:
  ```ts
  if (typeof val === 'number' && val !== 0 && !UNITLESS_PROPERTIES.has(key)) {
    val = `${val}px`;
  }
  ```
  The lookup `!UNITLESS_PROPERTIES.has(key)` runs against the un-camelized input key.
- **Symptom / Reproduction:**
  Passing kebab-case style objects such as `{ 'z-index': 10, 'line-height': 1.5 }` serializes to:
  ```css
  z-index: 10px; line-height: 1.5px
  ```
  which browsers reject as invalid CSS.
- **Root Cause:**
  Case mismatch between raw kebab-case object keys and camelCase set entries.
- **Recommended Fix:**
  Lookup `UNITLESS_PROPERTIES.has(camelize(key))` or include both kebab-case and camelCase entries in the set.
