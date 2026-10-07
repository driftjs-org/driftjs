import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeNewVersion,
  updateTemplateDependencies,
  updateTemplateFile,
  bumpVersion,
} from '../../../scripts/version/bump.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('BUG-07: Version Bump and Template Synchronization', () => {
  const scratchDir = path.resolve(__dirname, '../../../scratch/bump-test-temp');

  beforeEach(() => {
    if (fs.existsSync(scratchDir)) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
    }
    fs.mkdirSync(scratchDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(scratchDir)) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  it('computes next semver version correctly for patch, minor, and major increments', () => {
    expect(computeNewVersion('0.0.17', 'patch')).toBe('0.0.18');
    expect(computeNewVersion('0.0.17', 'minor')).toBe('0.1.0');
    expect(computeNewVersion('0.0.17', 'major')).toBe('1.0.0');
    expect(computeNewVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(computeNewVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(computeNewVersion('1.2.3', 'major')).toBe('2.0.0');
  });

  it('throws on invalid release type', () => {
    expect(() => computeNewVersion('0.0.17', 'invalid')).toThrow('Invalid release type: invalid');
  });

  it('updates driftjs dependencies regardless of whether previous version had caret or not', () => {
    const pkgData = {
      name: 'test-template',
      version: '0.0.0',
      dependencies: {
        'driftjs-compiler': '0.0.16', // no caret
        'driftjs-dom': '^0.0.16',     // with caret
        'driftjs-ssr': '0.0.15',
        'express': '^4.18.2',         // third-party
      },
      devDependencies: {
        'driftjs-eslint-plugin': '0.0.16',
        'driftjs-prettier-plugin': '^0.0.16',
        'driftjs-unplugin': '0.0.17',
        'eslint': '10.11.0',          // third-party
        'vite': '8.3.1',              // third-party
      },
    };

    const modified = updateTemplateDependencies(pkgData, '0.0.18');
    expect(modified).toBe(true);

    expect(pkgData.dependencies['driftjs-compiler']).toBe('^0.0.18');
    expect(pkgData.dependencies['driftjs-dom']).toBe('^0.0.18');
    expect(pkgData.dependencies['driftjs-ssr']).toBe('^0.0.18');
    expect(pkgData.dependencies['express']).toBe('^4.18.2'); // preserved

    expect(pkgData.devDependencies['driftjs-eslint-plugin']).toBe('^0.0.18');
    expect(pkgData.devDependencies['driftjs-prettier-plugin']).toBe('^0.0.18');
    expect(pkgData.devDependencies['driftjs-unplugin']).toBe('^0.0.18');
    expect(pkgData.devDependencies['eslint']).toBe('10.11.0'); // preserved
    expect(pkgData.devDependencies['vite']).toBe('8.3.1');    // preserved
  });

  it('updates template package.json file on disk and preserves formatting', () => {
    const filePath = path.join(scratchDir, 'template-package.json');
    const initial = {
      name: 'driftjs-template',
      version: '0.0.0',
      dependencies: {
        'driftjs-compiler': '0.0.16',
        'driftjs-dom': '0.0.16',
      },
    };
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2) + '\n', 'utf8');

    const updated = updateTemplateFile(filePath, '0.0.18');
    expect(updated).toBe(true);

    const reloaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(reloaded.dependencies['driftjs-compiler']).toBe('^0.0.18');
    expect(reloaded.dependencies['driftjs-dom']).toBe('^0.0.18');
  });

  it('runs isolated bumpVersion updating both workspace packages and CLI templates', () => {
    const mockPackagesDir = path.join(scratchDir, 'packages');
    const mockCliDir = path.join(mockPackagesDir, 'cli');
    const mockTemplateDir = path.join(mockCliDir, 'template');
    const mockCompilerDir = path.join(mockPackagesDir, 'compiler');

    fs.mkdirSync(mockTemplateDir, { recursive: true });
    fs.mkdirSync(mockCompilerDir, { recursive: true });

    // Mock CLI package.json
    fs.writeFileSync(
      path.join(mockCliDir, 'package.json'),
      JSON.stringify({ name: 'create-drift', version: '0.0.17' }, null, 2)
    );

    // Mock Compiler package.json
    fs.writeFileSync(
      path.join(mockCompilerDir, 'package.json'),
      JSON.stringify({ name: 'driftjs-compiler', version: '0.0.17' }, null, 2)
    );

    // Mock Template package.json (outdated without caret)
    fs.writeFileSync(
      path.join(mockTemplateDir, 'package.json'),
      JSON.stringify(
        {
          name: 'template',
          version: '0.0.0',
          dependencies: {
            'driftjs-compiler': '0.0.16',
          },
          devDependencies: {
            'driftjs-eslint-plugin': '0.0.16',
          },
        },
        null,
        2
      )
    );

    // Bump version patch
    const res = bumpVersion('patch', {
      packagesDir: mockPackagesDir,
      silent: true,
      throwOnError: true,
    });

    expect(res.oldVersion).toBe('0.0.17');
    expect(res.newVersion).toBe('0.0.18');

    // Verify workspace packages were bumped
    const bumpedCli = JSON.parse(fs.readFileSync(path.join(mockCliDir, 'package.json'), 'utf8'));
    expect(bumpedCli.version).toBe('0.0.18');

    const bumpedCompiler = JSON.parse(fs.readFileSync(path.join(mockCompilerDir, 'package.json'), 'utf8'));
    expect(bumpedCompiler.version).toBe('0.0.18');

    // Verify CLI template package was synchronized
    const bumpedTemplate = JSON.parse(fs.readFileSync(path.join(mockTemplateDir, 'package.json'), 'utf8'));
    expect(bumpedTemplate.dependencies['driftjs-compiler']).toBe('^0.0.18');
    expect(bumpedTemplate.devDependencies['driftjs-eslint-plugin']).toBe('^0.0.18');
  });

  it('ensures the repository canonical CLI template dependencies match current CLI package version', () => {
    const cliPkgPath = path.resolve(__dirname, '../package.json');
    const templatePkgPath = path.resolve(__dirname, '../template/package.json');

    const cliPkg = JSON.parse(fs.readFileSync(cliPkgPath, 'utf8'));
    const templatePkg = JSON.parse(fs.readFileSync(templatePkgPath, 'utf8'));

    const expectedVersion = `^${cliPkg.version}`;

    for (const [dep, version] of Object.entries(templatePkg.dependencies || {})) {
      if (dep.startsWith('driftjs-')) {
        expect(version).toBe(expectedVersion);
      }
    }

    for (const [dep, version] of Object.entries(templatePkg.devDependencies || {})) {
      if (dep.startsWith('driftjs-')) {
        expect(version).toBe(expectedVersion);
      }
    }
  });
});
