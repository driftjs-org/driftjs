# DriftJS Hacker News Clone (SSR + Hydration)

An authentic Hacker News application built with **DriftJS**, showcasing server-side rendering (`driftjs-ssr`) and instant client-side hydration (`driftjs-dom`).

---

## ⚡ Features Demonstrated

1. **Server-Side Rendering (`driftjs-ssr`)**:
   - The Node.js server executes compiled `.drift` bytecode headlessly using `renderToString(App, { scope })`.
   - Generates fully populated HTML with virtual comment delimiters (`<!--for-->`, `<!--if-->`) for SEO and instant First Contentful Paint (FCP).

2. **Client-Side Hydration (`driftjs-dom`)**:
   - The browser client reads `window.__INITIAL_DATA__` and calls `hydrate(App, root, { scope })`.
   - Drift's `HydrationCursor` walks the existing server DOM using a native `TreeWalker`, claims matching nodes, attaches event handlers, and activates reactivity without destroying or recreating DOM nodes.

3. **Keyed LIS Reconciliation (`@for`)**:
   - Upvoting increments scores in-place.
   - Expandable comment threads with nested comment replies.
   - Dynamic story pagination ("More...").

4. **Dual Execution Modes**:
   - **`pnpm serve`**: Full SSR with Vite middleware + client hydration.
   - **`pnpm dev`**: Pure client-side development server with instant HMR.

---

## 🏃 Running Locally

```bash
# Full SSR + Hydration Server (Port 3004)
pnpm --filter driftjs-example-hackernews serve

# Or Pure Client-Side Dev Server (Vite)
pnpm --filter driftjs-example-hackernews dev

# Build for Production
pnpm --filter driftjs-example-hackernews build
```
