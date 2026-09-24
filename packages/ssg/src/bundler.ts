import fs from 'node:fs';
import path from 'node:path';
import { build as viteBuild, type InlineConfig } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';
import type { IslandDescriptor } from '../types/index.js';
import type { DriftSSGConfig } from '../types/config.js';

export interface IslandBundleResult {
  scriptTag?: string;
  assetPath?: string;
  size: number;
}

/**
 * Generates client bootstrap source code for selective island hydration.
 */
export function generateIslandBootstrapSource(
  islands: IslandDescriptor[],
  rootDir: string
): string {
  if (islands.length === 0) return '';

  const uniqueIslands = new Map<string, string>();
  for (const island of islands) {
    if (!uniqueIslands.has(island.name)) {
      uniqueIslands.set(island.name, island.componentPath);
    }
  }

  const importLines: string[] = ["import { hydrateIslands } from 'driftjs-dom';"];
  const componentRegistrations: string[] = [];

  let idx = 0;
  for (const [name, compPath] of uniqueIslands.entries()) {
    const importName = `__drift_comp_${idx++}`;
    let resolvedImport = compPath;
    if (path.isAbsolute(compPath)) {
      resolvedImport = path.relative(rootDir, compPath);
      if (!resolvedImport.startsWith('.')) {
        resolvedImport = `./${resolvedImport}`;
      }
    }
    importLines.push(`import ${importName} from '${resolvedImport}';`);
    componentRegistrations.push(`  ${JSON.stringify(name)}: ${importName}`);
  }

  return `${importLines.join('\n')}

if (typeof document !== 'undefined') {
  hydrateIslands(document.body, {
${componentRegistrations.join(',\n')}
  });
}
`;
}

/**
 * Builds and bundles client islands for production using Vite.
 * If no islands exist, returns empty result (Zero-JS).
 */
export async function bundleIslands(
  islands: IslandDescriptor[],
  config: DriftSSGConfig
): Promise<IslandBundleResult> {
  if (islands.length === 0) {
    return { size: 0 };
  }

  const tempEntryDir = path.resolve(config.root, '.drift-ssg-temp');
  if (!fs.existsSync(tempEntryDir)) {
    fs.mkdirSync(tempEntryDir, { recursive: true });
  }

  const entryFile = path.resolve(tempEntryDir, 'islands-entry.js');
  const bootstrapCode = generateIslandBootstrapSource(islands, config.root);
  fs.writeFileSync(entryFile, bootstrapCode, 'utf8');

  try {
    const viteConfig: InlineConfig = {
      root: config.root,
      plugins: [driftPlugin()],
      build: {
        outDir: config.outDir,
        emptyOutDir: false,
        minify: true,
        rollupOptions: {
          input: {
            islands: entryFile,
          },
          output: {
            entryFileNames: 'assets/island-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          },
        },
      },
      ...config.vite,
    };

    const buildOutput = (await viteBuild(viteConfig)) as any;
    let assetFileName = '';
    let totalSize = 0;

    if (Array.isArray(buildOutput)) {
      for (const out of buildOutput) {
        if (out.output) {
          for (const chunk of out.output) {
            if (chunk.fileName && chunk.fileName.includes('island')) {
              assetFileName = chunk.fileName;
              totalSize += chunk.code ? Buffer.byteLength(chunk.code, 'utf8') : 0;
            }
          }
        }
      }
    } else if (buildOutput && buildOutput.output) {
      for (const chunk of buildOutput.output) {
        if (chunk.fileName && chunk.fileName.includes('island')) {
          assetFileName = chunk.fileName;
          totalSize += chunk.code ? Buffer.byteLength(chunk.code, 'utf8') : 0;
        }
      }
    }

    const scriptSrc = assetFileName ? `${config.base}${assetFileName}` : '';
    const scriptTag = scriptSrc ? `<script type="module" src="${scriptSrc}"></script>` : '';

    return {
      scriptTag,
      assetPath: assetFileName,
      size: totalSize,
    };
  } finally {
    // Clean up temporary entry
    try {
      if (fs.existsSync(tempEntryDir)) {
        fs.rmSync(tempEntryDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors
    }
  }
}
