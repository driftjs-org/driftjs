---
title: "Text Node Hydration Conventions"
description: "Understanding browser text node coalescing, hydration cursor mechanics, and safe text interpolation patterns in DriftJS."
---

# Text Node Hydration Conventions

When building interactive selective islands in Drift Static, understanding how Server-Side Rendered (SSR) HTML interacts with browser DOM parsers is essential for seamless client-side hydration.

---

## The Browser Text Node Coalescing Phenomenon

During SSR, Drift serializes your component's template into standard HTML text. When the browser loads this HTML, the browser's native HTML parser constructs the DOM tree.

According to the HTML5 specification, when the browser HTML parser encounters contiguous character data inside an element, it collapses them into **a single DOM TextNode**, regardless of how many template interpolations originally generated the text.

---

## Why Hydration Desynchronization Occurs

Consider a button that mixes adjacent static text with a dynamic variable:

```html
<!-- Anti-pattern in current versions -->
<button class="btn" onclick={decrement}>- {step}</button>
```

Here is how the compiler and runtime process this element:

1. **AOT Bytecode Emission:** The compiler generates two separate bytecode instructions:
   - `CREATE_TEXT` for the static string `"- "`
   - `INTERPOLATE_TEXT` for the dynamic value of `{step}`
2. **SSR HTML Serialization:** The server emits `<button class="btn">- 1</button>`.
3. **Browser DOM Construction:** The browser parses this into `<button class="btn">` containing **one single TextNode** with value `"- 1"`.
4. **Hydration Cursor Step:** During client hydration, Drift's `HydrationCursor` walks the DOM using a browser `TreeWalker`:
   - `CREATE_TEXT` claims the single `TextNode("- 1")`.
   - `INTERPOLATE_TEXT` executes next and expects a second text node. Finding none inside the button, the `TreeWalker` looks ahead into the **next sibling element** (e.g. the adjacent button) and claims its text node instead.
   - This shifts the cursor forward by one node. Subsequent elements, registers, and event listeners (`onclick`) become bound to the wrong DOM nodes.

---

## Recommended Patterns and Solutions

To maintain 1-to-1 parity between bytecode text instructions and DOM text nodes during hydration, use one of the following three patterns:

### Pattern A: Derived Computed Label (Recommended)

Compute the label as a single reactive derived variable:

```html
<script>
  let count = 0;
  let step = 1;
  const decLabel = derive(() => '- ' + step);
  const incLabel = derive(() => '+ ' + step);

  function decrement() {
    count = count - step;
  }
</script>

<button class="btn" onclick={decrement}>{decLabel}</button>
```

* **Why it works:** Exactly one `INTERPOLATE_TEXT` instruction is emitted, matching the single DOM `TextNode` parsed by the browser.

### Pattern B: Template Expression Concatenation

Combine the static prefix and dynamic state inside a single interpolation:

```html
<button class="btn" onclick={decrement}>{'- ' + step}</button>
```

* **Why it works:** The compiler evaluates the entire expression in a single `INTERPOLATE_TEXT` instruction, creating exactly one text node.

### Pattern C: Separate Child Element Tags

If you need distinct semantic or styling hooks, separate the static and dynamic text into their own element tags:

```html
<button class="btn" onclick={decrement}>
  <span class="btn-prefix">-</span>
  <span class="btn-value">{step}</span>
</button>
```

* **Why it works:** Each text node is enclosed in its own DOM element, preventing the browser HTML parser from collapsing them into one.

---

## Future Roadmap Note

> **Current Version Note:**
> This authoring convention applies **as of now only** in current DriftJS versions (v0.0.x).
> 
> Future versions of the DriftJS compiler and SSR serializer are planned to handle this automatically:
> 1. **Automatic Compile-Time Text Coalescing:** The AOT transformer will automatically fuse adjacent static text and interpolations into a single concatenated expression during compilation.
> 2. **SSR Boundary Delimiters:** The SSR serializer may insert lightweight comment delimiters (`<!-- -->`) between adjacent text nodes to instruct the browser parser not to merge them.
> 
> Until these automated compiler features are released in an upcoming version, adopting the derived label or single-expression pattern ensures reliable hydration.
