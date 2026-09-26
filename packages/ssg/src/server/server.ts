import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createServer as createViteServer, type ViteDevServer, type Plugin } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';
import type { DevServerOptions, DevServerInstance } from '../../types/index.js';
import { loadConfig } from '../config/index.js';
import { scanRoutes, matchRoute } from '../router/index.js';
import { renderPage, buildHeadTags } from '../render/index.js';
import { extractStaticPaths } from '../router/index.js';
import { scanIslands, generateIslandBootstrapSource, extractCssImports } from '../islands/index.js';

export type { DevServerOptions, DevServerInstance };

/**
 * Creates and starts an on-demand SSG development server with Vite HMR.
 */
export async function createDevServer(options: DevServerOptions = {}): Promise<DevServerInstance> {
  const config = await loadConfig(options.root, options.configFile);
  const port = options.port || 3000;
  const host = options.host || 'localhost';

  let domPath: string;
  try {
    domPath = fileURLToPath(import.meta.resolve('driftjs-dom'));
  } catch {
    try {
      const req = typeof require !== 'undefined' ? require : createRequire(typeof __filename !== 'undefined' ? __filename : (import.meta.url || 'file://' + process.cwd()));
      domPath = req.resolve('driftjs-dom');
    } catch {
      domPath = 'driftjs-dom';
    }
  }

  const islandsDevPlugin: Plugin = {
    name: 'drift-islands-dev-plugin',
    resolveId(id) {
      if (id.startsWith('/@drift-islands')) {
        return id;
      }
    },
    load(id) {
      if (id.startsWith('/@drift-islands')) {
        const queryIdx = id.indexOf('?');
        const search = queryIdx !== -1 ? id.slice(queryIdx) : '';
        const params = new URLSearchParams(search);
        const pageFile = params.get('page');
        if (pageFile && fs.existsSync(pageFile)) {
          const src = fs.readFileSync(pageFile, 'utf8');
          const islands = scanIslands(src, {}, pageFile);
          return generateIslandBootstrapSource(islands, config.root);
        }
        return '';
      }
    },
  };

  const viteConfig: any = {
    root: config.root,
    server: {
      middlewareMode: true,
    },
    appType: 'custom',
    plugins: [driftPlugin(), islandsDevPlugin],
    resolve: {
      alias: {
        'driftjs-dom': domPath,
        ...(config.vite?.resolve?.alias || {}),
      },
    },
    publicDir: config.publicDir,
    ...config.vite,
  };

  const vite = await createViteServer(viteConfig);

  const app = http.createServer((req, res) => {
    vite.middlewares(req, res, async () => {
      try {
        const rawUrl = req.url || '/';
        const pathname = rawUrl.split('?')[0] || '/';

        // 1. Scan routes on demand
        const { routes, document: documentPath, notFound } = scanRoutes(config.pagesDir);
        let matched = matchRoute(routes, pathname);
        let props: Record<string, any> = {};

        // 2. If matched a dynamic route, invoke getStaticPaths on the fly
        if (matched && (matched.route.type === 'dynamic' || matched.route.type === 'catch-all')) {
          try {
            const staticPaths = await extractStaticPaths(matched.route);
            const foundPath = staticPaths.find((sp) => {
              for (const [k, v] of Object.entries(matched!.params)) {
                if (String(sp.params[k]) !== String(v)) return false;
              }
              return true;
            });
            if (foundPath && foundPath.props) {
              props = foundPath.props;
            }
          } catch {
            // ignore getStaticPaths errors during dev navigation
          }
        }

        // 3. Fallback to 404 if not found
        if (!matched && notFound) {
          matched = {
            route: notFound,
            params: {},
            pathname: '/404',
          };
          res.statusCode = 404;
        } else if (!matched) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end('<h1>404 Not Found</h1>');
          return;
        } else {
          res.statusCode = 200;
        }

        // 4. Render page with layouts
        const baseHeadTags = buildHeadTags(config.head, config.publicDir, config.base);

        const pageCssFiles = new Set<string>();
        const scanFileForCss = (filePath: string) => {
          if (filePath.endsWith('.drift') && fs.existsSync(filePath)) {
            const src = fs.readFileSync(filePath, 'utf8');
            const cssImports = extractCssImports(src, filePath);
            for (const imp of cssImports) {
              if (imp.startsWith('.')) {
                const resolved = path.resolve(path.dirname(filePath), imp);
                if (fs.existsSync(resolved)) pageCssFiles.add(resolved);
              } else if (imp.startsWith('/')) {
                const resolved = path.resolve(config.root, imp.slice(1));
                if (fs.existsSync(resolved)) pageCssFiles.add(resolved);
              }
            }
          }
        };

        if (documentPath) scanFileForCss(documentPath);
        for (const lPath of matched.route.layouts) scanFileForCss(lPath);
        scanFileForCss(matched.route.filePath);

        let pageHasIslands = false;
        let pageIslandsList: ReturnType<typeof scanIslands> = [];
        if (matched.route.filePath.endsWith('.drift') && fs.existsSync(matched.route.filePath)) {
          pageIslandsList = scanIslands(fs.readFileSync(matched.route.filePath, 'utf8'), {}, matched.route.filePath);
          if (pageIslandsList.length > 0) pageHasIslands = true;
        }
        if (!pageHasIslands) {
          for (const lPath of matched.route.layouts) {
            if (lPath.endsWith('.drift') && fs.existsSync(lPath)) {
              const lIslands = scanIslands(fs.readFileSync(lPath, 'utf8'), {}, lPath);
              if (lIslands.length > 0) {
                pageHasIslands = true;
                pageIslandsList.push(...lIslands);
                break;
              }
            }
          }
        }

        // Also scan any island components for CSS imports
        for (const isl of pageIslandsList) {
          if (isl.componentPath && isl.componentPath.endsWith('.drift') && fs.existsSync(isl.componentPath)) {
            scanFileForCss(isl.componentPath);
          }
        }

        const devHeadTags = [...baseHeadTags];
        for (const cssFile of pageCssFiles) {
          const rel = path.relative(config.root, cssFile).replace(/\\/g, '/');
          const href = rel.startsWith('..')
            ? `/@fs${cssFile.startsWith('/') ? '' : '/'}${cssFile.replace(/\\/g, '/')}`
            : `/${rel.replace(/^\/+/, '')}`;
          devHeadTags.push(`<link rel="stylesheet" href="${href}" />`);
        }

        const devScripts = pageHasIslands
          ? [`<script type="module" src="/@drift-islands?page=${encodeURIComponent(matched.route.filePath)}"></script>`]
          : [];

        const renderRes = await renderPage({
          route: matched.route,
          pathname: matched.pathname,
          params: matched.params,
          props,
          documentPath,
          scripts: devScripts,
          headTags: devHeadTags,
          site: config.site,
          moduleLoader: (filePath: string) => vite.ssrLoadModule(filePath),
        });

        // 5. Injected Vite HMR client
        const html = await vite.transformIndexHtml(pathname, renderRes.html);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      } catch (err: any) {
        vite.ssrFixStacktrace(err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(err.stack || err.message);
      }
    });
  });

  await new Promise<void>((resolve) => {
    app.listen(port, host, () => {
      resolve();
    });
  });

  return {
    server: app,
    vite,
    port,
    close: async () => {
      await vite.close();
      await new Promise<void>((resolve) => app.close(() => resolve()));
    },
  };
}
