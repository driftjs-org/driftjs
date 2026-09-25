import { describe, it, expect } from 'vitest';
import { interpolatePath, validateParams, resolveAllRoutePaths, extractStaticPaths } from '../src/index.js';
import type { RouteRecord } from '../types/index.js';

describe('Drift SSG Dynamic Paths Resolver', () => {
  it('interpolates route patterns with single and catch-all parameters', () => {
    expect(interpolatePath('/blog/:slug', { slug: 'drift-v1' })).toBe('/blog/drift-v1');
    expect(interpolatePath('/docs/:slug(.*)', { slug: ['intro', 'setup'] })).toBe('/docs/intro/setup');
    expect(interpolatePath('/users/:id/posts/:postId', { id: '42', postId: '100' })).toBe('/users/42/posts/100');
  });

  it('validates that required parameters are present', () => {
    const route: RouteRecord = {
      id: 'blog/[slug]',
      pattern: '/blog/:slug',
      filePath: '/pages/blog/[slug].drift',
      type: 'dynamic',
      paramNames: ['slug'],
      isCatchAll: false,
      layouts: [],
    };

    expect(() => validateParams(route, { slug: 'valid' })).not.toThrow();
    expect(() => validateParams(route, {})).toThrow('requires parameter "slug"');
  });

  it('extracts static paths from mock module exporting getStaticPaths', async () => {
    const route: RouteRecord = {
      id: 'blog/[slug]',
      pattern: '/blog/:slug',
      filePath: '/mock/blog/[slug].drift',
      type: 'dynamic',
      paramNames: ['slug'],
      isCatchAll: false,
      layouts: [],
    };

    const mockModule = {
      getStaticPaths: async () => [
        { params: { slug: 'post-1' }, props: { title: 'First Post' } },
        { params: { slug: 'post-2' }, props: { title: 'Second Post' } },
      ],
    };

    const paths = await extractStaticPaths(route, mockModule);
    expect(paths.length).toBe(2);
    expect(paths[0]?.params).toEqual({ slug: 'post-1' });
    expect(paths[0]?.props).toEqual({ title: 'First Post' });
  });

  it('resolves all concrete routes combining static and dynamic paths', async () => {
    const routes: RouteRecord[] = [
      {
        id: 'index',
        pattern: '/',
        filePath: '/pages/index.drift',
        type: 'static',
        paramNames: [],
        isCatchAll: false,
        layouts: [],
      },
      {
        id: 'blog/[slug]',
        pattern: '/blog/:slug',
        filePath: '/pages/blog/[slug].drift',
        type: 'dynamic',
        paramNames: ['slug'],
        isCatchAll: false,
        layouts: [],
      },
    ];

    const mockLoader = async (route: RouteRecord) => {
      if (route.id === 'blog/[slug]') {
        return {
          getStaticPaths: async () => [
            { params: { slug: 'alpha' } },
            { params: { slug: 'beta' } },
          ],
        };
      }
      return {};
    };

    const resolved = await resolveAllRoutePaths(routes, mockLoader);
    expect(resolved.length).toBe(3);
    expect(resolved.map((r) => r.pathname)).toEqual(['/', '/blog/alpha', '/blog/beta']);
  });
});
