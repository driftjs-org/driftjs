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
