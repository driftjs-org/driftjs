import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import type { ScaffoldOptions, BuildTool } from '../types/index.js';

export * from '../types/index.js';

const ALLOWED_PACKAGE_MANAGERS = new Set<string>(['npm', 'pnpm', 'yarn', 'bun']);

export const SUPPORTED_BUILD_TOOLS: readonly BuildTool[] = ['vite', 'rollup', 'webpack', 'esbuild', 'rspack'] as const;

const VITE_CONFIG = `import { defineConfig } from 'vite';
import { vite } from 'driftjs-unplugin';

export default defineConfig({
  plugins: [vite()],
});
`;

const ROLLUP_CONFIG = `import { rollup } from 'driftjs-unplugin';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    rollup(),
    resolve({
      extensions: ['.ts', '.js', '.drift'],
    }),
  ],
};
`;

const WEBPACK_CONFIG = `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webpack } from 'driftjs-unplugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: 'development',
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.drift'],
  },
  module: {
    rules: [
      {
        test: /\\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    webpack(),
    new HtmlWebpackPlugin({
      template: 'index.html',
    }),
  ],
  devServer: {
    port: 3000,
    open: true,
  },
};
`;

const ESBUILD_CONFIG = `import * as esbuild from 'esbuild';
import { esbuild as driftPlugin } from 'driftjs-unplugin';

const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [driftPlugin()],
  loader: {
    '.css': 'copy',
  },
});

if (isWatch) {
  await context.watch();
  const { port } = await context.serve({ servedir: '.' });
  console.log(\`Development server running at http://localhost:\${port}\`);
} else {
  await context.rebuild();
  await context.dispose();
}
`;

const RSPACK_CONFIG = `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rspack } from 'driftjs-unplugin';
import { rspack as rspackCore } from '@rspack/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: 'development',
  entry: {
    main: './src/main.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.drift'],
  },
  module: {
    rules: [
      {
        test: /\\.css$/i,
        type: 'css',
      },
    ],
  },
  plugins: [
    rspack(),
    new rspackCore.HtmlRspackPlugin({
      template: 'index.html',
    }),
  ],
  devServer: {
    port: 3000,
    open: true,
  },
};
`;

const BUILD_TOOL_CONFIGS: Record<BuildTool, { file: string; content: string }> = {
  vite: { file: 'vite.config.ts', content: VITE_CONFIG },
  rollup: { file: 'rollup.config.js', content: ROLLUP_CONFIG },
  webpack: { file: 'webpack.config.js', content: WEBPACK_CONFIG },
  esbuild: { file: 'esbuild.config.js', content: ESBUILD_CONFIG },
  rspack: { file: 'rspack.config.js', content: RSPACK_CONFIG },
};

/**
 * Configures the build tool in the scaffolded project:
 * - Writes the configuration file for the selected bundler.
 * - Removes configuration files for other bundlers.
 * - Updates package.json scripts and devDependencies.
 * - Updates entry script in index.html if needed.
 */
