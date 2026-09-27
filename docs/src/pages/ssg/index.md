---
title: "Drift Static (SSG) Meta-Framework"
description: "Zero-JS by default static site generation and Islands Architecture for DriftJS."
---

# Drift Static (SSG) Meta-Framework

Drift Static (`driftjs-ssg`) is the official static site generation meta-framework for DriftJS. It combines the speed of pre-rendered static HTML with selective client-side hydration via **Islands Architecture**.

---

## Core Principles

1. **Zero-JS by Default:** Pages authored in `.drift` and `.md` are pre-rendered into pure semantic HTML with **zero client JavaScript** overhead.
2. **Selective Islands Hydration:** Add interactivity only where needed using client directives (`client:load`, `client:idle`, `client:visible`, `client:interaction`, `client:media`).
3. **File-System Routing:** Structure your URLs naturally using directories, `.drift` components, and Markdown files in `src/pages/`.
4. **Hierarchical Nested Layouts:** Compose layouts (`_layout.drift`) hierarchically from root to subdirectories.
5. **Content Collections:** First-class Markdown content management with YAML frontmatter and table of contents generation.
6. **Automatic SEO:** Automated `sitemap.xml`, `robots.txt`, and canonical head tag generation.

---

## Topics in this Section

* [**Framework Overview**](/ssg/overview/): The build pipeline, static rendering, and Vite integration.
* [**Islands Architecture**](/ssg/islands/): Deep dive into partial hydration and hydration trigger strategies.
* [**Routing & Layouts**](/ssg/routing-and-layouts/): File-system router, nested layouts, dynamic routes `[slug]`, and `getStaticPaths`.
* [**Content Collections**](/ssg/content-collections/): Markdown engine, frontmatter schemas, `getCollection`, and `getEntry`.
* [**Configuration Guide**](/ssg/configuration/): Complete reference for `drift.config.js`.
