import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffoldProject, detectPackageManager, sanitizeDependencies } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('DriftJS CLI Scaffolder', () => {
  const testDir = path.resolve(process.cwd(), 'scratch/cli-test-temp');
  const templateDir = path.resolve(testDir, 'fake-template');
  const targetDir = path.resolve(testDir, 'my-test-app');

  beforeEach(() => {
    // Clean and set up test fixture
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(templateDir, { recursive: true });

    // Create dummy template files
    fs.writeFileSync(path.join(templateDir, 'index.html'), '<h1>Test Template</h1>');
    fs.writeFileSync(
      path.join(templateDir, 'package.json'),
      JSON.stringify(
        {
          name: 'starter-template',
          version: '0.0.0',
          dependencies: {
            'driftjs-dom': 'workspace:*',
            'driftjs-ssr': 'workspace:*',
          },
        },
        null,
        2
      )
    );

    const srcDir = path.join(templateDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'App.drift'), '<script>\n  let count = 0;\n</script>');

    // Create ignored folders
    const nodeModulesDir = path.join(templateDir, 'node_modules');
    fs.mkdirSync(nodeModulesDir, { recursive: true });
    fs.writeFileSync(path.join(nodeModulesDir, 'dummy.txt'), 'ignored');

    const distDir = path.join(templateDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'build.js'), 'ignored');
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should scaffold project files correctly from template directory', () => {
    scaffoldProject({
      projectName: 'my-custom-app',
      targetDir,
      templateDir,
    });

    expect(fs.existsSync(path.join(targetDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'src/App.drift'))).toBe(true);
    expect(fs.readFileSync(path.join(targetDir, 'index.html'), 'utf8')).toContain('<h1>Test Template</h1>');
  });

  it('should update target package.json with custom project name', () => {
    scaffoldProject({
      projectName: 'my-custom-app',
      targetDir,
      templateDir,
    });

    const targetPkgPath = path.join(targetDir, 'package.json');
    expect(fs.existsSync(targetPkgPath)).toBe(true);

    const pkgData = JSON.parse(fs.readFileSync(targetPkgPath, 'utf8'));
    expect(pkgData.name).toBe('my-custom-app');
    expect(pkgData.version).toBe('0.0.0');
  });

  it('should sanitize workspace:* dependency specifiers for standard package managers', () => {
    scaffoldProject({
      projectName: 'clean-deps-app',
      targetDir,
      templateDir,
    });

    const pkgData = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    expect(pkgData.dependencies['driftjs-dom']).not.toContain('workspace:');
  });

  it('should remove driftjs-ssr dependency, server.js, and scripts.serve when CSR mode is selected', () => {
    fs.writeFileSync(path.join(templateDir, 'server.js'), '// SSR server');

    scaffoldProject({
      projectName: 'csr-app',
      targetDir,
      templateDir,
      renderMode: 'csr',
    });

    const pkgData = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    expect(pkgData.dependencies['driftjs-dom']).toBeDefined();
    expect(pkgData.dependencies['driftjs-ssr']).toBeUndefined();
    expect(fs.existsSync(path.join(targetDir, 'server.js'))).toBe(false);
  });

  it('should retain driftjs-dom and driftjs-ssr dependencies when SSR mode is selected', () => {
    scaffoldProject({
      projectName: 'ssr-app',
      targetDir,
      templateDir,
      renderMode: 'ssr',
    });

    const pkgData = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    expect(pkgData.dependencies['driftjs-ssr']).toBeDefined();
    expect(pkgData.dependencies['driftjs-dom']).toBeDefined();
  });

  it('should skip node_modules and dist directories during copy', () => {
    scaffoldProject({
      projectName: 'my-custom-app',
      targetDir,
      templateDir,
    });

    expect(fs.existsSync(path.join(targetDir, 'node_modules'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'dist'))).toBe(false);
  });

  it('should throw error if template directory does not exist', () => {
    expect(() => {
      scaffoldProject({
        projectName: 'my-app',
        targetDir: path.join(testDir, 'fail-target'),
        templateDir: path.join(testDir, 'non-existent-template'),
      });
    }).toThrow('Template directory not found');
  });

  it('should detect package manager correctly from user agent', () => {
    const origUserAgent = process.env.npm_config_user_agent;

    process.env.npm_config_user_agent = 'pnpm/11.17.0 npm/? node/v20.0.0 linux x64';
    expect(detectPackageManager()).toBe('pnpm');

    process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v20.0.0';
    expect(detectPackageManager()).toBe('yarn');

    process.env.npm_config_user_agent = 'bun/1.0.0';
    expect(detectPackageManager()).toBe('bun');

    process.env.npm_config_user_agent = 'npm/10.0.0 node/v20.0.0';
    expect(detectPackageManager()).toBe('npm');

    process.env.npm_config_user_agent = origUserAgent;
  });

  it('should clear existing directory when overwriteMode is empty', () => {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'old-file.txt'), 'old content');

    scaffoldProject({
      projectName: 'cleared-app',
      targetDir,
      templateDir,
      overwriteMode: 'empty',
    });

    expect(fs.existsSync(path.join(targetDir, 'old-file.txt'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'index.html'))).toBe(true);
  });

  it('should preserve existing files when overwriteMode is ignore', () => {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'custom-config.json'), '{}');

    scaffoldProject({
      projectName: 'merged-app',
      targetDir,
      templateDir,
      overwriteMode: 'ignore',
    });

    expect(fs.existsSync(path.join(targetDir, 'custom-config.json'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'index.html'))).toBe(true);
  });

  it('should sanitize workspace:^, workspace:~, and workspace:* range specifiers', () => {
    const deps = {
      'driftjs-dom': 'workspace:*',
      'driftjs-compiler': 'workspace:^',
      'driftjs-shared': 'workspace:~',
      'driftjs-router': 'workspace:^0.0.5',
    };
    sanitizeDependencies(deps, '^0.0.7');

    expect(deps['driftjs-dom']).toBe('^0.0.7');
    expect(deps['driftjs-compiler']).toBe('^0.0.7');
    expect(deps['driftjs-shared']).toBe('~0.0.7');
    expect(deps['driftjs-router']).toBe('^0.0.5');
  });

  it('should install ESLint and Prettier plugins and configurations by default', () => {
    scaffoldProject({
      projectName: 'lint-enabled-app',
      targetDir,
      templateDir,
      installLintTools: true,
    });

    expect(fs.existsSync(path.join(targetDir, 'eslint.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.prettierrc'))).toBe(true);

    const pkgData = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    expect(pkgData.devDependencies['driftjs-eslint-plugin']).toBeDefined();
    expect(pkgData.devDependencies['driftjs-prettier-plugin']).toBeDefined();
    expect(pkgData.devDependencies['eslint']).toBeDefined();
    expect(pkgData.devDependencies['prettier']).toBeDefined();

    // Verify zero workspace:* specifiers in package.json
    for (const [name, version] of Object.entries({
      ...pkgData.dependencies,
      ...pkgData.devDependencies,
    })) {
      expect(version).not.toContain('workspace:');
    }

    expect(pkgData.scripts['lint']).toBe('eslint .');
    expect(pkgData.scripts['format']).toBe('prettier --write .');
    expect(pkgData.scripts['format:check']).toBe('prettier --check .');
  });

  it('should omit ESLint and Prettier plugins and configurations when installLintTools is false', () => {
    // Add dummy config files to templateDir to ensure they are omitted/cleaned up
    fs.writeFileSync(path.join(templateDir, 'eslint.config.js'), '// lint');
    fs.writeFileSync(path.join(templateDir, '.prettierrc'), '{}');

    scaffoldProject({
      projectName: 'lint-disabled-app',
      targetDir,
      templateDir,
      installLintTools: false,
    });

    expect(fs.existsSync(path.join(targetDir, 'eslint.config.js'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.prettierrc'))).toBe(false);

    const pkgData = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    expect(pkgData.devDependencies?.['driftjs-eslint-plugin']).toBeUndefined();
    expect(pkgData.devDependencies?.['driftjs-prettier-plugin']).toBeUndefined();
    expect(pkgData.devDependencies?.['eslint']).toBeUndefined();
    expect(pkgData.devDependencies?.['prettier']).toBeUndefined();
    expect(pkgData.scripts?.['lint']).toBeUndefined();
    expect(pkgData.scripts?.['format']).toBeUndefined();
    expect(pkgData.scripts?.['format:check']).toBeUndefined();
  });

  it('should scaffold successfully from the canonical template directory with clean semver', () => {
    const canonicalTemplateDir = path.resolve(__dirname, '../template');

    scaffoldProject({
      projectName: 'canonical-app',
      targetDir,
      templateDir: canonicalTemplateDir,
    });

    expect(fs.existsSync(path.join(targetDir, 'eslint.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.prettierrc'))).toBe(true);

    const pkgData = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    expect(pkgData.name).toBe('canonical-app');
    expect(pkgData.devDependencies['driftjs-eslint-plugin']).toBeDefined();
    expect(pkgData.devDependencies['driftjs-prettier-plugin']).toBeDefined();

    // Verify absolutely no workspace:* remains in dependencies or devDependencies
    const allDeps = {
      ...(pkgData.dependencies || {}),
      ...(pkgData.devDependencies || {}),
    };
    for (const [dep, version] of Object.entries(allDeps)) {
      expect(version).not.toContain('workspace:');
    }
  });
});
