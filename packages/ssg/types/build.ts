import type { IslandDescriptor } from './render.js';

export interface BuildOptions {
  /** Project root directory */
  root?: string;
  /** Explicit config file path */
  configFile?: string;
  /** Custom output directory override */
  outDir?: string;
  /** Suppress console output */
  silent?: boolean;
}

export interface PageOutput {
  /** Relative route path (e.g. '/' or '/blog/hello-world') */
  route: string;
  /** Destination file path on disk (e.g. 'dist/index.html') */
  filePath: string;
  /** Generated HTML string */
  html: string;
  /** Islands present on this page */
  islands: IslandDescriptor[];
  /** Size in bytes */
  size: number;
}

export interface BuildSummary {
  pages: PageOutput[];
  durationMs: number;
  assets: string[];
  totalSize: number;
  islandBundleSize: number;
}
