import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceAssets = path.join(rootDir, 'assets');

if (!fs.existsSync(sourceAssets)) {
  console.error(`[copy-assets] Error: Source assets directory not found at ${sourceAssets}`);
  process.exit(1);
}

const targetDirs = [
  path.join(rootDir, 'packages', 'vscode-plugin', 'assets'),
  path.join(rootDir, 'devtool', 'public', 'assets'),
  path.join(rootDir, 'docs', 'public', 'assets'),
];

for (const destDir of targetDirs) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(sourceAssets, destDir, { recursive: true });
  console.log(`[copy-assets] Copied assets/ -> ${path.relative(rootDir, destDir)}/`);
}
