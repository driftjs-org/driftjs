---
title: "Configuration Reference"
description: "Complete options reference for drift.config.js in Drift Static."
---

# Configuration Reference

Configure Drift Static by creating a `drift.config.js` or `drift.config.ts` file in your project root:

```js
import { defineConfig } from 'driftjs-ssg';

export default defineConfig({
  site: 'https://driftjs.org',
  base: '/',
  trailingSlash: 'always',
  // ...options
});
```

---

## Configuration Options

### Site URL Option
* **Type:** `string | undefined`
* **Default:** `undefined`
* **Description:** The production canonical base URL of your site (e.g. `'https://driftjs.org'`). When defined, automated sitemap and robots generation are enabled by default.

### Base Path Option
* **Type:** `string`
* **Default:** `'/'`
* **Description:** Base URL path prefix for deployments located in a sub-path (e.g. `'/docs/'`).

### Pages Directory Option
* **Type:** `string`
* **Default:** `'src/pages'` (falls back to `'pages'`)
* **Description:** Path to the directory containing page routes and layouts.

### Content Directory Option
* **Type:** `string`
* **Default:** `'src/content'` (falls back to `'content'`)
* **Description:** Path to the directory containing markdown content collections.

### Output Directory Option
* **Type:** `string`
* **Default:** `'dist'`
* **Description:** Destination directory where generated HTML files and bundled assets will be emitted.

### Public Directory Option
* **Type:** `string`
* **Default:** `'public'`
* **Description:** Static asset directory whose contents are copied verbatim to `outDir`.

### Trailing Slash Option
* **Type:** `'always' | 'never' | 'ignore'`
* **Default:** `'always'`
* **Description:** Controls URL trailing slash behavior:
  * `'always'`: `/about` &rarr; `dist/about/index.html`
  * `'never'`: `/about` &rarr; `dist/about.html`
  * `'ignore'`: Same as `'always'`

### Default Island Trigger Option
* **Type:** `'eager' | 'idle' | 'visible' | 'interaction' | 'media'`
* **Default:** `'idle'`
* **Description:** Default hydration trigger for islands that do not specify an explicit `client:*` directive.

### Sitemap Generation Option
* **Type:** `boolean`
* **Default:** `true` (if `site` is set)
* **Description:** Whether to automatically generate `sitemap.xml`.

### Robots Text Option
* **Type:** `boolean`
* **Default:** `true` (if `site` is set)
* **Description:** Whether to automatically generate `robots.txt`.

### Document Head Option
* **Type:** `HeadConfig | undefined`
* **Description:** Global metadata injected into the `<head>` of all rendered pages:
  ```js
  head: {
    title: 'My Project',
    meta: [
      { charset: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'description', content: 'Project description' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }
  ```

### Vite Passthrough Options
* **Type:** `ViteUserConfig | undefined`
* **Description:** Custom Vite configuration overrides passed to the internal Vite instance during server rendering and island bundling.
