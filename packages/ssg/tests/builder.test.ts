import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { build } from '../src/index.js';

describe('Drift SSG Production Build Pipeline', () => {
  let tmpSiteDir: string;

  beforeEach(() => {
    tmpSiteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-ssg-build-test-'));

    // Create pages directory
    const pagesDir = path.join(tmpSiteDir, 'src', 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });

    // Root layout
    fs.writeFileSync(
      path.join(pagesDir, '_layout.drift'),
      `<div class="container"><header><a href="/">Home</a> | <a href="/about">About</a></header><main>{children}</main></div>`
    );

    // Index page
    fs.writeFileSync(
      path.join(pagesDir, 'index.drift'),
      `<section><h1>Welcome to Drift Static</h1><p>High performance register VM SSG.</p></section>`
    );

    // About page (Zero-JS)
    fs.writeFileSync(
      path.join(pagesDir, 'about.drift'),
      `<section><h1>About Us</h1><p>Zero-JS static HTML page.</p></section>`
    );

    // 404 page
    fs.writeFileSync(
      path.join(pagesDir, '404.drift'),
      `<section><h1>Page Not Found</h1></section>`
    );

    // Markdown page in subfolder
    const blogDir = path.join(pagesDir, 'blog');
    fs.mkdirSync(blogDir);
    fs.writeFileSync(
      path.join(blogDir, 'welcome.md'),
      `---
title: "Welcome to our Blog"
---
# Welcome Blog Post

This is our first markdown post generated statically.
`
    );

    // Config file
    fs.writeFileSync(
      path.join(tmpSiteDir, 'drift.config.js'),
      `export default {
        site: 'https://driftjs.dev',
        trailingSlash: 'always',
      };`
    );
  });

  afterEach(() => {
    fs.rmSync(tmpSiteDir, { recursive: true, force: true });
  });

  it('runs full production build, generates HTML files, sitemap, and robots.txt with Zero-JS on static pages', async () => {
    const summary = await build({ root: tmpSiteDir, silent: true });

    expect(summary.pages.length).toBe(4); // index, about, 404, blog/welcome
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);

    const outDir = path.join(tmpSiteDir, 'dist');
    expect(fs.existsSync(outDir)).toBe(true);

    // 1. Verify index.html
    const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
    expect(indexHtml).toContain('<!DOCTYPE html>');
    expect(indexHtml).toContain('Welcome to Drift Static');
    expect(indexHtml).toContain('<div class="container">');

    // 2. Verify about/index.html (trailingSlash: 'always')
    const aboutHtml = fs.readFileSync(path.join(outDir, 'about', 'index.html'), 'utf8');
    expect(aboutHtml).toContain('About Us');
    expect(aboutHtml).toContain('Zero-JS static HTML page.');
    // Confirm 0 script tags on pure static page (Zero-JS)
    expect(aboutHtml).not.toContain('<script');

    // 3. Verify blog/welcome/index.html
    const blogHtml = fs.readFileSync(path.join(outDir, 'blog', 'welcome', 'index.html'), 'utf8');
    expect(blogHtml).toContain('<title>Welcome to our Blog</title>');
    expect(blogHtml).toContain('<h1 id="welcome-blog-post">Welcome Blog Post</h1>');

    // 4. Verify 404.html at root of outDir
    const notFoundHtml = fs.readFileSync(path.join(outDir, '404.html'), 'utf8');
    expect(notFoundHtml).toContain('Page Not Found');

    // 5. Verify sitemap.xml
    const sitemapXml = fs.readFileSync(path.join(outDir, 'sitemap.xml'), 'utf8');
    expect(sitemapXml).toContain('https://driftjs.dev');
    expect(sitemapXml).toContain('<urlset');
    expect(sitemapXml).toContain('<loc>https://driftjs.dev</loc>');
    expect(sitemapXml).toContain('<loc>https://driftjs.dev/about</loc>');

    // 6. Verify robots.txt
    const robotsTxt = fs.readFileSync(path.join(outDir, 'robots.txt'), 'utf8');
    expect(robotsTxt).toContain('User-agent: *');
    expect(robotsTxt).toContain('Sitemap: https://driftjs.dev/sitemap.xml');
  });
});
