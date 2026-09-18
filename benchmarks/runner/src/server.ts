import { createServer, preview, type ViteDevServer, type PreviewServer } from 'vite';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { FrameworkDef } from './types.js';

export async function startFrameworkServer(framework: FrameworkDef): Promise<{ server: ViteDevServer | PreviewServer; url: string }> {
  process.chdir(framework.dir);
  const distDir = resolve(framework.dir, 'dist');

  // Serve production build if dist directory exists
  if (existsSync(distDir)) {
    const server = await preview({
      root: framework.dir,
      preview: {
        port: framework.port,
        strictPort: false,
        host: '127.0.0.1',
      },
      logLevel: 'error',
    });

    const address = server.httpServer?.address();
    const actualPort = typeof address === 'object' && address ? address.port : framework.port;
    const url = `http://127.0.0.1:${actualPort}/index.html`;

    return { server, url };
  }

  // Fallback to dev server if not yet built
  const server = await createServer({
    root: framework.dir,
    server: {
      port: framework.port,
      strictPort: false,
      host: '127.0.0.1',
    },
    logLevel: 'error',
  });

  await server.listen();
  const address = server.httpServer?.address();
  const actualPort = typeof address === 'object' && address ? address.port : framework.port;
  const url = `http://127.0.0.1:${actualPort}/index.html`;

  return { server, url };
}
