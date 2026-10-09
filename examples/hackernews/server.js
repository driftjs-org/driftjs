import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3004;

// Curated server dataset with rich discussions (fallback/fast boot)
const SERVER_STORIES = [
  {
    id: 101,
    title: 'DriftJS: Register-VM Reactivity and AOT Compilation',
    url: 'https://github.com/hrutav-modha/driftjs',
    domain: 'github.com/hrutav-modha',
    by: 'hrutav',
    score: 342,
    descendants: 68,
    timeAgo: '2 hours ago',
    upvoted: false,
    comments: [
      {
        id: 1001,
        by: 'dang',
        timeAgo: '1 hour ago',
        text: 'Fascinating approach using 256 virtual registers and LIS reconciliation instead of full virtual DOM trees.'
      },
      {
        id: 1002,
        by: 'tptacek',
        timeAgo: '45 minutes ago',
        text: 'The sub-millisecond benchmark results on 1,000 keyed items are legitimately impressive.'
      }
    ]
  },
  {
    id: 102,
    title: 'Show HN: Building an SSR + Hydration Engine with Zero VDOM Churn',
    url: 'https://news.ycombinator.com',
    domain: 'ycombinator.com',
    by: 'antigravity',
    score: 189,
    descendants: 34,
    timeAgo: '3 hours ago',
    upvoted: false,
    comments: [
      {
        id: 1003,
        by: 'swyx',
        timeAgo: '2 hours ago',
        text: 'TreeWalker-based hydration cursor avoids tearing down server HTML. Very clean.'
      }
    ]
  },
  {
    id: 103,
    title: 'Reflections on High-Performance Bytecode Interpreters in the Browser',
    url: 'https://v8.dev/blog',
    domain: 'v8.dev',
    by: 'mraleph',
    score: 412,
    descendants: 89,
    timeAgo: '5 hours ago',
    upvoted: false,
    comments: []
  },
  {
    id: 104,
    title: 'Ask HN: What is your favorite modern frontend compiler innovation?',
    url: 'https://news.ycombinator.com/item?id=104',
    domain: 'news.ycombinator.com',
    by: 'compiler_fan',
    score: 95,
    descendants: 41,
    timeAgo: '6 hours ago',
    upvoted: false,
    comments: []
  },
  {
    id: 105,
    title: 'SQLite in the Browser: Running Full SQL Engines on WebAssembly',
    url: 'https://sqlite.org/wasm',
    domain: 'sqlite.org',
    by: 'drh',
    score: 528,
    descendants: 112,
    timeAgo: '8 hours ago',
    upvoted: false,
    comments: []
  }
];

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    // Server-Side Rendered HTML route
    if (url === '/' || url === '/index.html' || url.startsWith('/?')) {
      try {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
        const template = await vite.transformIndexHtml(url, rawTemplate);

        // Load modules dynamically via Vite SSR pipeline
        const { renderToString } = await vite.ssrLoadModule('driftjs-ssr');
        const appModule = await vite.ssrLoadModule('./src/App.drift');
        const App = appModule.default || appModule;

        const initialScope = {
          stories: SERVER_STORIES,
          currentTab: 'top',
          activeStoryId: null,
        };

        // Render virtual node tree on server and serialize to escaped HTML with comment anchors
        const appHtml = renderToString(App, { scope: initialScope });

        // Inject pre-rendered HTML and client hydration payload
        const html = template
          .replace('<!--app-html-->', appHtml)
          .replace(
            '<!--app-state-->',
            `<script>window.__INITIAL_DATA__ = ${JSON.stringify(initialScope)};</script>`
          );

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      } catch (err) {
        vite.ssrFixStacktrace(err);
        console.error('[DriftJS SSR Error]', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err.stack || String(err));
        return;
      }
    }

    // Static assets, client scripts, and modules handled by Vite
    vite.middlewares(req, res);
  });

  server.listen(PORT, () => {
    console.log(`🚀 Hacker News SSR Server running on http://localhost:${PORT}`);
  });
}

startServer();
