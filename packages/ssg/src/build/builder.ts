import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';
import pc from 'picocolors';
import type { BuildOptions, BuildSummary, PageOutput } from '../../types/index.js';
import { loadConfig } from '../config/index.js';
import { scanRoutes } from '../router/index.js';
import { resolveAllRoutePaths } from '../router/index.js';
import { renderPage, buildHeadTags } from '../render/index.js';
import { bundleIslands, scanIslands, extractCssImports } from '../islands/index.js';
import { generateSitemap, generateRobotsTxt } from '../render/index.js';

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

  // 1. Create Vite SSR environment to transform & load .drift SFCs via driftPlugin
  const vite = await createViteServer({
    root: config.root,
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [driftPlugin()],
    publicDir: config.publicDir,
    ...config.vite,
  });

  const moduleLoader = (filePath: string) => vite.ssrLoadModule(filePath);

  try {
    // 2. Scan filesystem routes
    const { routes, document: documentPath, notFound } = scanRoutes(config.pagesDir);
    const allRoutesToResolve = [...routes];
    if (notFound) {
      allRoutesToResolve.push(notFound);
    }

    // 3. Resolve all concrete route paths (expanding getStaticPaths for dynamic routes)
    const resolvedPaths = await resolveAllRoutePaths(allRoutesToResolve, (route) =>
      moduleLoader(route.filePath)
    );

    // 4. Prepare outDir
    if (fs.existsSync(config.outDir)) {
      fs.rmSync(config.outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(config.outDir, { recursive: true });

    // 5. Scan for all islands across the site (pages, layouts, document)
    const siteIslands: ReturnType<typeof scanIslands> = [];
    const siteCssFiles = new Set<string>();
    const scannedFiles = new Set<string>();

    const scanFile = (filePath: string) => {
      if (scannedFiles.has(filePath)) return;
      scannedFiles.add(filePath);
      if (filePath.endsWith('.drift') && fs.existsSync(filePath)) {
        const src = fs.readFileSync(filePath, 'utf8');
        siteIslands.push(...scanIslands(src, {}, filePath));
        const cssImports = extractCssImports(src, filePath);
        for (const imp of cssImports) {
          if (imp.startsWith('.')) {
            const resolved = path.resolve(path.dirname(filePath), imp);
            if (fs.existsSync(resolved)) siteCssFiles.add(resolved);
          } else if (imp.startsWith('/')) {
            const resolved = path.resolve(config.root, imp.slice(1));
            if (fs.existsSync(resolved)) siteCssFiles.add(resolved);
          }
        }
      }
    };

    for (const r of allRoutesToResolve) {
      scanFile(r.filePath);
      for (const layoutPath of r.layouts) {
        scanFile(layoutPath);
      }
    }
    if (documentPath) {
      scanFile(documentPath);
    }

    // 6. Bundle client islands and site CSS with Vite
    let islandBundleScript = '';
    let islandBundleSize = 0;
    let bundledCssTag = '';
    let cssBundleSize = 0;
    let bundledCssHref = '';

    const cssList = Array.from(siteCssFiles);
    if (siteIslands.length > 0 || cssList.length > 0) {
      if (!options.silent) {
        if (siteIslands.length > 0 && cssList.length > 0) {
          console.log(`\n${pc.yellow('⚡')} Bundling ${siteIslands.length} interactive island(s) & styles...`);
        } else if (siteIslands.length > 0) {
          console.log(`\n${pc.yellow('⚡')} Bundling ${siteIslands.length} interactive island(s)...`);
        } else {
          console.log(`\n${pc.yellow('⚡')} Bundling styles...`);
        }
      }
      const bundleRes = await bundleIslands(siteIslands, config, { cssFiles: cssList });
      islandBundleScript = bundleRes.scriptTag || '';
      islandBundleSize = bundleRes.size;
      bundledCssTag = bundleRes.cssTag || '';
      cssBundleSize = bundleRes.cssSize || 0;
      bundledCssHref = bundleRes.cssAssetPath
        ? (config.base.endsWith('/') ? `${config.base}${bundleRes.cssAssetPath}` : `${config.base}/${bundleRes.cssAssetPath}`)
        : '';
    }

    // 7. Pre-render all pages to static HTML
    const pageOutputs: PageOutput[] = [];
    let totalHtmlSize = 0;
    const baseHeadTags = buildHeadTags(config.head, config.publicDir, config.base);

    if (bundledCssTag) {
      for (let i = baseHeadTags.length - 1; i >= 0; i--) {
        if (baseHeadTags[i]!.includes('styles.css') || baseHeadTags[i]!.includes('style.css')) {
          baseHeadTags.splice(i, 1);
        }
      }
      baseHeadTags.push(bundledCssTag);
    }

    for (const target of resolvedPaths) {
      const is404 = target.route.type === '404' || target.pathname === '/404';

      let pageHasIslands = false;
      if (target.route.filePath.endsWith('.drift') && fs.existsSync(target.route.filePath)) {
        const pageIslands = scanIslands(fs.readFileSync(target.route.filePath, 'utf8'), {}, target.route.filePath);
        if (pageIslands.length > 0) pageHasIslands = true;
      }
      if (!pageHasIslands) {
        for (const lPath of target.route.layouts) {
          if (lPath.endsWith('.drift') && fs.existsSync(lPath)) {
            const lIslands = scanIslands(fs.readFileSync(lPath, 'utf8'), {}, lPath);
            if (lIslands.length > 0) {
              pageHasIslands = true;
              break;
            }
          }
        }
      }

      const scripts = pageHasIslands && siteIslands.length > 0 && islandBundleScript
        ? [islandBundleScript]
        : [];

      const renderRes = await renderPage({
        route: target.route,
        pathname: target.pathname,
        params: target.params,
        props: target.props,
        documentPath,
        scripts,
        headTags: baseHeadTags,
        site: config.site,
        moduleLoader,
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
        const jsBadge = isZeroJs ? pc.green('0 kB JS') : pc.yellow(`${(islandBundleSize / 1024).toFixed(2)} kB JS`);
        console.log(`  ${pc.green('✓')} ${pc.bold(target.pathname.padEnd(28))} ${pc.dim(`${formattedSize} kB`)}  ${pc.gray(`[${jsBadge}]`)}`);
      }
    }

    // 8. Copy public assets if publicDir exists
    const assets: string[] = [];
    if (fs.existsSync(config.publicDir)) {
      fs.cpSync(config.publicDir, config.outDir, { recursive: true });
    }

    // 9. Generate sitemap.xml and robots.txt
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
      console.log(`${pc.gray('▸')} Total Size:  ${pc.bold(`${((totalHtmlSize + islandBundleSize + cssBundleSize) / 1024).toFixed(2)} kB`)}\n`);
    }

    return {
      pages: pageOutputs,
      durationMs,
      assets,
      totalSize: totalHtmlSize + islandBundleSize + cssBundleSize,
      islandBundleSize,
      cssBundleSize,
    };
  } finally {
    await vite.close();
  }
}
