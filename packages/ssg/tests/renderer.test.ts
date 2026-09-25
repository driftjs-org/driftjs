import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderPage, renderLayout } from '../src/index.js';
import type { RouteRecord } from '../types/index.js';

describe('Drift SSG Page Renderer & Nested Layout Composition', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-ssg-renderer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('renders a layout and injects child HTML where {children} is placed', async () => {
    const layoutPath = path.join(tmpDir, '_layout.drift');
    fs.writeFileSync(
      layoutPath,
      `<div class="app-layout"><header>My App</header><main>{children}</main></div>`
    );

    const childHtml = `<section class="content"><h1>Welcome</h1></section>`;
    const composed = await renderLayout(layoutPath, childHtml);

    expect(composed).toContain('<div class="app-layout"><header>My App</header><main><section class="content"><h1>Welcome</h1></section></main></div>');
  });

  it('renders nested layout hierarchy (root layout -> sub-layout -> page content)', async () => {
    const rootLayoutPath = path.join(tmpDir, 'root_layout.drift');
    fs.writeFileSync(
      rootLayoutPath,
      `<div id="root"><nav>Global Nav</nav>{children}</div>`
    );

    const blogLayoutPath = path.join(tmpDir, 'blog_layout.drift');
    fs.writeFileSync(
      blogLayoutPath,
      `<article class="blog-container"><aside>Sidebar</aside>{children}</article>`
    );

    const pagePath = path.join(tmpDir, 'page.drift');
    fs.writeFileSync(
      pagePath,
      `<h1>Hello Nested Layouts</h1>`
    );

    const route: RouteRecord = {
      id: 'blog/test',
      pattern: '/blog/test',
      filePath: pagePath,
      type: 'static',
      paramNames: [],
      isCatchAll: false,
      layouts: [rootLayoutPath, blogLayoutPath],
    };

    const res = await renderPage({
      route,
      pathname: '/blog/test',
      params: {},
      props: {},
    });

    expect(res.html).toContain('<!DOCTYPE html>');
    expect(res.html).toContain('<div id="root">');
    expect(res.html).toContain('<article class="blog-container">');
    expect(res.html).toContain('<h1>Hello Nested Layouts</h1>');
  });

  it('renders markdown pages through layout hierarchy and extracts frontmatter title', async () => {
    const rootLayoutPath = path.join(tmpDir, 'root_layout.drift');
    fs.writeFileSync(
      rootLayoutPath,
      `<div class="site"><header>Header</header>{children}</div>`
    );

    const mdPath = path.join(tmpDir, 'post.md');
    fs.writeFileSync(
      mdPath,
      `---
title: "My Markdown Blog Post"
---
# Hello Markdown World

This is a post.
`
    );

    const route: RouteRecord = {
      id: 'post',
      pattern: '/post',
      filePath: mdPath,
      type: 'static',
      paramNames: [],
      isCatchAll: false,
      layouts: [rootLayoutPath],
    };

    const res = await renderPage({
      route,
      pathname: '/post',
      params: {},
      props: {},
    });

    expect(res.title).toBe('My Markdown Blog Post');
    expect(res.html).toContain('<title>My Markdown Blog Post</title>');
    expect(res.html).toContain('<div class="site">');
    expect(res.html).toContain('<h1 id="hello-markdown-world">Hello Markdown World</h1>');
  });
});
