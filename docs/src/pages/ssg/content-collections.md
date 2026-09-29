---
title: "Content Collections and Markdown Engine"
description: "Manage content with YAML frontmatter, Markdown parsing, and getCollection queries in Drift Static."
---
# Content Collections and Markdown Engine

Drift Static includes built-in support for authoring content in Markdown. It supports both **Direct Markdown Pages** (placing `.md` files directly in `src/pages/`) and **Structured Content Collections** in `src/content/`.

---

## 1. Direct Markdown Pages

Any `.md` file placed inside `src/pages/` becomes a static HTML page automatically:

```markdown
---
title: "About Our Project"
description: "The story behind DriftJS"
---

# About DriftJS

DriftJS was created to explore whether a register virtual machine could deliver faster, more predictable reactivity than virtual DOM diffing.

## Key Goals
* Sub-millisecond reactive updates
* Minimal heap allocation
* Zero-JS static site generation
```

* Frontmatter is parsed using `gray-matter`.
* Markdown is transformed to semantic HTML using `marked`.
* The page is seamlessly enclosed in your hierarchical `_layout.drift` chain.

---

## 2. Structured Content Collections

For blogs, documentation suites, or product catalogs, store content in categorized folders inside `src/content/`:

```
src/content/
├── blog/
│   ├── introducing-drift.md
│   └── register-vm-guide.md
└── changelog/
    ├── v0.0.15.md
    └── v0.0.16.md
```

### Querying Collections with Get Collection

Use `getCollection()` to load and filter entries from a collection:

```ts
import { getCollection } from 'driftjs-ssg';

// Load all blog posts
const allPosts = await getCollection('blog');

// Load only published posts sorted by date
const published = await getCollection('blog', (entry) => entry.data.published === true);
```

### Fetching a Single Entry with Get Entry

```ts
import { getEntry } from 'driftjs-ssg';

const post = await getEntry('blog', 'introducing-drift');
console.log(post.data.title); // Frontmatter title
console.log(post.html);       // Rendered HTML string
console.log(post.headings);   // Table of contents array
```

---

## 3. Headings Table of Contents and Anchors

The markdown renderer automatically attaches URL-friendly slug IDs to all headings:

```html
<!-- Input: ## Virtual Machine Registers -->
<h2 id="virtual-machine-registers">Virtual Machine Registers</h2>
```

Each heading entry is returned in the `headings` array:

```ts
export interface HeadingEntry {
  depth: number; // 1 to 6
  text: string;  // Heading text
  id: string;    // Anchor slug
}
```

This makes building sidebar tables of contents or anchor links effortless.

---

## 4. Live DriftJS Editor with the 'drift exe'  Fence

Any fenced code block whose header is `drift exe` is promoted from a static snippet into a **fully interactive
`DriftCodeEditor` island** — the block is compiled, mounted, and executed in the reader's browser:

The fence header is the only syntax — no extra attributes, no imports. Under the hood the markdown renderer emits an
island container that hydrates on `client:load`, and the generated island is returned in `result.islands` so the build
pipeline can bundle and register the component automatically:

```ts
const { html, islands } = renderMarkdown(source);
// islands[0] => { name: 'DriftCodeEditor', componentPath: 'driftjs-playground', trigger: 'eager', ... }
```

Height, width, and the component itself are configurable per project in `drift.config.js`:

```js
export default {
  markdown: {
    component: 'DriftCodeEditor',      // island name registered on the client
    componentPath: 'driftjs-playground', // module exporting the component
    exportName: 'DriftCodeEditor',     // named export of that module
    trigger: 'eager',                  // 'eager' (client:load) | 'idle' | 'visible' | ...
    height: '440px',
    width: '100%',
  },
};
```

Every other code fence keeps rendering as a regular static `<pre><code>` block, so pages stay **Zero-JS by default**
until you opt a snippet into interactivity.
