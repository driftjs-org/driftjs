import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { compile } from '@driftjs/compiler';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  const appDriftSource = fs.readFileSync(path.resolve(__dirname, 'src/App.drift'), 'utf8');

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    // Serve HTML page with SSR
    if (url === '/' || url === '/index.html') {
      try {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
        // Let Vite transform index.html (injects Vite client & resolves modules like /src/main.ts)
        const template = await vite.transformIndexHtml(url, rawTemplate);

        // Load modules via Vite for SSR
        const { renderToString } = await vite.ssrLoadModule('@driftjs/ssr');
        const appModule = await vite.ssrLoadModule('./src/App.drift');
        const App = appModule.default || appModule;
        const appHtml = renderToString(App);

        // 3. Inject SSR HTML into index.html shell
        const html = template.replace(
          '<div id="app"></div>',
          `<div id="app">${appHtml}</div>`
        );

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      } catch (e) {
        vite.ssrFixStacktrace(e);
        console.error(e);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(e.stack || String(e));
        return;
      }
    }

    // Pass all static assets, JS/TS scripts, and bare specifier imports to Vite's dev server middleware
    vite.middlewares(req, res);
  });

  server.listen(3000, () => {
    console.log(`🚀 DriftJS SSR Server listening on http://localhost:3000`);
  });
}

startServer();
