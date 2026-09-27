---
title: "Routing and Nested Layouts"
description: "File-system based routing, nested layout inheritance, and dynamic parameters in Drift Static."
---

# Routing and Nested Layouts

Drift Static features a file-system based router. Files placed inside the `pagesDir` (`src/pages/` by default) automatically become URL routes on your website.

---

## Route File Conventions

Both `.drift` Single File Components and `.md` Markdown files are recognized as page routes:

| File Path | URL Route | Type |
| :--- | :--- | :--- |
| `src/pages/index.drift` | `/` | Root index page |
| `src/pages/about.drift` | `/about` | Static page |
| `src/pages/blog/index.drift` | `/blog` | Nested index page |
| `src/pages/blog/first-post.md` | `/blog/first-post` | Markdown page |
| `src/pages/blog/[slug].drift` | `/blog/:slug` | Dynamic route |
| `src/pages/docs/[...slug].drift` | `/docs/:slug(.*)` | Catch-all route |
| `src/pages/404.drift` | `/404` | 404 Not Found page |

---

## Nested Layout Inheritance

Layouts are defined in files named `_layout.drift`. Layouts wrap page content and are inherited hierarchically from the root directory down to subfolders:

```
src/pages/
├── _layout.drift          # 1. Global site layout (Header, Footer)
├── index.drift            # Wrapped by Root layout
├── about.drift            # Wrapped by Root layout
└── docs/
    ├── _layout.drift      # 2. Docs sub-layout (Sidebar + Content)
    ├── intro.md           # Wrapped by Docs layout -> Root layout
    └── quick-start.md     # Wrapped by Docs layout -> Root layout
```

### Layout Implementation
Inside a layout component, use `{children}` to specify where the child page or nested layout should be projected:

```html
<!-- src/pages/_layout.drift -->
<script>
  import Header from '../components/Header.drift';
  import Footer from '../components/Footer.drift';
</script>

<div class="site-container">
  <Header />
  <main class="site-main">
    {children}
  </main>
  <Footer />
</div>
```

---

## Dynamic Routes with Get Static Paths

For routes with dynamic segments (like `blog/[slug].drift` or `docs/[...slug].drift`), export a `getStaticPaths()` function from your component's `<script>`:

```html
<!-- src/pages/blog/[slug].drift -->
<script>
  export async function getStaticPaths() {
    const posts = [
      { slug: 'introducing-drift', title: 'Introducing DriftJS' },
      { slug: 'register-vm-deep-dive', title: 'Register VM Deep Dive' },
    ];

    return posts.map((post) => ({
      params: { slug: post.slug },
      props: { post },
    }));
  }
</script>

<article class="post">
  <h1>{props.post.title}</h1>
  <p>Reading slug: {params.slug}</p>
</article>
```

During the production build, `drift-ssg` executes `getStaticPaths()` to discover all concrete parameter sets and pre-renders static HTML for each one.
