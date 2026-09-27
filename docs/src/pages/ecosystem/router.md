---
title: "DriftJS Router"
description: "Client-side SPA router with HTML5 history, navigation guards, and route matching."
---

# DriftJS Router

`driftjs-router` is the official client-side Single Page Application (SPA) routing library for DriftJS. It provides route matching, parameter extraction, history modes, and navigation guards.

---

## Installation

```bash
pnpm add driftjs-router
```

---

## Basic Setup

```ts
// src/router.ts
import { createRouter, createBrowserHistory } from 'driftjs-router';
import Home from './pages/Home.drift';
import About from './pages/About.drift';
import UserProfile from './pages/UserProfile.drift';

export const router = createRouter({
  history: createBrowserHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/users/:id', component: UserProfile },
  ],
});
```

---

## History Drivers

The router supports three history drivers:

1. **`createBrowserHistory()`:** Standard HTML5 `pushState` / `popstate` history for clean URLs (e.g. `https://example.com/about`). Requires server fallback to `index.html`.
2. **`createHashHistory()`:** URL hash based history (`https://example.com/#/about`). Ideal for static hosting without server rewrite rules.
3. **`createMemoryHistory()`:** In-memory history for testing or non-browser environments.

---

## Navigation Guards

Protect routes and manage transitions using global guards:

```ts
router.beforeEach((to, from, next) => {
  if (to.meta?.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});

router.afterEach((to, from) => {
  console.log(`Navigated from ${from.path} to ${to.path}`);
});
```

---

## Programmatic Navigation

```ts
// Navigate to a new route
await router.push('/about');

// Replace current history entry
await router.replace('/dashboard');

// Go back or forward in history
router.back();
router.forward();
```
