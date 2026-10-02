declare module 'driftjs-ssg' {
  import type { UserConfig as ViteUserConfig, ViteDevServer } from 'vite';
  import type http from 'node:http';
  import type { ServerNode } from 'driftjs-ssr';

  // Config Types
  export type IslandTriggerStrategy = 'eager' | 'idle' | 'visible' | 'interaction' | 'media';

  export interface DriftSSGConfig {
    root: string;
    pagesDir: string;
    contentDir: string;
    outDir: string;
    publicDir: string;
    site?: string | undefined;
    base: string;
    head?: HeadConfig | undefined;
    sitemap: boolean;
    robots: boolean;
    trailingSlash: 'always' | 'never' | 'ignore';
    defaultIslandTrigger: IslandTriggerStrategy;
    markdown?: MarkdownIslandOptions | undefined;
    vite?: ViteUserConfig | undefined;
  }

  export type UserConfig = {
    [K in keyof DriftSSGConfig]?: DriftSSGConfig[K] | undefined;
  };

  export const DEFAULT_CONFIG: DriftSSGConfig;
  export function findConfigFile(root: string): string | null;
  export function loadConfig(root?: string, configFile?: string): Promise<DriftSSGConfig>;
  export function defineConfig(config: UserConfig): UserConfig;

  // Router Types
  export type RouteType = 'static' | 'dynamic' | 'catch-all' | 'layout' | 'document' | '404';
  export type RouteParams = Record<string, string | string[]>;

  export interface RouteRecord {
    id: string;
    pattern: string;
    filePath: string;
    type: RouteType;
    paramNames: string[];
    isCatchAll: boolean;
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

  export type ScanResult = RouteScanResult;

  export function normalizePath(p: string): string;
  export function parseRoutePath(relPath: string): {
    pattern: string;
    type: RouteType;
    paramNames: string[];
    isCatchAll: boolean;
  };
  export function scanRoutes(pagesDir: string): RouteScanResult;
  export function matchRoute(routes: RouteRecord[], pathname: string): MatchedRoute | null;
  export function interpolatePath(pattern: string, params: RouteParams): string;
  export function validateParams(route: RouteRecord, params: RouteParams): void;
  export function extractStaticPaths(
    filePath: string,
    route: RouteRecord,
    moduleLoader?: (fp: string) => Promise<any>
  ): Promise<StaticPathResult[]>;
  export function resolveAllRoutePaths(
    scanResult: RouteScanResult,
    moduleLoader?: (fp: string) => Promise<any>
  ): Promise<ResolvedRoutePath[]>;

  // Content Types
  export interface HeadingEntry {
    depth: number;
    text: string;
    id: string;
  }

  export interface MarkdownIslandOptions {
    component?: string | undefined;
    componentPath?: string | undefined;
    exportName?: string | undefined;
    trigger?: IslandTriggerStrategy | undefined;
    height?: string | undefined;
    width?: string | undefined;
    props?: Record<string, any> | undefined;
    wrapperClass?: string | undefined;
  }

  export interface ResolvedMarkdownIslandOptions {
    component: string;
    componentPath: string;
    exportName?: string | undefined;
    trigger: IslandTriggerStrategy;
    height: string;
    width: string;
    props: Record<string, any>;
    wrapperClass: string;
  }

  export interface MarkdownRenderResult {
    html: string;
    headings: HeadingEntry[];
    frontmatter: Record<string, any>;
    islands: IslandDescriptor[];
  }

  export interface ContentEntry<T = Record<string, any>> {
    id: string;
    slug: string;
    collection: string;
    data: T;
    body: string;
    html: string;
    headings: HeadingEntry[];
    filePath: string;
  }

  export interface CollectionConfig<T = any> {
    schema?: (data: any) => T;
  }

  export const DRIFT_EXE_FENCE: string;
  export const DEFAULT_MARKDOWN_ISLAND: ResolvedMarkdownIslandOptions;
  export function slugify(text: string): string;
  export function isDriftExeFence(lang: string | null | undefined): boolean;
  export function createMarkdownIslandDescriptor(
    code: string,
    options?: MarkdownIslandOptions
  ): IslandDescriptor;
  export function renderDriftExeFence(code: string, options?: MarkdownIslandOptions): string;
  export function scanMarkdownIslands(body: string, options?: MarkdownIslandOptions): IslandDescriptor[];
  export function stripFrontmatter(markdown: string): string;
  export function renderMarkdown(
    markdown: string,
    options?: MarkdownIslandOptions
  ): Promise<MarkdownRenderResult>;
  export function getCollection<T = Record<string, any>>(
    name: string,
    contentDir?: string
  ): Promise<ContentEntry<T>[]>;
  export function getEntry<T = Record<string, any>>(
    collection: string,
    slugOrId: string,
    contentDir?: string
  ): Promise<ContentEntry<T> | null>;

  // Islands Types
  export type IslandClientDirective =
    | 'client:load'
    | 'client:idle'
    | 'client:visible'
    | 'client:interaction'
    | 'client:media';

  export interface IslandDescriptor {
    name: string;
    componentPath: string;
    exportName?: string | undefined;
    trigger: IslandTriggerStrategy;
    props: Record<string, any>;
    timeout?: number | undefined;
    media?: string | undefined;
    rootMargin?: string | undefined;
  }

  export interface IslandWrapperOptions {
    islandName: string;
    trigger: IslandTriggerStrategy;
    html: string;
    props?: Record<string, any> | undefined;
    timeout?: number | undefined;
    media?: string | undefined;
    rootMargin?: string | undefined;
  }

  export interface WrapIslandOptions {
    islandName: string;
    trigger: IslandTriggerStrategy;
    html: string;
    props?: Record<string, any> | undefined;
    timeout?: number | undefined;
    media?: string | undefined;
    rootMargin?: string | undefined;
  }

  export interface IslandBundleResult {
    scriptTag?: string | undefined;
    assetPath?: string | undefined;
    size: number;
    cssTag?: string | undefined;
    cssAssetPath?: string | undefined;
    cssSize?: number | undefined;
  }

  export interface IslandBundleOptions {
    islands: IslandDescriptor[];
    outDir: string;
    base?: string | undefined;
    root?: string | undefined;
    viteConfig?: ViteUserConfig | undefined;
    minify?: boolean | undefined;
    cssImports?: string[] | undefined;
  }

  export const CLIENT_DIRECTIVES: Record<string, IslandTriggerStrategy>;
  export function extractIslandImports(
    templateSource: string,
    sourceFilePath?: string
  ): Record<string, string>;
  export function extractCssImports(templateSource: string, sourceFilePath?: string): string[];
  export function findIslandElements(node: any, results?: any[]): any[];
  export function scanIslands(source: string, sourceFilePath?: string): IslandDescriptor[];
  export function wrapIslandHtml(options: WrapIslandOptions): string;
  export function generateIslandBootstrapSource(
    islands: IslandDescriptor[],
    base?: string
  ): string;
  export function bundleIslands(options: IslandBundleOptions): Promise<IslandBundleResult>;

  // Render & Head Types
  export interface MetaTag {
    name?: string | undefined;
    property?: string | undefined;
    content?: string | undefined;
    charset?: string | undefined;
    httpEquiv?: string | undefined;
    [key: string]: any;
  }

  export interface HeadConfig {
    title?: string | undefined;
    meta?: MetaTag[] | undefined;
    links?: Array<{ rel: string; href: string; [key: string]: any }> | undefined;
  }

  export interface HeadExtractionResult {
    title?: string | undefined;
    headHtml: string;
    bodyHtml: string;
  }

  export interface SitemapEntry {
    url: string;
    lastmod?: string | undefined;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' | undefined;
    priority?: number | undefined;
  }

  export interface LayoutDescriptor {
    filePath: string;
    component: any;
  }

  export interface PageRenderContext {
    url: string;
    params: RouteParams;
    props: Record<string, any>;
    route: RouteRecord;
    site?: string | undefined;
    headTags?: string[] | undefined;
  }

  export interface RenderPageOptions {
    route: RouteRecord;
    pathname: string;
    params: RouteParams;
    props: Record<string, any>;
    documentPath?: string | undefined;
    scripts?: string[] | undefined;
    headTags?: string[] | undefined;
    site?: string | undefined;
    markdown?: MarkdownIslandOptions | undefined;
    moduleLoader?: ((filePath: string) => Promise<any>) | undefined;
  }

  export interface RenderResult {
    html: string;
    islands: IslandDescriptor[];
    title?: string | undefined;
  }

  export function renderModule(component: any, scope?: Record<string, any>): ServerNode | null;
  export function createSlotNode(): ServerNode;
  export function renderLayout(
    layoutComponent: any,
    pageNode: ServerNode,
    scope?: Record<string, any>
  ): ServerNode;
  export function renderPage(options: RenderPageOptions): Promise<RenderResult>;

  export function buildHeadTags(head?: HeadConfig, site?: string): string;
  export function extractHeadTags(html: string): HeadExtractionResult;
  export function mergeHead(baseHead: string, pageHead: string): string;
  export function injectDocument(
    html: string,
    options?: {
      documentHtml?: string | undefined;
      title?: string | undefined;
      headTags?: string[] | undefined;
      scripts?: string[] | undefined;
      site?: string | undefined;
    }
  ): string;
  export function generateSitemap(urls: string[], siteUrl?: string): string;
  export function generateRobotsTxt(siteUrl?: string): string;

  // Server Types
  export interface DevServerOptions {
    root?: string | undefined;
    port?: number | undefined;
    host?: string | undefined;
    configFile?: string | undefined;
  }

  export interface DevServerInstance {
    server: http.Server;
    vite: ViteDevServer;
    port: number;
    close: () => Promise<void>;
  }

  export function createDevServer(options?: DevServerOptions): Promise<DevServerInstance>;

  // Build Types
  export interface BuildOptions {
    root?: string | undefined;
    configFile?: string | undefined;
    outDir?: string | undefined;
    silent?: boolean | undefined;
  }

  export interface PageOutput {
    route: string;
    filePath: string;
    html: string;
    islands: IslandDescriptor[];
    size: number;
  }

  export interface BuildSummary {
    pages: PageOutput[];
    durationMs: number;
    assets: string[];
    totalSize: number;
    islandBundleSize: number;
    cssBundleSize?: number | undefined;
  }

  export function build(options?: BuildOptions): Promise<BuildSummary>;

  // CLI
  export function runCli(args?: string[]): Promise<void>;
}
