import { defineConfig } from 'driftjs-ssg';

export default defineConfig({
  site: 'https://driftjs.dev',
  base: '/',
  trailingSlash: 'always',
  sitemap: true,
  robots: true,
  head: {
    title: 'DriftJS - High-Performance Register VM UI Engine & AOT Compiler',
    links: [
      { rel: 'stylesheet', href: '/styles.css' },
    ],
  },
});
