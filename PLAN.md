# 🏛️ Architecture & Implementation Plan: Drift Static (driftjs-ssg)

> **SSG (Static Site Generation) Meta-Framework Powered by the DriftJS Register Virtual Machine**

---

## 📌 Executive Summary

**Drift Static (`driftjs-ssg`)** is a next-generation, content-driven Static Site Generator (SSG) and meta-framework built on top of the **DriftJS** reactive ecosystem. By combining DriftJS's **Ahead-of-Time (AOT) bytecode compiler**, its **headless server register VM (`DriftServerVM`)**, and its **selective hydration runtime (`hydrateIslands`)**, Drift Static provides an **Islands Architecture** that outputs **Zero-JS static HTML by default** while supporting fine-grained interactive islands on demand.

### 🌟 Key Value Propositions

1. **Zero-JS by Default**: If a `.drift` or `.md` page contains no interactive directives, Drift Static produces 100% pure, clean, semantic HTML with **0 bytes of client-side JavaScript**.
2. **First-Class Islands Architecture (`client:*`)**: Components marked with hydration directives (`client:load`, `client:idle`, `client:visible`, `client:interaction`, `client:media`) are automatically identified, server-rendered into placeholder containers, and selectively hydrated using `driftjs-dom`'s `HydrationCursor` and `hydrateIslands()` runtime.
3. **File-System Based Routing**: Intuitive directory structure (`pages/` or `src/pages/`) supporting static routes, nested routes, dynamic parameterized routes (`[slug].drift`), rest/catch-all routes (`[...slug].drift`), and custom 404 pages.
4. **Hierarchical Nested Layouts**: Shared layout wrappers (`_layout.drift` or `Layout.drift`) that compose child pages seamlessly through Drift's native custom component children mechanism (`{children}`).
5. **Dynamic Route Pre-rendering (`getStaticPaths`)**: Build-time static path generation for dynamic routes, with support for build-time data props and fallback behaviors.
6. **Content Collections & Markdown Pipeline**: Native Markdown (`.md`) support with YAML frontmatter parsing, automatic layout wrapping, and a type-safe `getCollection()` API for blogs, documentation, and portfolios.
7. **SEO & Metadata Engine**: Automatic `<head>` tag injection (titles, meta descriptions, OpenGraph, Twitter cards, canonical tags) along with automated `sitemap.xml` and `robots.txt` generation.
8. **Ultra-Fast Developer Experience (Vite & HMR)**: On-demand page rendering during development using Vite middleware, with instant file-system route updates and Hot Module Replacement for `.drift` SFCs and markdown files.

---

## 📐 System Architecture

### High-Level Architecture Diagram

```
                              ┌────────────────────────┐
                              │  Project File System   │
                              │  (src/pages, content)  │
                              └───────────┬────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │                                             │
                   ▼                                             ▼
       ┌────────────────────────┐                   ┌────────────────────────┐
       │   Development Server   │                   │    SSG Build Engine    │
       │  (Vite Middleware HMR) │                   │  (Production Bundler)  │
       └───────────┬────────────┘                   └────────────┬───────────┘
                   │                                             │
                   │ On-Demand                                   │ Static Loop
                   ▼                                             ▼
       ┌────────────────────────┐                   ┌────────────────────────┐
       │   FS Route Resolver    │                   │   FS Route Discovery   │
       │   & Matcher Engine     │                   │  & getStaticPaths()    │
       └───────────┬────────────┘                   └────────────┬───────────┘
                   │                                             │
                   └──────────────────────┬──────────────────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │  Page & Content Loader │
                             │ (.drift SFC, .md YAML) │
                             └────────────┬───────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │    Drift Compiler      │
                             │ (AOT Bytecode Modules) │
                             └────────────┬───────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │   DriftServerVM SSR    │
                             │ (Hierarchical Layouts) │
                             └────────────┬───────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │    Island Extractor    │
                             │   (client:* Scanner)   │
                             └────────────┬───────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     │                                         │
        [No Islands Detected]                         [Islands Detected]
                     │                                         │
                     ▼                                         ▼
         ┌───────────────────────┐                 ┌───────────────────────┐
         │     Pure Static       │                 │   Vite Island Chunk   │
         │      HTML Only        │                 │        Bundler        │
         │      (0 KB JS)        │                 │ (hydrateIslands shim) │
         └───────────┬───────────┘                 └───────────┬───────────┘
                     │                                         │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │   SEO & Head Injector  │
                             │  (sitemap, robots.txt) │
                             └────────────┬───────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │    Output Directory    │
                             │  (dist/*.html, assets) │
                             └────────────────────────┘
```

