import fs from 'node:fs';
import path from 'node:path';
import { pathToRegexp, match as createPathMatch, type Key } from 'path-to-regexp';
import type { RouteRecord, RouteType, MatchedRoute, RouteParams } from '../types/index.js';

export interface ScanResult {
  routes: RouteRecord[];
  layouts: Map<string, string>;
  document?: string;
  notFound?: RouteRecord;
}

/**
 * Normalizes a URL path string: removes redundant slashes, ensures leading slash, trims trailing slash.
 */
export function normalizePath(p: string): string {
  if (!p || p === '/') return '/';
  let clean = p.replace(/\/+/g, '/');
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean.startsWith('/') ? clean : `/${clean}`;
}

/**
 * Converts a filesystem relative path into a normalized route pattern and metadata.
 * Example: 'blog/[slug].drift' -> { pattern: '/blog/:slug', paramNames: ['slug'], isCatchAll: false }
 */
export function parseRoutePath(relPath: string): {
  id: string;
  pattern: string;
  type: RouteType;
  paramNames: string[];
  isCatchAll: boolean;
} {
  const parsed = path.parse(relPath);
  const dir = parsed.dir ? parsed.dir.split(path.sep) : [];
  const name = parsed.name;

  if (name === '_document') {
    return {
      id: relPath,
      pattern: '',
      type: 'document',
      paramNames: [],
      isCatchAll: false,
    };
  }

  if (name === '_layout') {
    return {
      id: relPath,
      pattern: '',
      type: 'layout',
      paramNames: [],
      isCatchAll: false,
    };
  }

  if (name === '404') {
    return {
      id: '404',
      pattern: '/404',
      type: '404',
      paramNames: [],
      isCatchAll: false,
    };
  }

  const segments = [...dir];
  if (name !== 'index') {
    segments.push(name);
  }

  const paramNames: string[] = [];
  let isCatchAll = false;
  let isDynamic = false;

  const patternSegments = segments.map((seg) => {
    // Catch-all: [...slug]
    if (seg.startsWith('[...') && seg.endsWith(']')) {
      const param = seg.slice(4, -1);
      paramNames.push(param);
      isCatchAll = true;
      isDynamic = true;
      return `:${param}(.*)`;
    }
    // Dynamic single segment: [slug]
    if (seg.startsWith('[') && seg.endsWith(']')) {
      const param = seg.slice(1, -1);
      paramNames.push(param);
      isDynamic = true;
      return `:${param}`;
    }
    return seg;
  });

  const pattern = normalizePath('/' + patternSegments.join('/'));
  const id = segments.join('/') || 'index';
  const type: RouteType = isCatchAll ? 'catch-all' : isDynamic ? 'dynamic' : 'static';

  return {
    id,
    pattern,
    type,
    paramNames,
    isCatchAll,
  };
}

/**
 * Scans pagesDir recursively to discover routes, layouts, and document template.
 */
export function scanRoutes(pagesDir: string): ScanResult {
  const routes: RouteRecord[] = [];
  const layoutsByDir = new Map<string, string>();
  let documentPath: string | undefined;
  let notFoundRoute: RouteRecord | undefined;

  if (!fs.existsSync(pagesDir)) {
    return { routes, layouts: layoutsByDir };
  }

  // 1. Discover all layouts and document
  function discoverLayouts(currentDir: string, relDir: string = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        discoverLayouts(fullPath, path.join(relDir, entry.name));
      } else if (entry.isFile()) {
        if (entry.name === '_layout.drift') {
          layoutsByDir.set(relDir, fullPath);
        } else if (entry.name === '_document.drift' && relDir === '') {
          documentPath = fullPath;
        }
      }
    }
  }
  discoverLayouts(pagesDir);

  // 2. Discover routes and assign inherited layouts
  function discoverRoutes(currentDir: string, relDir: string = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.join(relDir, entry.name);

      if (entry.isDirectory()) {
        discoverRoutes(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (ext !== '.drift' && ext !== '.md') continue;

        const parsed = parseRoutePath(relPath);
        if (parsed.type === 'layout' || parsed.type === 'document') {
          continue;
        }

        // Collect all enclosing layouts from root to this directory
        const routeLayouts: string[] = [];
        const parts = relDir ? relDir.split(path.sep) : [];
        let cur = '';
        const rootLayout = layoutsByDir.get('');
        if (rootLayout) routeLayouts.push(rootLayout);

        for (const part of parts) {
          cur = cur ? path.join(cur, part) : part;
          const layout = layoutsByDir.get(cur);
          if (layout && !routeLayouts.includes(layout)) {
            routeLayouts.push(layout);
          }
        }

        const route: RouteRecord = {
          id: parsed.id,
          pattern: parsed.pattern,
          filePath: fullPath,
          type: parsed.type,
          paramNames: parsed.paramNames,
          isCatchAll: parsed.isCatchAll,
          layouts: routeLayouts,
        };

        if (parsed.type === '404') {
          notFoundRoute = route;
        } else {
          routes.push(route);
        }
      }
    }
  }
  discoverRoutes(pagesDir);

  // Sort routes by specificity:
  // Static routes first, dynamic routes next, catch-all last
  routes.sort((a, b) => {
    if (a.type === 'static' && b.type !== 'static') return -1;
    if (a.type !== 'static' && b.type === 'static') return 1;
    if (a.type === 'dynamic' && b.type === 'catch-all') return -1;
    if (a.type === 'catch-all' && b.type === 'dynamic') return 1;
    return b.pattern.length - a.pattern.length;
  });

  return {
    routes,
    layouts: layoutsByDir,
    document: documentPath,
    notFound: notFoundRoute,
  };
}

/**
 * Matches a request pathname against a list of RouteRecords using path-to-regexp.
 */
export function matchRoute(routes: RouteRecord[], pathname: string): MatchedRoute | null {
  const normPath = normalizePath(pathname);

  for (const route of routes) {
    try {
      const matcher = createPathMatch(route.pattern, { decode: decodeURIComponent, end: true });
      const matched = matcher(normPath);
      if (matched) {
        const rawParams = (matched.params || {}) as Record<string, any>;
        const params: RouteParams = {};

        for (const [k, v] of Object.entries(rawParams)) {
          if (route.isCatchAll && typeof v === 'string') {
            params[k] = v.split('/').filter(Boolean);
          } else {
            params[k] = v;
          }
        }

        return {
          route,
          params,
          pathname: normPath,
        };
      }
    } catch {
      // Fallback exact match
      if (route.pattern === normPath) {
        return {
          route,
          params: {},
          pathname: normPath,
        };
      }
    }
  }

  return null;
}
