---
title: Feature Implementation Roadmap
description: Upcoming features and development priorities for the DriftJS ecosystem
---

# Feature Implementation Roadmap

This document outlines completed milestones and upcoming architectural features for DriftJS.

---

## ✅ Completed Milestones

### 1. Static Site Generation (`driftjs-ssg`)
- Zero-JS static HTML by default.
- Partial hydration with Islands Architecture (`client:load`, `client:idle`, `client:visible`, `client:media`).
- File-system based routing and nested layout trees.
- Markdown content collections with frontmatter extraction and slugified headings.
- Dynamic route pre-rendering via `getStaticPaths()`.
- Built-in SEO engine (`sitemap.xml`, `robots.txt`, `<head>` injection).

### 2. Derived & Computed State (`derive()`)
- In Single File Components (`.drift`), derived reactive state is authored via `derive(expr)` or `derive(() => { ... })`.
- Lazy cached getters configured on VM `scope` with cascading invalidation.
- Zero-overhead in-place DOM updates when derived variables change.

---

## 🌊 Upcoming Priorities

### 1. Streaming SSR (`renderToReadableStream` / `pipeToNodeStream`)
- Progressive HTML streaming for server-side rendering.
- Shell delivery with immediate `<head>` rendering while asynchronous `@async` boundaries resolve.
- Compatible with Edge runtimes (Cloudflare Workers, Deno, Bun) and Node.js Streams.

### 2. Two-Way Form Binding (`@bind`)
- Syntactic sugar for input elements: `@bind value={name}`, `@bind checked={agree}`.
- Direct compiler optimization mapping input events to register updates.

### 3. Named Component Slots (`<slot name="...">`)
- Multi-slot component composition for complex layouts and design systems.
- Default fallback content for empty slots.
