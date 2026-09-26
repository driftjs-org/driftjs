import { match as createPathMatch } from 'path-to-regexp';
import type { RouteRecord, MatchedRoute, RouteParams } from '../../types/index.js';
import { normalizePath } from './scanner.js';

/**
 * Matches a request pathname against a list of RouteRecords using path-to-regexp.
 */
export function matchRoute(routes: RouteRecord[], pathname: string): MatchedRoute | null {
  const normPath = normalizePath(pathname);

  for (const route of routes) {
    try {
      const matchPattern = route.pattern.replace(/:([a-zA-Z0-9_]+)\(\.\*\)/g, '*$1');
      const matcher = createPathMatch(matchPattern, { decode: decodeURIComponent, end: true });
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
