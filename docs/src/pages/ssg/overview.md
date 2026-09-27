---
title: "Drift Static Framework Overview"
description: "How the static site generation pipeline builds, renders, and bundles DriftJS applications."
---

# Drift Static Framework Overview

Drift Static combines an AOT compiler, headless server virtual machine (`DriftServerVM`), and Vite bundler to produce production-ready static sites.

---

## The Build Pipeline

When you run `drift-ssg build` (or invoke `build()` programmatically), the framework executes eight discrete phases:

```
1. Configuration Loading
   ├── Resolves drift.config.js / ts
   └── Merges defaults (pagesDir, outDir, site, base, head)
            │
            ▼
2. Route Discovery (scanRoutes)
   ├── Scans pages directory for .drift and .md files
   └── Builds hierarchical layout chains (_layout.drift)
            │
            ▼
3. Path Resolution (resolveAllRoutePaths)
   ├── Resolves static routes (index, about, etc.)
   └── Calls getStaticPaths() on dynamic routes ([slug], [...slug])
            │
            ▼
4. Island & Style Discovery
   ├── Scans templates for elements with client:* directives
   └── Extracts CSS import specifiers from <script> blocks
            │
            ▼
5. Island & CSS Bundling (bundleIslands via Vite)
   ├── Emits minified island entry points (islands-[hash].js)
   └── Compiles and hashes site styles (styles-[hash].css)
            │
            ▼
6. Page Pre-Rendering (renderPage)
   ├── Executes DriftServerVM for each concrete path
   ├── Composes nested layout hierarchy
   └── Injects head metadata and island script tags only where needed
            │
            ▼
7. Static Asset Copying
   └── Copies public/ directory files directly to outDir
            │
            ▼
8. SEO Generation
   ├── Emits sitemap.xml with canonical site URLs
   └── Emits robots.txt
```

---

## Zero-JS by Default

In traditional SSR frameworks (Next.js, Nuxt), even a completely static page ships hundreds of kilobytes of runtime JavaScript to re-hydrate the DOM on the client.

In Drift Static:
* If a page contains no interactive islands, **0 script tags are injected into the HTML**.
* The page loads with instantaneous First Contentful Paint (FCP) and optimal Lighthouse scores.
* Interactive islands bundle only their own component dependencies and the lightweight `hydrateIslands()` runtime.

---

## Development Server

Start the dev server with on-demand SSG and instant Hot Module Replacement:

```bash
drift-ssg dev --port 3000
```

When you edit `.drift` components or `.md` files, the server invalidates modules and updates your browser immediately.
