import type { UserConfig as ViteUserConfig } from 'vite';

export type IslandTriggerStrategy = 'eager' | 'idle' | 'visible' | 'interaction' | 'media';

export interface DriftSSGConfig {
  /** Project root directory. Defaults to process.cwd() */
  root: string;
  /** Directory containing page routes. Defaults to 'src/pages' or 'pages' */
  pagesDir: string;
  /** Directory containing markdown content collections. Defaults to 'src/content' or 'content' */
  contentDir: string;
  /** Output directory for generated static assets and HTML. Defaults to 'dist' */
  outDir: string;
  /** Static public assets directory to copy directly into outDir. Defaults to 'public' */
  publicDir: string;
  /** Canonical base URL for production site, e.g. 'https://driftjs.dev' */
  site?: string;
  /** Base URL path prefix, e.g. '/docs/'. Defaults to '/' */
  base: string;
  /** Whether to automatically generate sitemap.xml. Defaults to true if site is defined */
  sitemap: boolean;
  /** Whether to automatically generate robots.txt. Defaults to true if site is defined */
  robots: boolean;
  /** Trailing slash behavior for URLs. 'always' | 'never' | 'ignore'. Defaults to 'always' */
  trailingSlash: 'always' | 'never' | 'ignore';
  /** Default hydration trigger for islands without an explicit directive. Defaults to 'idle' */
  defaultIslandTrigger: IslandTriggerStrategy;
  /** Optional custom Vite configuration options */
  vite?: ViteUserConfig;
}

export type UserConfig = Partial<DriftSSGConfig>;
