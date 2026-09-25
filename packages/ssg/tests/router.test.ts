import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseRoutePath, scanRoutes, matchRoute, normalizePath } from '../src/index.js';

describe('Drift SSG File-System Router', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-ssg-router-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('parseRoutePath', () => {
    it('parses index route', () => {
      const res = parseRoutePath('index.drift');
      expect(res.pattern).toBe('/');
      expect(res.type).toBe('static');
      expect(res.paramNames).toEqual([]);
      expect(res.isCatchAll).toBe(false);
    });

    it('parses static page route', () => {
      const res = parseRoutePath('about.drift');
      expect(res.pattern).toBe('/about');
      expect(res.type).toBe('static');
    });

    it('parses nested index route', () => {
      const res = parseRoutePath('blog/index.drift');
      expect(res.pattern).toBe('/blog');
      expect(res.type).toBe('static');
    });

    it('parses dynamic parameterized route [slug]', () => {
      const res = parseRoutePath('blog/[slug].drift');
      expect(res.pattern).toBe('/blog/:slug');
      expect(res.type).toBe('dynamic');
      expect(res.paramNames).toEqual(['slug']);
      expect(res.isCatchAll).toBe(false);
    });

    it('parses catch-all route [...slug]', () => {
      const res = parseRoutePath('docs/[...slug].drift');
      expect(res.pattern).toBe('/docs/:slug(.*)');
      expect(res.type).toBe('catch-all');
      expect(res.paramNames).toEqual(['slug']);
      expect(res.isCatchAll).toBe(true);
    });

    it('parses 404 route', () => {
      const res = parseRoutePath('404.drift');
      expect(res.pattern).toBe('/404');
      expect(res.type).toBe('404');
    });

    it('identifies _layout and _document as non-page components', () => {
      expect(parseRoutePath('_layout.drift').type).toBe('layout');
      expect(parseRoutePath('_document.drift').type).toBe('document');
    });
  });

  describe('scanRoutes & layout inheritance', () => {
    it('discovers routes and builds hierarchical layout chains', () => {
      // Create directory structure:
      // pages/
      // ├── _layout.drift
      // ├── index.drift
      // ├── about.drift
      // └── blog/
      //     ├── _layout.drift
      //     ├── index.drift
      //     └── [slug].drift
      fs.writeFileSync(path.join(tmpDir, '_layout.drift'), '<div>Root Layout {children}</div>');
      fs.writeFileSync(path.join(tmpDir, 'index.drift'), '<h1>Home</h1>');
      fs.writeFileSync(path.join(tmpDir, 'about.drift'), '<h1>About</h1>');

      const blogDir = path.join(tmpDir, 'blog');
      fs.mkdirSync(blogDir);
      fs.writeFileSync(path.join(blogDir, '_layout.drift'), '<div>Blog Layout {children}</div>');
      fs.writeFileSync(path.join(blogDir, 'index.drift'), '<h1>Blog Index</h1>');
      fs.writeFileSync(path.join(blogDir, '[slug].drift'), '<h1>Post</h1>');

      const { routes, layouts } = scanRoutes(tmpDir);

      expect(routes.length).toBe(4);
      expect(layouts.size).toBe(2);

      const homeRoute = routes.find((r) => r.pattern === '/');
      expect(homeRoute).toBeDefined();
      expect(homeRoute?.layouts).toEqual([path.join(tmpDir, '_layout.drift')]);

      const blogPostRoute = routes.find((r) => r.id === 'blog/[slug]');
      expect(blogPostRoute).toBeDefined();
      expect(blogPostRoute?.layouts).toEqual([
        path.join(tmpDir, '_layout.drift'),
        path.join(blogDir, '_layout.drift'),
      ]);
    });
  });

  describe('matchRoute with path-to-regexp', () => {
    it('matches static, dynamic, and catch-all routes correctly', () => {
      const routes = [
        {
          id: 'index',
          pattern: '/',
          filePath: '/pages/index.drift',
          type: 'static' as const,
          paramNames: [],
          isCatchAll: false,
          layouts: [],
        },
        {
          id: 'blog/[slug]',
          pattern: '/blog/:slug',
          filePath: '/pages/blog/[slug].drift',
          type: 'dynamic' as const,
          paramNames: ['slug'],
          isCatchAll: false,
          layouts: [],
        },
        {
          id: 'docs/[...slug]',
          pattern: '/docs/:slug(.*)',
          filePath: '/pages/docs/[...slug].drift',
          type: 'catch-all' as const,
          paramNames: ['slug'],
          isCatchAll: true,
          layouts: [],
        },
      ];

      // Exact match
      const m1 = matchRoute(routes, '/');
      expect(m1?.route.id).toBe('index');
      expect(m1?.params).toEqual({});

      // Dynamic parameter
      const m2 = matchRoute(routes, '/blog/hello-drift');
      expect(m2?.route.id).toBe('blog/[slug]');
      expect(m2?.params).toEqual({ slug: 'hello-drift' });

      // Catch-all
      const m3 = matchRoute(routes, '/docs/guide/getting-started');
      expect(m3?.route.id).toBe('docs/[...slug]');
      expect(m3?.params.slug).toEqual(['guide', 'getting-started']);

      // No match
      const m4 = matchRoute(routes, '/non-existent');
      expect(m4).toBeNull();
    });
  });
});