---

## 📦 Monorepo Integration & Strict Package Architecture

In strict adherence to [`AGENTS.md`](file:///home/hrutav-modha/Documents/driftjs/AGENTS.md), the new package will be located at `packages/ssg` with name `driftjs-ssg`.

### Directory Tree: `packages/ssg`

```
packages/ssg/
├── index.ts               # Package public API entry: re-exports src/ and types/
├── package.json           # Package metadata, bin entries, dependencies
├── tsconfig.json          # Strict TypeScript configuration
├── bin/
│   └── drift-ssg.js       # CLI executable entry point (# !/usr/bin/env node)
├── src/
│   ├── index.ts           # Implementation barrel export
│   ├── config.ts          # Drift SSG configuration schema and file loader
│   ├── router.ts          # File-system router, route tree builder, path matcher
│   ├── paths.ts           # Dynamic getStaticPaths() evaluator and URL generator
│   ├── content.ts         # Markdown parser, YAML frontmatter extractor, collection API
│   ├── renderer.ts        # Server rendering orchestrator with nested layout composition
│   ├── islands.ts         # Island directive scanner and data-drift-island transformer
│   ├── bundler.ts         # Vite client bundle builder for interactive islands
│   ├── head.ts            # Document head, SEO metadata, sitemap, and robots.txt generator
│   ├── builder.ts         # Production static site generation build pipeline
│   ├── server.ts          # Vite development server with route middleware and HMR
│   └── cli.ts             # CLI command handlers (dev, build, preview)
├── types/
│   ├── index.ts           # Type definitions barrel export
│   ├── config.ts          # DriftSSGConfig, UserConfig options
│   ├── router.ts          # RouteRecord, RouteNode, MatchedRoute, RouteParams
│   ├── content.ts         # ContentEntry, CollectionConfig, MarkdownRenderResult
│   ├── render.ts          # PageRenderContext, IslandDescriptor, LayoutDescriptor
│   └── build.ts           # BuildOptions, BuildSummary, PageOutput
└── tests/
    ├── router.test.ts     # FS routing, parameterized patterns, layout discovery
    ├── paths.test.ts      # getStaticPaths dynamic route resolution
    ├── content.test.ts    # Markdown parsing, frontmatter extraction, getCollection
    ├── islands.test.ts    # Island directive detection and attribute transformation
    ├── renderer.test.ts   # Nested layout composition and HTML generation
    └── builder.test.ts    # Full end-to-end SSG build pipeline test
```

---

## 🛠️ Core Subsystems & Technical Design

### 1. File-System Router & Layout Hierarchy (`src/router.ts`)

#### Route File Conventions

- `src/pages/index.drift` ➔ `/`
- `src/pages/about.drift` ➔ `/about/`
- `src/pages/blog/index.drift` ➔ `/blog/`
- `src/pages/blog/[slug].drift` ➔ `/blog/:slug/` (dynamic parameter)
- `src/pages/docs/[...slug].drift` ➔ `/docs/*` (catch-all / rest parameter)
- `src/pages/404.drift` ➔ `/404.html` (fallback not found)
- `src/pages/_layout.drift` ➔ Nested layout enclosing all sibling and descendant pages
- `src/pages/_document.drift` ➔ Top-level HTML shell (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`)

#### Nested Layout Composition

Layouts wrap pages in a hierarchy from outermost to innermost:

```
_document.drift
  └── _layout.drift (root layout)
        └── blog/_layout.drift (nested blog layout)
              └── blog/[slug].drift (target page content)
```

Each layout accepts `{children}` and injects the rendered child component into its template.

---

### 2. Dynamic Route Resolution (`src/paths.ts`)

For dynamic pages (e.g. `src/pages/blog/[slug].drift` or `src/pages/blog/[slug].md`), the component or module can export a `getStaticPaths()` function:

```drift
<script>
  export async function getStaticPaths() {
    return [
      { params: { slug: 'hello-world' }, props: { title: 'Hello World', views: 100 } },
      { params: { slug: 'driftjs-v1' }, props: { title: 'DriftJS v1 Released', views: 500 } },
    ];
  }

  // props are injected into page scope at build-time:
  let pageTitle = props.title;
</script>

<article>
  <h1>{pageTitle}</h1>
  <p>Views: {props.views}</p>
</article>
```

The resolver verifies that all dynamic segments in the route pattern (e.g., `slug`) are satisfied by `params`, and passes `props` directly into the page execution scope.

---

### 3. Islands Architecture & Client Hydration (`src/islands.ts`, `src/bundler.ts`)

#### Directives & Semantics

Drift Static adopts the standard `client:*` directive syntax:

- `client:load`: Hydrate immediately upon DOM ready (`trigger: 'eager'`).
- `client:idle`: Hydrate during browser idle periods (`requestIdleCallback`, `trigger: 'idle'`).
- `client:visible`: Hydrate when the island enters the viewport (`IntersectionObserver`, `trigger: 'visible'`).
- `client:interaction`: Hydrate upon first user interaction (`click`, `hover`, `focus`, `touchstart`, `trigger: 'interaction'`).
- `client:media="(max-width: 768px)"`: Hydrate when the CSS media query matches (`window.matchMedia`, `trigger: 'media'`).

#### Lexer Pre-requisite

To support attributes containing colons like `client:load` and `client:idle` in `.drift` templates, `packages/compiler/src/lexer.ts` must be updated so `isIdentifierChar` allows ASCII 58 (`:`), enabling standard XML/HTML namespace and directive attributes.

#### SSR Island Serialization (`renderIslandToString`)

In `packages/ssr/src/index.ts`, expose `renderIslandToString(islandName, component, options)`:

```html
<!-- Server-Rendered Output -->
<div data-drift-island="Counter" data-drift-trigger="idle" data-drift-props='{"initial":5}'>
  <!--comp:Counter-->
  <div class="counter">
    <button>-</button>
    <span>5</span>
    <button>+</button>
  </div>
  <!--/comp:Counter-->
</div>
```

#### Island Bundling

During the SSG build:

1. All unique island components are recorded with their file paths.
2. An ephemeral client bootstrap module is generated for the page:
   ```ts
   import { hydrateIslands } from 'driftjs-dom';
   import Counter from '/src/components/Counter.drift';
   import SearchBox from '/src/components/SearchBox.drift';

   hydrateIslands(document.body, {
     Counter,
     SearchBox,
   });
   ```
3. Vite bundles, minifies, and hashes the island script into `dist/assets/island-[hash].js`.
4. The script tag is injected into the HTML only if islands exist on that page:
   ```html
   <script type="module" src="/assets/island-a8f3b2.js"></script>
   ```

---

### 4. Content Collections & Markdown Engine (`src/content.ts`)

Drift Static provides a native content collection mechanism for Markdown-powered blogs and documentation:

```
src/content/
├── blog/
│   ├── hello-world.md
│   └── register-vm-deep-dive.md
└── docs/
    ├── introduction.md
    └── architecture.md
```

#### Frontmatter Parsing & Content Access API

```ts
import { getCollection, getEntry } from 'driftjs-ssg';

// In pages/blog/index.drift:
export async function getStaticProps() {
  const posts = await getCollection('blog', (entry) => !entry.data.draft);
  return { posts };
}
```

Each Markdown entry is processed to extract:

- `slug`: derived from filename or frontmatter override.
- `data`: strongly-typed YAML frontmatter fields (title, date, tags, author, summary, cover).
- `body`: raw markdown source string.
- `html`: compiled HTML string with auto-generated heading IDs and syntax-highlighted code blocks.

---

### 5. SEO, Head Management, & Sitemaps (`src/head.ts`)

#### Head Management

Supports declarative `<Head>` components or exported `meta` descriptors:

```drift
<Head>
  <title>DriftJS - Register VM UI Engine</title>
  <meta name="description" content="Next-generation register VM web framework." />
  <meta property="og:title" content="DriftJS" />
</Head>
```

The head collector extracts and merges `<title>`, `<meta>`, `<link>`, and `<style>` tags, deduplicating keys (e.g. `name="description"`) and hoisting them into the final document `<head>`.

#### Automatic Sitemap & Robots.txt

- When `site: 'https://driftjs.dev'` is configured in `drift.config.ts`, the SSG build automatically generates `dist/sitemap.xml` with all generated routes and lastmod timestamps.
- Generates a default or custom `dist/robots.txt` referencing the sitemap.

---

### 6. Development Server with On-Demand SSG & HMR (`src/server.ts`)

- Launches a Vite server in middleware mode.
- Intercepts incoming HTTP requests (e.g., `GET /blog/hello-world`):
  1. Matches the request path against the FS route tree.
  2. If matching a dynamic route, invokes `getStaticPaths()` on the fly.
  3. Compiles the `.drift` page and its nested `_layout.drift` chain.
  4. Renders the page via `DriftServerVM`.
  5. Injects Vite HMR client scripts and live-reloads when `.drift` or `.md` files change.
- A Chokidar / Vite FS watcher monitors `src/pages/` to update the route tree when files are created, renamed, or deleted without server restarts.

---

### 7. CLI Commands (`src/cli.ts` & `bin/drift-ssg.js`)

| Command               | Description                                                                                                                           |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `drift-ssg dev`     | Starts the interactive Vite development server with on-demand route compilation and HMR. Options:`--port <port>`, `--host`.       |
| `drift-ssg build`   | Runs the full production SSG pipeline: resolves routes, pre-renders HTML, bundles client islands, writes`dist/`, generates sitemap. |
| `drift-ssg preview` | Serves the generated`dist/` directory via a lightweight static server to preview production output. Options: `--port <port>`.     |

---

## 📋 Step-by-Step Implementation Roadmap

### Phase 1: Compiler & SSR Prerequisites

- [ ] **1.1 Lexer Attribute Colon Support (`packages/compiler/src/lexer.ts`)**:
  - Update `isIdentifierChar` to allow `:` (ASCII 58) for directive attribute names (`client:load`, `client:idle`, etc.).
  - Add test case in `packages/compiler/tests/lexer.test.ts`.
- [ ] **1.2 SSR Island Rendering API (`packages/ssr/src/index.ts`)**:
  - Implement and export `renderIslandToString(islandName, component, options)`.
  - Add test case in `packages/ssr/tests/ssr.test.ts`.

### Phase 2: Package Setup & Core Types (`packages/ssg`)

- [ ] **2.1 Package Scaffolding**:
  - Create `packages/ssg` directory structure adhering strictly to `AGENTS.md` (`index.ts`, `src/`, `types/`, `tests/`, `bin/`).
  - Configure `package.json` with dependencies (`driftjs-compiler`, `driftjs-dom`, `driftjs-ssr`, `driftjs-shared`, `driftjs-vite-plugin`, `vite`, `picocolors`).
  - Configure `tsconfig.json` with strict mode.
- [ ] **2.2 TypeScript Type Definitions (`packages/ssg/types/`)**:
  - `config.ts`: `DriftSSGConfig`, `UserConfig`.
  - `router.ts`: `RouteRecord`, `RouteNode`, `MatchedRoute`, `RouteParams`.
  - `content.ts`: `ContentEntry`, `CollectionConfig`, `MarkdownRenderResult`.
  - `render.ts`: `PageRenderContext`, `IslandDescriptor`, `LayoutDescriptor`.
  - `build.ts`: `BuildOptions`, `BuildSummary`, `PageOutput`.

### Phase 3: File-System Router & Dynamic Paths

- [ ] **3.1 FS Router Engine (`packages/ssg/src/router.ts`)**:
  - Scan `pages/` directory recursively.
  - Parse route file names (`index.drift`, `[slug].drift`, `[...slug].drift`, `_layout.drift`, `_document.drift`, `404.drift`).
  - Build hierarchical route tree and layout resolution chains.
  - Implement URL pattern matching.
- [ ] **3.2 Dynamic Path Generation (`packages/ssg/src/paths.ts`)**:
  - Load page modules and invoke `getStaticPaths()`.
  - Validate parameters and expand dynamic routes into concrete URL lists.
- [ ] **3.3 Router Test Suite (`packages/ssg/tests/router.test.ts`, `paths.test.ts`)**:
  - Unit tests for route tree construction, nested layouts, parameterized matching, and `getStaticPaths` resolution.

### Phase 4: Markdown & Content Collections Engine

- [ ] **4.1 Markdown & Frontmatter Parser (`packages/ssg/src/content.ts`)**:
  - Extract YAML frontmatter and markdown body.
  - Convert markdown text to HTML with heading anchors and code blocks.
  - Implement `getCollection(name, filter)` and `getEntry(name, slug)` APIs.
- [ ] **4.2 Content Test Suite (`packages/ssg/tests/content.test.ts`)**:
  - Verify frontmatter extraction, date parsing, collection querying, and markdown rendering.

### Phase 5: Server Rendering, Nested Layouts & Islands

- [ ] **5.1 Server Page Renderer (`packages/ssg/src/renderer.ts`)**:
  - Render page within enclosing `_layout.drift` chain passing child HTML via `{children}`.
  - Wrap output with `_document.drift` or default HTML document shell.
- [ ] **5.2 Island Directive Extraction (`packages/ssg/src/islands.ts`)**:
  - Scan AST or rendered output for `client:*` directives.
  - Transform island components into `<div data-drift-island="..." data-drift-trigger="...">` containers.
  - Collect island components and props for client bundling.
- [ ] **5.3 Island Bundler (`packages/ssg/src/bundler.ts`)**:
  - Build client island entry points with Vite programmatic API.
  - Emit hashed JS/CSS assets into `dist/assets/`.
  - Omit all scripts for pure static pages (Zero-JS).
- [ ] **5.4 Renderer Test Suite (`packages/ssg/tests/renderer.test.ts`, `islands.test.ts`)**:
  - Verify nested layout rendering, slot injection, island container transformation, and zero-JS emission.

### Phase 6: SEO, Head Collector & Build Pipeline

- [ ] **6.1 SEO & Head Injector (`packages/ssg/src/head.ts`)**:
  - Merge title, meta tags, and links into `<head>`.
  - Generate `sitemap.xml` and `robots.txt`.
- [ ] **6.2 Production SSG Builder (`packages/ssg/src/builder.ts`)**:
  - Clean `dist/`.
  - Iterate all routes, pre-render HTML, bundle assets, and copy `public/`.
  - Output summary report with file sizes and generation times.
- [ ] **6.3 Builder Test Suite (`packages/ssg/tests/builder.test.ts`)**:
  - End-to-end integration test running a full SSG build on a fixture site.

### Phase 7: Vite Dev Server & CLI

- [ ] **7.1 Vite Dev Server Middleware (`packages/ssg/src/server.ts`)**:
  - Custom connect middleware for on-demand route compilation and rendering.
  - Watch `pages/` for live route additions/removals.
- [ ] **7.2 CLI Binary & Commands (`packages/ssg/src/cli.ts`, `bin/drift-ssg.js`)**:
  - CLI runner for `dev`, `build`, and `preview`.
- [ ] **7.3 Scaffolding Integration (`packages/cli/src/index.ts`)**:
  - Add `ssg` template option in `create-drift` alongside `csr` and `ssr`.
  - Provide a starter project with blog markdown, layout, and an interactive island.

---

## 🧪 Verification & Testing Strategy

### Automated Verification

1. **Compiler Attribute Lexing**:
   ```bash
   pnpm --filter driftjs-compiler test
   ```
2. **SSR Island Rendering**:
   ```bash
   pnpm --filter driftjs-ssr test
   ```
3. **SSG Test Suite**:
   ```bash
   pnpm --filter driftjs-ssg test
   ```
4. **Monorepo Full Test Suite**:
   ```bash
   pnpm test
   ```
5. **Strict TypeScript Type Checking**:
   ```bash
   pnpm typecheck
   ```

### Manual Verification

1. Create a sample SSG fixture site in `playground/ssg-demo/`:
   - Static homepage (`pages/index.drift`).
   - Interactive counter island (`<Counter client:visible />`).
   - Markdown blog (`content/blog/*.md` + `pages/blog/[slug].drift`).
   - Nested layout (`_layout.drift`).
2. Run `pnpm drift-ssg build`.
3. Inspect `dist/`:
   - Confirm `dist/index.html` contains static HTML and island bundle.
   - Confirm pure static pages (e.g. `dist/about/index.html`) contain **0 script tags**.
   - Confirm `dist/sitemap.xml` lists all routes.
4. Run `pnpm drift-ssg preview` and test island interactivity in the browser.

---

## 💬 User Review & Design Decisions

> [!IMPORTANT]
> **Key Decisions to Confirm Before Execution:**
>
> 1. **Package Name**: Is `driftjs-ssg` (with CLI binary `drift-ssg`) the desired naming convention?
> 2. **Directive Syntax**: Do you prefer `client:load` / `client:idle` / `client:visible` (standard Astro/Islands style, requiring lexer colon support) or an alternative directive convention like `@client.load` / `client-load`? (We recommend `client:*` with lexer colon support).
> 3. **Markdown Processing**: Should Markdown parsing support standard CommonMark with YAML frontmatter, or do you have preferred Markdown plugins (e.g. syntax highlighting with Prism / Shiki)?
