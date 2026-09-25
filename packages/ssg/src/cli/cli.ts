import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import pc from 'picocolors';
import { build } from '../build/index.js';
import { createDevServer } from '../server/index.js';
import { loadConfig } from '../config/index.js';

export async function runCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const command = args[0] || 'build';

  if (command === 'build') {
    const rootIdx = args.indexOf('--root');
    const root = rootIdx !== -1 && args[rootIdx + 1] ? args[rootIdx + 1] : process.cwd();
    const configIdx = args.indexOf('--config');
    const configFile = configIdx !== -1 && args[configIdx + 1] ? args[configIdx + 1] : undefined;

    await build({ root, configFile });
    return;
  }

  if (command === 'dev') {
    const portIdx = args.indexOf('--port');
    const port = portIdx !== -1 && args[portIdx + 1] ? parseInt(args[portIdx + 1]!, 10) : 3000;
    const hostIdx = args.indexOf('--host');
    const host = hostIdx !== -1 && args[hostIdx + 1] ? args[hostIdx + 1] : 'localhost';

    console.log(`\n⚡ ${pc.bold(pc.cyan('Drift Static Dev Server'))}\n`);
    const devServer = await createDevServer({ port, host });
    console.log(`  ${pc.green('➜')}  Local:   ${pc.cyan(`http://${host}:${devServer.port}/`)}`);
    console.log(`  ${pc.gray('➜')}  press ${pc.bold('Ctrl+C')} to stop\n`);
    return;
  }

  if (command === 'preview') {
    const portIdx = args.indexOf('--port');
    const port = portIdx !== -1 && args[portIdx + 1] ? parseInt(args[portIdx + 1]!, 10) : 4173;
    const config = await loadConfig();

    if (!fs.existsSync(config.outDir)) {
      console.error(pc.red(`\nError: Output directory "${config.outDir}" does not exist. Run "drift-ssg build" first.\n`));
      process.exit(1);
    }

    const server = http.createServer((req, res) => {
      const rawUrl = req.url || '/';
      const pathname = rawUrl.split('?')[0] || '/';
      let filePath = path.join(config.outDir, pathname);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.html`)) {
        filePath = `${filePath}.html`;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json',
          '.xml': 'application/xml',
          '.txt': 'text/plain',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.end(fs.readFileSync(filePath));
      } else {
        const notFoundPath = path.join(config.outDir, '404.html');
        if (fs.existsSync(notFoundPath)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(fs.readFileSync(notFoundPath));
        } else {
          res.statusCode = 404;
          res.end('404 Not Found');
        }
      }
    });

    server.listen(port, () => {
      console.log(`\n🔍 ${pc.bold(pc.cyan('Drift Static Preview'))}\n`);
      console.log(`  ${pc.green('➜')}  Local:   ${pc.cyan(`http://localhost:${port}/`)}`);
      console.log(`  ${pc.gray('➜')}  press ${pc.bold('Ctrl+C')} to stop\n`);
    });
    return;
  }

  console.log(`
Usage: drift-ssg <command> [options]

Commands:
  dev       Start the development server with on-demand SSG and HMR
  build     Build static site for production (pre-render HTML and bundle islands)
  preview   Preview production build from output directory

Options:
  --port <port>   Specify server port (default: 3000 for dev, 4173 for preview)
  --host <host>   Specify server host (default: localhost)
  --root <dir>    Specify root project directory
  --config <file> Specify custom config file
`);
}