function applyBuildToolConfiguration(
  targetDir: string,
  buildTool: BuildTool,
  pkgData?: any,
  defaultCaret?: string
): void {
  // Remove config files for other build tools
  for (const [tool, config] of Object.entries(BUILD_TOOL_CONFIGS)) {
    if (tool !== buildTool) {
      const configPath = path.join(targetDir, config.file);
      if (fs.existsSync(configPath)) {
        fs.rmSync(configPath, { force: true });
      }
    }
  }

  // Ensure selected build tool config file exists
  const targetConfigFile = path.join(targetDir, BUILD_TOOL_CONFIGS[buildTool].file);
  if (!fs.existsSync(targetConfigFile)) {
    fs.writeFileSync(targetConfigFile, BUILD_TOOL_CONFIGS[buildTool].content, 'utf8');
  }

  // Adjust index.html for bundler-specific entry script tag
  const indexHtmlPath = path.join(targetDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let html = fs.readFileSync(indexHtmlPath, 'utf8');
    if (buildTool === 'rollup') {
      html = html.replace('/src/main.ts', '/dist/bundle.js');
    } else if (buildTool === 'esbuild') {
      html = html.replace('/src/main.ts', 'dist/bundle.js');
    } else if (buildTool === 'webpack' || buildTool === 'rspack') {
      html = html.replace(/\s*<script type="module" src="\/src\/main\.ts"><\/script>/, '');
    }
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
  }

  // Update scripts and devDependencies in pkgData if provided
  if (pkgData) {
    pkgData.scripts = pkgData.scripts || {};
    pkgData.devDependencies = pkgData.devDependencies || {};
    if (defaultCaret) {
      pkgData.devDependencies['driftjs-unplugin'] = pkgData.devDependencies['driftjs-unplugin'] || defaultCaret;
    }

    if (buildTool === 'vite') {
      pkgData.scripts['dev'] = 'vite';
      pkgData.scripts['build'] = 'vite build';
      pkgData.scripts['preview'] = 'vite preview';
      pkgData.devDependencies['vite'] = pkgData.devDependencies['vite'] || '^8.3.1';
    } else if (buildTool === 'rollup') {
      pkgData.scripts['dev'] = 'rollup -c -w';
      pkgData.scripts['build'] = 'rollup -c';
      delete pkgData.scripts['preview'];
      delete pkgData.devDependencies['vite'];
      pkgData.devDependencies['rollup'] = '^4.34.8';
      pkgData.devDependencies['@rollup/plugin-node-resolve'] = '^16.0.0';
    } else if (buildTool === 'webpack') {
      pkgData.scripts['dev'] = 'webpack serve';
      pkgData.scripts['build'] = 'webpack --mode production';
      delete pkgData.scripts['preview'];
      delete pkgData.devDependencies['vite'];
      pkgData.devDependencies['webpack'] = '^5.98.0';
      pkgData.devDependencies['webpack-cli'] = '^6.0.1';
      pkgData.devDependencies['webpack-dev-server'] = '^5.2.0';
      pkgData.devDependencies['html-webpack-plugin'] = '^5.6.3';
      pkgData.devDependencies['style-loader'] = '^4.0.0';
      pkgData.devDependencies['css-loader'] = '^7.1.2';
    } else if (buildTool === 'esbuild') {
      pkgData.scripts['dev'] = 'node esbuild.config.js --watch';
      pkgData.scripts['build'] = 'node esbuild.config.js';
      delete pkgData.scripts['preview'];
      delete pkgData.devDependencies['vite'];
      pkgData.devDependencies['esbuild'] = '^0.25.0';
    } else if (buildTool === 'rspack') {
      pkgData.scripts['dev'] = 'rspack serve';
      pkgData.scripts['build'] = 'rspack build';
      delete pkgData.scripts['preview'];
      delete pkgData.devDependencies['vite'];
      pkgData.devDependencies['@rspack/core'] = '^1.2.4';
      pkgData.devDependencies['@rspack/cli'] = '^1.2.4';
    }
  }
}

/**
 * Scaffolds a new DriftJS project by copying the starter template.
 */
