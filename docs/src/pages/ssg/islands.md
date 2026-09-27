---
title: "Islands Architecture and Selective Hydration"
description: "Master partial hydration and client directive strategies in Drift Static."
---

# Islands Architecture and Selective Hydration

Islands Architecture describes a web architecture where independent, isolated interactive components (islands) are embedded inside an otherwise pure static HTML document.

Drift Static provides native, first-class Islands Architecture powered by `client:*` directives and `hydrateIslands()` from `driftjs-dom`.

---

## The Client Directives

DriftJS provides five fine-grained hydration strategies:

### Client Load: Eager Hydration
Hydrates the component immediately as soon as the page loads:

```html
<script>
  import NavigationBar from '../components/NavigationBar.drift';
</script>

<NavigationBar client:load />
```
* **Best for:** Critical above-the-fold interactive components (e.g. mobile navigation drawers, primary search bars).

### Client Idle: Idle Hydration
Defers hydration until the browser's main thread is idle using `requestIdleCallback()` (with fallback to `setTimeout`):

```html
<script>
  import NewsletterSignup from '../components/NewsletterSignup.drift';
</script>

<NewsletterSignup client:idle />
```
* **Best for:** Secondary components that don't need immediate responsiveness (e.g. analytics widgets, feedback forms).

### Client Visible: Viewport Intersection
Hydrates the component only when it scrolls into view using `IntersectionObserver`:

```html
<script>
  import HeavyChart from '../components/HeavyChart.drift';
</script>

<HeavyChart client:visible data={chartData} />
```
* **Best for:** Below-the-fold content, image carousels, and complex data visualizations.

### Client Interaction: User Triggered
Delays hydration until the user explicitly interacts with the element (e.g. `pointerdown`, `keydown`, or `focusin`):

```html
<script>
  import CommentsSection from '../components/CommentsSection.drift';
</script>

<CommentsSection client:interaction />
```
* **Best for:** Complex modals, expandable comment sections, or widgets the user might never open.

### Client Media: Media Query Matching
Hydrates only when a specific CSS media query condition evaluates to `true`:

```html
<script>
  import MobileDrawer from '../components/MobileDrawer.drift';
</script>

<MobileDrawer client:media="(max-width: 768px)" />
```
* **Best for:** Device-specific interactive components (e.g. mobile bottom navigation sheets that should remain dormant on desktop).

---

## How Islands Are Rendered and Hydrated

### 1. Build Phase: Scanner and Bundler
* `scanIslands` finds all `<Component client:* />` tags across your project.
* `bundleIslands` uses Vite to generate an optimized island entry bundle (`/assets/islands-[hash].js`) registering the island components with `hydrateIslands()`.

### 2. Server HTML Serialization
When `DriftServerVM` renders an island, it wraps the component's static HTML inside a container with `data-drift-*` attributes:

```html
<div
  data-drift-island="Counter"
  data-drift-trigger="visible"
  data-drift-props="{&quot;initial&quot;:10}"
>
  <button>Count: 10</button>
</div>
```

### 3. Browser Selective Hydration
When the trigger condition fires (e.g. element scrolls into view):
* `hydrateIslands()` mounts a `DriftClientVM` instance.
* The VM claims the existing server-rendered HTML nodes using `HydrationCursor`.
* Event listeners and reactive bindings are activated with zero flicker or DOM reconstruction.
