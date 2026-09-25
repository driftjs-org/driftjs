import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import type { BuildOptions, BuildSummary, PageOutput } from '../../types/index.js';
import { loadConfig } from '../config/index.js';
import { scanRoutes } from '../router/index.js';
import { resolveAllRoutePaths } from '../router/index.js';
import { renderPage } from '../render/index.js';
import { bundleIslands } from '../islands/index.js';
import { generateSitemap, generateRobotsTxt } from '../render/index.js';
import { scanIslands } from '../islands/index.js';

export type { BuildOptions, BuildSummary, PageOutput };

/**
 * Executes the full production static site generation pipeline.
 */
export async function build(options: BuildOptions = {}): Promise<BuildSummary> {
  const startTime = Date.now();
  const config = await loadConfig(options.root, options.configFile, {
    outDir: options.outDir,
  });

  if (!options.silent) {
    console.log(`\n🏛️  ${pc.bold(pc.cyan('Drift Static'))} ${pc.gray(`v0.0.15`)}`);
    console.log(`${pc.gray('▸')} Root:  ${pc.dim(config.root)}`);
    console.log(`${pc.gray('▸')} Pages: ${pc.dim(config.pagesDir)}`);
    console.log(`${pc.gray('▸')} Out:   ${pc.dim(config.outDir)}\n`);
  }

  // 1. Scan filesystem routes
  const { routes, document: documentPath, notFound } = scanRoutes(config.pagesDir);
  const allRoutesToResolve = [...routes];
  if (notFound) {
    allRoutesToResolve.push(notFound);
  }

  // 2. Resolve all concrete route paths (expanding getStaticPaths for dynamic routes)
  const resolvedPaths = await resolveAllRoutePaths(allRoutesToResolve);

  // 3. Prepare outDir
  if (fs.existsSync(config.outDir)) {
    fs.rmSync(config.outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(config.outDir, { recursive: true });

  // 4. Scan for all islands across the site
  const siteIslands: ReturnType<typeof scanIslands> = [];
  for (const r of allRoutesToResolve) {
    if (r.filePath.endsWith('.drift') && fs.existsSync(r.filePath)) {
      const src = fs.readFileSync(r.filePath, 'utf8');
      siteIslands.push(...scanIslands(src));
    }
  }

  // 5. Bundle client islands with Vite (if any islands exist)
  let islandBundleScript = '';
  let islandBundleSize = 0;
  if (siteIslands.length > 0) {
    if (!options.silent) {
      console.log(`${pc.yellow('⚡')} Bundling ${siteIslands.length} interactive island(s)...`);
    }
    const bundleRes = await bundleIslands(siteIslands, config);
    islandBundleScript = bundleRes.scriptTag || '';
    islandBundleSize = bundleRes.size;
  }

  // 6. Pre-render all pages to static HTML
  const pageOutputs: PageOutput[] = [];
  let totalHtmlSize = 0;

  for (const target of resolvedPaths) {
    const is404 = target.route.type === '404' || target.pathname === '/404';
    const scripts = target.route.filePath.endsWith('.drift') && siteIslands.length > 0 && islandBundleScript
      ? [islandBundleScript]
      : [];

    const renderRes = await renderPage({
      route: target.route,
      pathname: target.pathname,
      params: target.params,
      props: target.props,
      documentPath,
      scripts,
      site: config.site,
    });

    let targetRelFile: string;
    if (is404) {
      targetRelFile = '404.html';
    } else if (target.pathname === '/') {
      targetRelFile = 'index.html';
    } else if (config.trailingSlash === 'never') {
      const trimmed = target.pathname.replace(/^\/+/, '');
      targetRelFile = `${trimmed}.html`;
    } else {
      // trailingSlash: 'always' (or 'ignore') -> /about/index.html
      const trimmed = target.pathname.replace(/^\/+|\/+$/g, '');
      targetRelFile = path.join(trimmed, 'index.html');
    }

    const outFilePath = path.join(config.outDir, targetRelFile);
    fs.mkdirSync(path.dirname(outFilePath), { recursive: true });
    fs.writeFileSync(outFilePath, renderRes.html, 'utf8');

    const size = Buffer.byteLength(renderRes.html, 'utf8');
    totalHtmlSize += size;

    pageOutputs.push({
      route: target.pathname,
      filePath: outFilePath,
      html: renderRes.html,
      islands: renderRes.islands,
      size,
    });

    if (!options.silent) {
      const formattedSize = (size / 1024).toFixed(2);
      const isZeroJs = renderRes.islands.length === 0;
      const jsBadge = isZeroJs ? pc.green('0 kB JS') : pc.yellow(`${renderRes.islands.length} island(s)`);
      console.log(`  ${pc.green('✓')} ${pc.bold(target.pathname.padEnd(28))} ${pc.dim(`${formattedSize} kB`)}  ${pc.gray(`[${jsBadge}]`)}`);
    }
  }

  // 7. Copy public assets if publicDir exists
  const assets: string[] = [];
  if (fs.existsSync(config.publicDir)) {
    fs.cpSync(config.publicDir, config.outDir, { recursive: true });
  }

  // 8. Generate sitemap.xml and robots.txt
  if (config.sitemap && config.site) {
    const sitemapRoutes = pageOutputs.map((p) => p.route).filter((r) => r !== '/404');
    const sitemapContent = generateSitemap(sitemapRoutes, config.site);
    fs.writeFileSync(path.join(config.outDir, 'sitemap.xml'), sitemapContent, 'utf8');
    assets.push('sitemap.xml');
  }

  if (config.robots) {
    const robotsContent = generateRobotsTxt(config.site);
    fs.writeFileSync(path.join(config.outDir, 'robots.txt'), robotsContent, 'utf8');
    assets.push('robots.txt');
  }

  const durationMs = Date.now() - startTime;

  if (!options.silent) {
    console.log(`\n${pc.green('✨ Built in')} ${pc.bold(`${durationMs}ms`)}`);
    console.log(`${pc.gray('▸')} Total Pages: ${pc.bold(pageOutputs.length)}`);
    console.log(`${pc.gray('▸')} Total Size:  ${pc.bold(`${(totalHtmlSize / 1024).toFixed(2)} kB`)}\n`);
  }

  return {
    pages: pageOutputs,
    durationMs,
    assets,
    totalSize: totalHtmlSize + islandBundleSize,
    islandBundleSize,
  };
}
