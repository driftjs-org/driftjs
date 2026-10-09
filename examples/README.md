# DriftJS Official Examples Showcase

This directory contains official, runnable demonstration applications showcasing the features, idioms, and high-performance register VM reactivity of **DriftJS**.

---

## 🚀 Available Examples

| Example | Focus Area | Key Features Demonstrated |
| :--- | :--- | :--- |
| **[`basic`](./basic)** | Directives Sandbox | `@if / @else if / @else`, `@switch / @case / @default`, `@for`, in-place input bindings |
| **[`todomvc`](./todomvc)** | Canonical TodoMVC | Keyed LIS list reconciliation, `derive()` computed filters, inline editing, `localStorage` |
| **[`cart`](./cart)** | E-Commerce Shopping Cart | Multiple `derive()` derivations (subtotal, coupons, tax, grand total), fast-path row patching |
| **[`dashboard`](./dashboard)** | Realtime Telemetry | High-frequency timer updates (250ms), sub-components (`MetricCard.drift`), dynamic SVG trendlines & gauges |
| **[`hackernews`](./hackernews)** | Hacker News (SSR) | Full server-side rendering (`driftjs-ssr`), client hydration (`driftjs-dom`), discussion threads, upvoting |

---

## 🏃 Running the Examples

All examples are configured as independent Vite applications with the universal `driftjs-unplugin` compiler plugin.

### Run Development Servers

```bash
# Basic Directives Sandbox (Port 3000)
pnpm --filter driftjs-example-basic dev

# Canonical TodoMVC (Port 3001)
pnpm --filter driftjs-example-todomvc dev

# E-Commerce Shopping Cart (Port 3002)
pnpm --filter driftjs-example-cart dev

# Realtime Telemetry Dashboard (Port 3003)
pnpm --filter driftjs-example-dashboard dev

# Hacker News Clone with SSR + Client Hydration (Port 3004)
pnpm --filter driftjs-example-hackernews serve
```

### Production Builds

```bash
pnpm --filter driftjs-example-basic build
pnpm --filter driftjs-example-todomvc build
pnpm --filter driftjs-example-cart build
pnpm --filter driftjs-example-dashboard build
pnpm --filter driftjs-example-hackernews build
```

---

## 💡 Architecture & Best Practices Demonstrated

1. **Register VM Reactivity**:
   Instead of allocating virtual DOM trees on state mutations, DriftJS patches DOM elements in-place and anchors dynamic directive blocks between comment markers (`<!--if-->`, `<!--for-->`).

2. **Optimal Keyed Reconciliation**:
   The `@for (item in items key item.id)` directive utilizes Drift's Longest Increasing Subsequence (LIS) reconciler to perform the minimum necessary DOM moves.

3. **Fine-Grained Computed State**:
   The `derive(() => ...)` primitive automatically tracks reactive variables and lazily caches derived calculations until source dependencies change.

4. **Component Composition**:
   Single-File Components (`*.drift`) can import and compose child components, passing dynamic properties and callbacks that reactively update child scopes.
