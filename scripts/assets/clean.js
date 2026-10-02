import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rootDir, targetDirs } from './config.js';

export function cleanAssets() {
  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`[clean-assets] Removed ${path.relative(rootDir, dir)}/`);
    }
  }
}

// Execute directly if run as main script
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  cleanAssets();
}