export function scaffoldProject(options: ScaffoldOptions): void {
  const { projectName, targetDir, templateDir, renderMode, overwriteMode } = options;

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found at: ${templateDir}`);
  }

  const buildTool: BuildTool = options.buildTool || 'vite';
  if (!SUPPORTED_BUILD_TOOLS.includes(buildTool)) {
    throw new Error(
      `Unsupported or invalid build tool: "${buildTool}". Allowed build tools: ${SUPPORTED_BUILD_TOOLS.join(', ')}`
    );
  }

  if (overwriteMode === 'empty' && fs.existsSync(targetDir)) {
    emptyDirectory(targetDir);
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const shouldInstallLint = options.installLintTools !== false;

  // Copy template files recursively
  fs.cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      if (base === 'node_modules' || base === 'dist') return false;
      if (!shouldInstallLint && (base === 'eslint.config.js' || base === '.prettierrc')) return false;
      return true;
    },
  });

  // If lint tools are requested, ensure static config files exist (copy from default template if custom templateDir lacked them)
  if (shouldInstallLint) {
    const defaultTemplateDir = fileURLToPath(new URL('../template', import.meta.url));
    const targetEslint = path.join(targetDir, 'eslint.config.js');
    if (!fs.existsSync(targetEslint)) {
      const defaultEslint = path.join(defaultTemplateDir, 'eslint.config.js');
      if (fs.existsSync(defaultEslint)) {
        fs.copyFileSync(defaultEslint, targetEslint);
      }
    }
    const targetPrettier = path.join(targetDir, '.prettierrc');
    if (!fs.existsSync(targetPrettier)) {
      const defaultPrettier = path.join(defaultTemplateDir, '.prettierrc');
      if (fs.existsSync(defaultPrettier)) {
        fs.copyFileSync(defaultPrettier, targetPrettier);
      }
    }
  }

  // Update target package.json with custom project name, rendering dependencies, and build tool config
  const targetPkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(targetPkgPath)) {
    const pkgData = JSON.parse(fs.readFileSync(targetPkgPath, 'utf8'));
    pkgData.name = projectName;
    pkgData.version = '0.0.0';

    if (renderMode === 'csr') {
      if (pkgData.dependencies) {
        delete pkgData.dependencies['driftjs-ssr'];
      }
      if (pkgData.scripts) {
        delete pkgData.scripts['serve'];
      }
    }

    const version = getPackageVersion();
    const bareVersion = version.replace(/^[\^~]/, '');
    const defaultCaret = version.startsWith('^') ? version : `^${bareVersion}`;

    if (shouldInstallLint) {
      pkgData.devDependencies = pkgData.devDependencies || {};
      pkgData.devDependencies['driftjs-eslint-plugin'] = pkgData.devDependencies['driftjs-eslint-plugin'] || defaultCaret;
      pkgData.devDependencies['driftjs-prettier-plugin'] = pkgData.devDependencies['driftjs-prettier-plugin'] || defaultCaret;
      pkgData.devDependencies['eslint'] = pkgData.devDependencies['eslint'] || '^9.20.0';
      pkgData.devDependencies['prettier'] = pkgData.devDependencies['prettier'] || '^3.5.0';

      pkgData.scripts = pkgData.scripts || {};
      pkgData.scripts['lint'] = pkgData.scripts['lint'] || 'eslint .';
      pkgData.scripts['format'] = pkgData.scripts['format'] || 'prettier --write .';
      pkgData.scripts['format:check'] = pkgData.scripts['format:check'] || 'prettier --check .';
    } else {
      if (pkgData.devDependencies) {
        delete pkgData.devDependencies['driftjs-eslint-plugin'];
        delete pkgData.devDependencies['driftjs-prettier-plugin'];
        delete pkgData.devDependencies['eslint'];
        delete pkgData.devDependencies['prettier'];
      }
      if (pkgData.scripts) {
        delete pkgData.scripts['lint'];
        delete pkgData.scripts['format'];
        delete pkgData.scripts['format:check'];
      }
      const eslintFile = path.join(targetDir, 'eslint.config.js');
      if (fs.existsSync(eslintFile)) {
        fs.rmSync(eslintFile, { force: true });
      }
      const prettierFile = path.join(targetDir, '.prettierrc');
      if (fs.existsSync(prettierFile)) {
        fs.rmSync(prettierFile, { force: true });
      }
    }

    // Configure build tool files, scripts, devDependencies, and entry HTML
    applyBuildToolConfiguration(targetDir, buildTool, pkgData, defaultCaret);

    // Sanitize any remaining workspace:* protocols so npm/yarn/bun/pnpm work seamlessly
    sanitizeDependencies(pkgData.dependencies, defaultCaret);
    sanitizeDependencies(pkgData.devDependencies, defaultCaret);

    fs.writeFileSync(targetPkgPath, JSON.stringify(pkgData, null, 2), 'utf8');
  } else {
    // Even if package.json was not in template, configure the build tool files and HTML
    applyBuildToolConfiguration(targetDir, buildTool);
  }

  const pm = options.packageManager || detectPackageManager();
  if (!ALLOWED_PACKAGE_MANAGERS.has(pm)) {
    throw new Error(`Unsupported or invalid package manager: "${pm}". Allowed package managers: npm, pnpm, yarn, bun`);
  }

  if (options.autoInstall) {
    installDependencies(targetDir, pm);
  }

  if (options.autoRun) {
    startDevServer(targetDir, pm);
  }
}

function getPackageVersion(): string {
  const pkgJsonPath = new URL('../package.json', import.meta.url);
  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`[create-drift] Cannot resolve CLI package.json at: ${pkgJsonPath.pathname}`);
  }
  const raw = fs.readFileSync(pkgJsonPath, 'utf8');
  let pkg: any;
  try {
    pkg = JSON.parse(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[create-drift] Failed to parse CLI package.json at ${pkgJsonPath.pathname}: ${msg}`);
  }
  if (!pkg || typeof pkg.version !== 'string' || pkg.version.trim() === '') {
    throw new Error(`[create-drift] Missing or invalid "version" field in: ${pkgJsonPath.pathname}`);
  }
  return pkg.version.trim();
}

