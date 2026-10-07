import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const packagesDir = path.join(rootDir, 'packages');

/**
 * Computes next semver version string based on release type.
 */
export function computeNewVersion(oldVersion, releaseType) {
  const parts = oldVersion.split('.').map((num) => parseInt(num, 10) || 0);
  let [major = 0, minor = 0, patch = 0] = parts;

  if (releaseType === 'patch') {
    patch += 1;
  } else if (releaseType === 'minor') {
    minor += 1;
    patch = 0;
  } else if (releaseType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else {
    throw new Error(`Invalid release type: ${releaseType}`);
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Updates DriftJS dependencies in a package.json object.
 * Returns true if any dependency version was modified.
 */
export function updateTemplateDependencies(pkgData, newVersion) {
  let changed = false;
  const updateMap = (deps) => {
    if (!deps || typeof deps !== 'object') return;
    for (const key of Object.keys(deps)) {
      if (key.startsWith('driftjs-') || key.startsWith('@driftjs/') || key === 'create-drift') {
        const next = `^${newVersion}`;
        if (deps[key] !== next) {
          deps[key] = next;
          changed = true;
        }
      }
    }
  };

  updateMap(pkgData.dependencies);
  updateMap(pkgData.devDependencies);
  updateMap(pkgData.peerDependencies);
  return changed;
}

/**
 * Finds all package.json files within CLI starter template directories.
 */
export function findCliTemplatePackageJsons(cliDirPath) {
  const templateFiles = [];
  if (!fs.existsSync(cliDirPath)) return templateFiles;

  const searchDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
          searchDir(fullPath);
        }
      } else if (entry.isFile() && entry.name === 'package.json') {
        if (path.resolve(fullPath) !== path.resolve(cliDirPath, 'package.json')) {
          templateFiles.push(fullPath);
        }
      }
    }
  };

  const templateDir = path.join(cliDirPath, 'template');
  if (fs.existsSync(templateDir)) searchDir(templateDir);
  const templatesDir = path.join(cliDirPath, 'templates');
  if (fs.existsSync(templatesDir)) searchDir(templatesDir);

  return templateFiles;
}

/**
 * Updates a template package.json file with new dependency versions.
 */
export function updateTemplateFile(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return false;
  const templateContent = fs.readFileSync(filePath, 'utf8');

  try {
    const pkgData = JSON.parse(templateContent);
    const changed = updateTemplateDependencies(pkgData, newVersion);
    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8');
      return true;
    }
  } catch {
    // Fallback regex replacement if template file is non-standard JSON
    const regex = /"(driftjs-[^"]+|@driftjs\/[^"]+|create-drift)":\s*"[^"]+"/g;
    const updated = templateContent.replace(regex, `"$1": "^${newVersion}"`);
    if (updated !== templateContent) {
      fs.writeFileSync(filePath, updated, 'utf8');
      return true;
    }
  }

  return false;
}

export function bumpVersion(releaseType, options = {}) {
  const targetPackagesDir = options.packagesDir || packagesDir;
  const packageDirs = fs.readdirSync(targetPackagesDir).filter((name) => {
    const fullPath = path.join(targetPackagesDir, name);
    return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'));
  });

  if (packageDirs.length === 0) {
    console.error(`No packages found in ${targetPackagesDir}`);
    if (options.throwOnError) {
      throw new Error(`No packages found in ${targetPackagesDir}`);
    }
    process.exit(1);
  }

  // Get current version from first package
  const samplePkgPath = path.join(targetPackagesDir, packageDirs[0], 'package.json');
  const samplePkg = JSON.parse(fs.readFileSync(samplePkgPath, 'utf8'));
  const oldVersion = samplePkg.version || '0.0.0';

  let newVersion;
  try {
    newVersion = computeNewVersion(oldVersion, releaseType);
  } catch (err) {
    console.error(err.message);
    if (options.throwOnError) throw err;
    process.exit(1);
  }

  // Update all packages in packages/
  for (const dirName of packageDirs) {
    const pkgPath = path.join(targetPackagesDir, dirName, 'package.json');
    const pkgContent = fs.readFileSync(pkgPath, 'utf8');
    const pkgData = JSON.parse(pkgContent);
    pkgData.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8');
  }

  // Update default targetVersion in packages/cli/src/index.ts if present
  const cliIndexPath = path.join(targetPackagesDir, 'cli', 'src', 'index.ts');
  if (fs.existsSync(cliIndexPath)) {
    let content = fs.readFileSync(cliIndexPath, 'utf8');
    content = content.replace(
      /targetVersion:\s*string\s*=\s*'\^\d+\.\d+\.\d+'/,
      `targetVersion: string = '^${newVersion}'`
    );
    fs.writeFileSync(cliIndexPath, content, 'utf8');
  }

  // Update expected version assertion in packages/cli/tests/cli.test.ts if present
  const cliTestPath = path.join(targetPackagesDir, 'cli', 'tests', 'cli.test.ts');
  if (fs.existsSync(cliTestPath)) {
    let testContent = fs.readFileSync(cliTestPath, 'utf8');
    testContent = testContent.replace(
      /expect\(pkgData\.dependencies\['driftjs-dom'\]\)\.toBe\('\^\d+\.\d+\.\d+'\)/,
      `expect(pkgData.dependencies['driftjs-dom']).toBe('^${newVersion}')`
    );
    fs.writeFileSync(cliTestPath, testContent, 'utf8');
  }

  // Update all CLI template package.json files
  const cliDir = path.join(targetPackagesDir, 'cli');
  const templateFiles = findCliTemplatePackageJsons(cliDir);
  const standardTemplatePkg = path.join(cliDir, 'template', 'package.json');
  if (fs.existsSync(standardTemplatePkg) && !templateFiles.includes(standardTemplatePkg)) {
    templateFiles.push(standardTemplatePkg);
  }

  for (const templatePath of templateFiles) {
    updateTemplateFile(templatePath, newVersion);
  }

  // Update packages/eslint-plugin/src/index.ts if present
  const eslintIndexPath = path.join(targetPackagesDir, 'eslint-plugin', 'src', 'index.ts');
  if (fs.existsSync(eslintIndexPath)) {
    let eslintContent = fs.readFileSync(eslintIndexPath, 'utf8');
    eslintContent = eslintContent.replace(
      /version:\s*'[^']+'/,
      `version: '${newVersion}'`
    );
    fs.writeFileSync(eslintIndexPath, eslintContent, 'utf8');
  }

  // Update packages/ssg/src/build/builder.ts if present
  const ssgBuilderPath = path.join(targetPackagesDir, 'ssg', 'src', 'build', 'builder.ts');
  if (fs.existsSync(ssgBuilderPath)) {
    let builderContent = fs.readFileSync(ssgBuilderPath, 'utf8');
    builderContent = builderContent.replace(
      /`v\d+\.\d+\.\d+`/,
      `\`v${newVersion}\``
    );
    fs.writeFileSync(ssgBuilderPath, builderContent, 'utf8');
  }

  if (!options.silent) {
    console.log(`🚀 Bumped all packages (${releaseType}): ${oldVersion} ──► ${newVersion}`);
  }

  return { oldVersion, newVersion };
}
