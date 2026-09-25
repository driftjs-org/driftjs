import type http from 'node:http';
import type { ViteDevServer } from 'vite';

export interface DevServerOptions {
  root?: string | undefined;
  port?: number | undefined;
  host?: string | undefined;
  configFile?: string | undefined;
}

export interface DevServerInstance {
  server: http.Server;
  vite: ViteDevServer;
  port: number;
  close: () => Promise<void>;
}