export function sanitizeDependencies(deps?: Record<string, string>, targetVersion?: string): void {
  if (!deps) return;
  const version = targetVersion ?? getPackageVersion();
  const bareVersion = version.replace(/^[\^~]/, '');
  const defaultCaret = version.startsWith('^') ? version : `^${bareVersion}`;
  for (const [key, value] of Object.entries(deps)) {
    if (typeof value === 'string' && value.startsWith('workspace:')) {
      const cleanVersion = value.replace('workspace:', '').trim();
      if (cleanVersion === '*' || cleanVersion === '^' || cleanVersion === '') {
        deps[key] = defaultCaret;
      } else if (cleanVersion === '~') {
        deps[key] = `~${bareVersion}`;
      } else {
        deps[key] = cleanVersion;
      }
    }
  }
}

export function detectPackageManager(): 'pnpm' | 'npm' | 'yarn' | 'bun' {
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';
  if (userAgent.startsWith('bun')) return 'bun';
  return 'npm';
}

export function installDependencies(targetDir: string, pm: string): void {
  if (!ALLOWED_PACKAGE_MANAGERS.has(pm)) {
    throw new Error(`Unsupported or invalid package manager: "${pm}". Allowed package managers: npm, pnpm, yarn, bun`);
  }
  console.log(`\n📦 \x1b[36mInstalling dependencies with ${pm}...\x1b[0m\n`);
  execFileSync(pm, ['install'], {
    cwd: targetDir,
    stdio: 'inherit',
  });
}

export function startDevServer(targetDir: string, pm: string): void {
  if (!ALLOWED_PACKAGE_MANAGERS.has(pm)) {
    throw new Error(`Unsupported or invalid package manager: "${pm}". Allowed package managers: npm, pnpm, yarn, bun`);
  }
  console.log(`\n⚡ \x1b[32mStarting DriftJS dev server with ${pm} dev...\x1b[0m\n`);
  const args = pm === 'npm' ? ['run', 'dev'] : ['dev'];

  spawn(pm, args, {
    cwd: targetDir,
    stdio: 'inherit',
  });
}

export function emptyDirectory(dirPath: string): void {
  const resolved = path.resolve(dirPath);
  const root = path.parse(resolved).root;
  const home = os.homedir();
  if (resolved === root || (home && resolved === home)) {
    throw new Error(`Cannot empty root or home directory: ${dirPath}`);
  }
  if (!fs.existsSync(resolved)) return;
  for (const file of fs.readdirSync(resolved)) {
    if (file === '.git') continue;
    const fullPath = path.join(resolved, file);
    try {
      const stat = fs.lstatSync(fullPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(fullPath);
      } else {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    } catch {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

export function isDirectoryNotEmpty(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) return false;
  const files = fs.readdirSync(dirPath);
  return files.length > 0 && !(files.length === 1 && files[0] === '.git');
}
