import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, '../..');
export const sourceAssets = path.join(rootDir, 'assets');

export const targetDirs = [
  path.join(rootDir, 'packages', 'vscode-plugin', 'assets'),
  path.join(rootDir, 'devtool', 'public', 'assets'),
  path.join(rootDir, 'docs', 'public', 'assets'),
];
