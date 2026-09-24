import fs from 'node:fs';
import { compile as compilePathToRegexp } from 'path-to-regexp';
import { compile, type CompiledModule } from 'driftjs-compiler';
import { evaluateExpression } from 'driftjs-shared';
import type { RouteRecord, RouteParams } from '../types/index.js';
import { normalizePath } from './router.js';

export interface StaticPathResult {
  params: RouteParams;
  props?: Record<string, any>;
}

export interface ResolvedRoutePath {
  route: RouteRecord;
  pathname: string;
  params: RouteParams;
  props: Record<string, any>;
}

/**
 * Replaces route parameter tokens (:param, :param(.*)) with concrete values.
 */
export function interpolatePath(pattern: string, params: RouteParams): string {
  try {
    const toPath = compilePathToRegexp(pattern, {
      encode: (val: string) => String(val).split('/').map(encodeURIComponent).join('/'),
      validate: false,
    });
    const formattedParams: Record<string, any> = {};

    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) {
        formattedParams[k] = v.join('/');
      } else {
        formattedParams[k] = v;
      }
    }

    return normalizePath(toPath(formattedParams));
  } catch {
    // Fallback simple replacement
    let res = pattern;
    for (const [k, v] of Object.entries(params)) {
      const valStr = Array.isArray(v) ? v.join('/') : String(v);
      res = res.replace(`:${k}(.*)`, valStr).replace(`:${k}`, valStr);
    }
    return normalizePath(res);
  }
}

/**
 * Validates that all required parameters in the route pattern exist in params.
 */
export function validateParams(route: RouteRecord, params: RouteParams): void {
  for (const param of route.paramNames) {
    if (params[param] === undefined || params[param] === null) {
      throw new Error(
        `Route "${route.id}" (${route.filePath}) requires parameter "${param}", but it was not returned by getStaticPaths().`
      );
    }
  }
}

/**
 * Extracts and invokes getStaticPaths() from a compiled Drift module or source file.
 */
export async function extractStaticPaths(
  route: RouteRecord,
  moduleOrCompiled?: CompiledModule | any
): Promise<StaticPathResult[]> {
  let mod = moduleOrCompiled;

  if (!mod && fs.existsSync(route.filePath)) {
    const content = fs.readFileSync(route.filePath, 'utf8');
    if (route.filePath.endsWith('.drift')) {
      mod = compile(content);
    }
  }

  if (!mod) {
    throw new Error(`Unable to load module for route ${route.filePath}`);
  }

  let fn: any = null;

  if (typeof mod.getStaticPaths === 'function') {
    fn = mod.getStaticPaths;
  } else if (mod.scope && typeof mod.scope.getStaticPaths === 'function') {
    fn = mod.scope.getStaticPaths;
  } else if (mod.bytecode && mod.constants) {
    const scope: Record<string, any> = { ...mod.scope };
    const declaredVars = new Set<string>(mod.declaredVars ?? []);
    for (const c of mod.constants) {
      if (c && typeof c === 'object' && ('type' in c || Array.isArray(c))) {
        try {
          if (Array.isArray(c)) {
            for (const stmt of c) {
              if (stmt && typeof stmt === 'object' && 'type' in stmt) {
                evaluateExpression(stmt, scope, declaredVars);
              }
            }
          } else {
            evaluateExpression(c, scope, declaredVars);
          }
        } catch {
          // ignore expression evaluations that are not script blocks
        }
      }
    }
    if (typeof scope.getStaticPaths === 'function') {
      fn = scope.getStaticPaths;
    }
  }

  if (!fn || typeof fn !== 'function') {
    throw new Error(
      `Route "${route.id}" (${route.filePath}) is dynamic (${route.pattern}) but does not export a getStaticPaths() function.`
    );
  }

  const result = await fn();
  if (!Array.isArray(result)) {
    throw new Error(
      `getStaticPaths() in "${route.filePath}" must return an Array of path objects ({ params: {...}, props?: {...} }).`
    );
  }

  return result;
}

/**
 * Resolves all concrete URL paths for a given list of RouteRecords.
 */
export async function resolveAllRoutePaths(
  routes: RouteRecord[],
  moduleLoader?: (route: RouteRecord) => Promise<any>
): Promise<ResolvedRoutePath[]> {
  const resolvedList: ResolvedRoutePath[] = [];

  for (const route of routes) {
    if (route.type === 'static' || route.type === '404') {
      resolvedList.push({
        route,
        pathname: route.pattern,
        params: {},
        props: {},
      });
      continue;
    }

    if (route.type === 'dynamic' || route.type === 'catch-all') {
      const mod = moduleLoader ? await moduleLoader(route) : undefined;
      const staticPaths = await extractStaticPaths(route, mod);

      for (const sp of staticPaths) {
        validateParams(route, sp.params);
        const pathname = interpolatePath(route.pattern, sp.params);
        resolvedList.push({
          route,
          pathname,
          params: sp.params,
          props: sp.props || {},
        });
      }
    }
  }

  return resolvedList;
}
