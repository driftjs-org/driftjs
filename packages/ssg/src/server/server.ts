import fs from 'node:fs';
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
import { scanIslands, generateIslandBootstrapSource } from '../islands/index.js';

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
    const req = createRequire(import.meta.url);
    domPath = req.resolve('driftjs-dom');
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

  const vite = await createViteServer({
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
  });

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

        let pageHasIslands = false;
        if (matched.route.filePath.endsWith('.drift') && fs.existsSync(matched.route.filePath)) {
          const pageIslands = scanIslands(fs.readFileSync(matched.route.filePath, 'utf8'), {}, matched.route.filePath);
          if (pageIslands.length > 0) pageHasIslands = true;
        }
        if (!pageHasIslands) {
          for (const lPath of matched.route.layouts) {
            if (lPath.endsWith('.drift') && fs.existsSync(lPath)) {
              const lIslands = scanIslands(fs.readFileSync(lPath, 'utf8'), {}, lPath);
              if (lIslands.length > 0) {
                pageHasIslands = true;
                break;
              }
            }
          }
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
          headTags: baseHeadTags,
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
