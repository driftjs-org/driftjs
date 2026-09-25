import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DriftSSGConfig, UserConfig } from '../../types/index.js';

export const DEFAULT_CONFIG: DriftSSGConfig = {
  root: process.cwd(),
  pagesDir: 'src/pages',
  contentDir: 'src/content',
  outDir: 'dist',
  publicDir: 'public',
  site: undefined,
  base: '/',
  sitemap: true,
  robots: true,
  trailingSlash: 'always',
  defaultIslandTrigger: 'idle',
};

const CONFIG_FILENAMES = [
  'drift.config.ts',
  'drift.config.js',
  'drift.config.mjs',
  'drift.config.cjs',
];

/**
 * Finds the config file in the given root directory if present.
 */
export function findConfigFile(root: string): string | null {
  for (const filename of CONFIG_FILENAMES) {
    const fullPath = path.resolve(root, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Loads configuration from a file or object, filling with defaults.
 */
export async function loadConfig(
  root: string = process.cwd(),
  customConfigFile?: string | undefined,
  overrides: UserConfig = {}
): Promise<DriftSSGConfig> {
  const resolvedRoot = path.resolve(root);
  let fileConfig: UserConfig = {};

  const configPath = customConfigFile
    ? path.resolve(resolvedRoot, customConfigFile)
    : findConfigFile(resolvedRoot);

  if (configPath && fs.existsSync(configPath)) {
    try {
      const fileUrl = pathToFileURL(configPath).href;
      const mod = await import(fileUrl);
      fileConfig = mod.default || mod.config || mod;
    } catch (err) {
      console.warn(`[drift-ssg] Failed to load config from ${configPath}:`, err);
    }
  }

  const merged: UserConfig = {
    ...fileConfig,
    ...overrides,
    root: resolvedRoot,
  };

  let pagesDir = merged.pagesDir;
  if (!pagesDir) {
    const srcPages = path.join(resolvedRoot, 'src', 'pages');
    const rootPages = path.join(resolvedRoot, 'pages');
    if (fs.existsSync(srcPages)) {
      pagesDir = 'src/pages';
    } else if (fs.existsSync(rootPages)) {
      pagesDir = 'pages';
    } else {
      pagesDir = 'src/pages';
    }
  }

  let contentDir = merged.contentDir;
  if (!contentDir) {
    const srcContent = path.join(resolvedRoot, 'src', 'content');
    const rootContent = path.join(resolvedRoot, 'content');
    if (fs.existsSync(srcContent)) {
      contentDir = 'src/content';
    } else if (fs.existsSync(rootContent)) {
      contentDir = 'content';
    } else {
      contentDir = 'src/content';
    }
  }

  const site = merged.site ? merged.site.replace(/\/+$/, '') : undefined;
  const base = merged.base ? (merged.base.startsWith('/') ? merged.base : `/${merged.base}`) : '/';

  return {
    root: resolvedRoot,
    pagesDir: path.isAbsolute(pagesDir) ? pagesDir : path.resolve(resolvedRoot, pagesDir),
    contentDir: path.isAbsolute(contentDir) ? contentDir : path.resolve(resolvedRoot, contentDir),
    outDir: path.isAbsolute(merged.outDir || 'dist')
      ? (merged.outDir || 'dist')
      : path.resolve(resolvedRoot, merged.outDir || 'dist'),
    publicDir: path.isAbsolute(merged.publicDir || 'public')
      ? (merged.publicDir || 'public')
      : path.resolve(resolvedRoot, merged.publicDir || 'public'),
    site,
    base: base.endsWith('/') ? base : `${base}/`,
    sitemap: merged.sitemap ?? (site !== undefined),
    robots: merged.robots ?? (site !== undefined),
    trailingSlash: merged.trailingSlash ?? 'always',
    defaultIslandTrigger: merged.defaultIslandTrigger ?? 'idle',
    vite: merged.vite,
  };
}

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
