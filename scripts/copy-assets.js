import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceIcon = path.join(rootDir, 'assets', 'icon.png');

if (!fs.existsSync(sourceIcon)) {
  console.error(`[copy-assets] Error: Source icon not found at ${sourceIcon}`);
  process.exit(1);
}

const targets = [
  path.join(rootDir, 'packages', 'vscode-plugin', 'assets', 'icon.png'),
  path.join(rootDir, 'devtool', 'public', 'icon.png'),
  path.join(rootDir, 'docs', 'public', 'icon.png'),
];

for (const destPath of targets) {
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(sourceIcon, destPath);
  console.log(`[copy-assets] Copied assets/icon.png -> ${path.relative(rootDir, destPath)}`);
}
