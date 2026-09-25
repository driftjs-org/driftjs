export type RouteType = 'static' | 'dynamic' | 'catch-all' | 'layout' | 'document' | '404';

export type RouteParams = Record<string, string | string[]>;

export interface RouteRecord {
  /** Unique route ID, typically relative to pagesDir (e.g. 'blog/[slug]') */
  id: string;
  /** Normalized URL pattern (e.g. '/blog/:slug') */
  pattern: string;
  /** Absolute file path on disk */
  filePath: string;
  /** Route kind */
  type: RouteType;
  /** Parameter names extracted from path (e.g. ['slug']) */
  paramNames: string[];
  /** Whether this is a catch-all route (e.g. [...slug]) */
  isCatchAll: boolean;
  /** Ordered list of layout file paths wrapping this page from outermost to innermost */
  layouts: string[];
}

export interface MatchedRoute {
  route: RouteRecord;
  params: RouteParams;
  pathname: string;
}

export interface RouteNode {
  segment: string;
  route?: RouteRecord | undefined;
  layout?: string | undefined;
  children: Map<string, RouteNode>;
}

export interface StaticPathResult {
  params: RouteParams;
  props?: Record<string, any> | undefined;
}

export interface ResolvedRoutePath {
  route: RouteRecord;
  pathname: string;
  params: RouteParams;
  props: Record<string, any>;
}

export interface RouteScanResult {
  routes: RouteRecord[];
  layouts: Map<string, string>;
  document?: string | undefined;
  notFound?: RouteRecord | undefined;
}
