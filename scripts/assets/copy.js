import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rootDir, sourceAssets, targetDirs } from './config.js';

export function copyAssets() {
  if (!fs.existsSync(sourceAssets)) {
    console.error(`[copy-assets] Error: Source assets directory not found at ${sourceAssets}`);
    process.exit(1);
  }

  for (const destDir of targetDirs) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(sourceAssets, destDir, { recursive: true });
    console.log(`[copy-assets] Copied assets/ -> ${path.relative(rootDir, destDir)}/`);
  }
}

// Execute directly if run as main script
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  copyAssets();
}
