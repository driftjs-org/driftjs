import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import type { ScaffoldOptions } from '../types/index.js';

export * from '../types/index.js';

const ALLOWED_PACKAGE_MANAGERS = new Set<string>(['npm', 'pnpm', 'yarn', 'bun']);

/**
 * Scaffolds a new DriftJS project by copying the starter template.
 */
export function scaffoldProject(options: ScaffoldOptions): void {
  const { projectName, targetDir, templateDir, renderMode, overwriteMode } = options;

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found at: ${templateDir}`);
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

  // Update target package.json with custom project name and rendering dependencies
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
      const serverJsPath = path.join(targetDir, 'server.js');
      if (fs.existsSync(serverJsPath)) {
        fs.rmSync(serverJsPath, { force: true });
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

    // Sanitize any remaining workspace:* protocols so npm/yarn/bun/pnpm work seamlessly
    sanitizeDependencies(pkgData.dependencies, defaultCaret);
    sanitizeDependencies(pkgData.devDependencies, defaultCaret);

    fs.writeFileSync(targetPkgPath, JSON.stringify(pkgData, null, 2), 'utf8');
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
  console.log(`\n⚡ \x1b[32mStarting DriftJS Vite dev server with ${pm} dev...\x1b[0m\n`);
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
