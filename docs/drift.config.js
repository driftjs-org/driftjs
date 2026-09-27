/** @type {import('driftjs-ssg').UserConfig} */
export default {
  site: 'https://driftjs.org',
  base: '/',
  trailingSlash: 'always',
  pagesDir: 'src/pages',
  contentDir: 'src/content',
  outDir: 'dist',
  publicDir: 'public',
  sitemap: true,
  robots: true,
  defaultIslandTrigger: 'idle',
  head: {
    title: 'DriftJS — Register VM Reactivity Engine & AOT Compiler',
    meta: [
      { charset: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'description', content: 'DriftJS is a high-performance register VM-based reactivity engine and AOT compiler for modern web applications and static sites.' },
      { name: 'keywords', content: 'driftjs, register-vm, reactivity, compiler, virtual-machine, ssg, islands-architecture, high-performance' },
      { name: 'theme-color', content: '#090d16' },
      { property: 'og:title', content: 'DriftJS — Register VM Reactivity Engine & AOT Compiler' },
      { property: 'og:description', content: 'Explore the next-generation register VM reactivity engine and AOT compiler replacing VDOM diffing and Proxies.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://driftjs.org/' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'DriftJS — Register VM Reactivity Engine & AOT Compiler' },
      { name: 'twitter:description', content: 'Ultra-fast register VM reactivity engine and AOT compiler for the modern web.' }
    ],
    links: [
      { rel: 'icon', href: '/favicon.png', type: 'image/png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap' }
    ]
  }
};
