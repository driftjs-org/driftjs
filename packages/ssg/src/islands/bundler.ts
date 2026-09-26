import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build as viteBuild, type InlineConfig } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';
import type { IslandDescriptor, DriftSSGConfig, IslandBundleResult } from '../../types/index.js';

export type { IslandBundleResult };


/**
 * Generates client bootstrap source code for selective island hydration.
 */
export function generateIslandBootstrapSource(
  islands: IslandDescriptor[],
  rootDir: string,
  fromDir?: string
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
      if (fromDir) {
        resolvedImport = path.relative(fromDir, compPath);
        if (!resolvedImport.startsWith('.')) {
          resolvedImport = `./${resolvedImport}`;
        }
      } else {
        const rel = path.relative(rootDir, compPath).replace(/\\/g, '/');
        resolvedImport = rel.startsWith('..')
          ? `/@fs${compPath.startsWith('/') ? '' : '/'}${compPath.replace(/\\/g, '/')}`
          : `/${rel.replace(/^\/+/, '')}`;
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

export interface IslandBundleOptions {
  cssFiles?: string[] | undefined;
}

/**
 * Builds and bundles client islands and site CSS for production using Vite.
 * If no islands and no CSS exist, returns empty result (Zero-JS).
 */
export async function bundleIslands(
  islands: IslandDescriptor[],
  config: DriftSSGConfig,
  options: IslandBundleOptions = {}
): Promise<IslandBundleResult> {
  const cssFiles = options.cssFiles || [];
  if (islands.length === 0 && cssFiles.length === 0) {
    return { size: 0, cssSize: 0 };
  }

  const tempEntryDir = path.resolve(config.root, '.drift-ssg-temp');
  if (!fs.existsSync(tempEntryDir)) {
    fs.mkdirSync(tempEntryDir, { recursive: true });
  }

  const rollupInput: Record<string, string> = {};

  if (islands.length > 0) {
    const entryFile = path.resolve(tempEntryDir, 'islands-entry.js');
    const bootstrapCode = generateIslandBootstrapSource(islands, config.root, tempEntryDir);
    fs.writeFileSync(entryFile, bootstrapCode, 'utf8');
    rollupInput.islands = entryFile;
  }

  if (cssFiles.length > 0) {
    const cssEntryFile = path.resolve(tempEntryDir, 'styles-entry.js');
    const cssImports = cssFiles.map((f) => `import ${JSON.stringify(f)};`).join('\n');
    fs.writeFileSync(cssEntryFile, cssImports, 'utf8');
    rollupInput.styles = cssEntryFile;
  }

  try {
    let domPath: string;
    try {
      domPath = fileURLToPath(import.meta.resolve('driftjs-dom'));
    } catch {
      try {
        const req = typeof require !== 'undefined' ? require : createRequire(typeof __filename !== 'undefined' ? __filename : (import.meta.url || 'file://' + process.cwd()));
        domPath = req.resolve('driftjs-dom');
      } catch {
        domPath = 'driftjs-dom';
      }
    }

    const viteConfig: InlineConfig = {
      root: config.root,
      plugins: [driftPlugin()],
      resolve: {
        alias: {
          'driftjs-dom': domPath,
          ...(config.vite?.resolve?.alias || {}),
        },
      },
      build: {
        outDir: config.outDir,
        emptyOutDir: false,
        minify: true,
        cssMinify: true,
        rollupOptions: {
          input: rollupInput,
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
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
    let cssAssetFileName = '';
    let totalCssSize = 0;

    const allOutputs: any[] = [];
    if (Array.isArray(buildOutput)) {
      for (const out of buildOutput) {
        if (out.output) allOutputs.push(...out.output);
      }
    } else if (buildOutput && buildOutput.output) {
      allOutputs.push(...buildOutput.output);
    }

    for (const item of allOutputs) {
      if (!item.fileName) continue;

      if (item.type === 'asset' && item.fileName.endsWith('.css')) {
        cssAssetFileName = item.fileName;
        totalCssSize += item.source ? Buffer.byteLength(String(item.source), 'utf8') : 0;
      } else if (item.type === 'chunk' && item.fileName.includes('island')) {
        assetFileName = item.fileName;
        totalSize += item.code ? Buffer.byteLength(item.code, 'utf8') : 0;
      } else if (item.type === 'chunk' && item.fileName.includes('styles') && item.fileName.endsWith('.js')) {
        // Clean up dummy JS entry emitted for CSS
        const jsFile = path.resolve(config.outDir, item.fileName);
        if (fs.existsSync(jsFile)) {
          try {
            fs.unlinkSync(jsFile);
          } catch {
            // ignore
          }
        }
      }
    }

    const scriptSrc = assetFileName
      ? (config.base.endsWith('/') ? `${config.base}${assetFileName}` : `${config.base}/${assetFileName}`)
      : '';
    const scriptTag = scriptSrc ? `<script type="module" src="${scriptSrc}"></script>` : '';

    const cssHref = cssAssetFileName
      ? (config.base.endsWith('/') ? `${config.base}${cssAssetFileName}` : `${config.base}/${cssAssetFileName}`)
      : '';
    const cssTag = cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : '';

    return {
      scriptTag,
      assetPath: assetFileName,
      size: totalSize,
      cssTag,
      cssAssetPath: cssAssetFileName,
      cssSize: totalCssSize,
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
