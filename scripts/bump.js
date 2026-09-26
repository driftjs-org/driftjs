import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

export function bumpVersion(releaseType) {
  const packageDirs = fs.readdirSync(packagesDir).filter((name) => {
    const fullPath = path.join(packagesDir, name);
    return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'));
  });

  if (packageDirs.length === 0) {
    console.error('No packages found in packages/');
    process.exit(1);
  }

  // Get current version from first package
  const samplePkgPath = path.join(packagesDir, packageDirs[0], 'package.json');
  const samplePkg = JSON.parse(fs.readFileSync(samplePkgPath, 'utf8'));
  const oldVersion = samplePkg.version || '0.0.0';

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
    console.error(`Invalid release type: ${releaseType}`);
    process.exit(1);
  }

  const newVersion = `${major}.${minor}.${patch}`;

  // Update all packages in packages/
  for (const dirName of packageDirs) {
    const pkgPath = path.join(packagesDir, dirName, 'package.json');
    const pkgContent = fs.readFileSync(pkgPath, 'utf8');
    const pkgData = JSON.parse(pkgContent);
    pkgData.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8');
  }

  // Update default targetVersion in packages/cli/src/index.ts if present
  const cliIndexPath = path.join(packagesDir, 'cli', 'src', 'index.ts');
  if (fs.existsSync(cliIndexPath)) {
    let content = fs.readFileSync(cliIndexPath, 'utf8');
    content = content.replace(
      /targetVersion:\s*string\s*=\s*'\^\d+\.\d+\.\d+'/,
      `targetVersion: string = '^${newVersion}'`
    );
    fs.writeFileSync(cliIndexPath, content, 'utf8');
  }

  // Update expected version assertion in packages/cli/tests/cli.test.ts if present
  const cliTestPath = path.join(packagesDir, 'cli', 'tests', 'cli.test.ts');
  if (fs.existsSync(cliTestPath)) {
    let testContent = fs.readFileSync(cliTestPath, 'utf8');
    testContent = testContent.replace(
      /expect\(pkgData\.dependencies\['driftjs-dom'\]\)\.toBe\('\^\d+\.\d+\.\d+'\)/,
      `expect(pkgData.dependencies['driftjs-dom']).toBe('^${newVersion}')`
    );
    fs.writeFileSync(cliTestPath, testContent, 'utf8');
  }

  // Update packages/cli/template/package.json if present
  const templatePkgPath = path.join(packagesDir, 'cli', 'template', 'package.json');
  if (fs.existsSync(templatePkgPath)) {
    let templateContent = fs.readFileSync(templatePkgPath, 'utf8');
    templateContent = templateContent.replace(
      /"driftjs-([^"]+)":\s*"\^[0-9.]+"/g,
      `"driftjs-$1": "^${newVersion}"`
    );
    fs.writeFileSync(templatePkgPath, templateContent, 'utf8');
  }

  // Update packages/eslint-plugin/src/index.ts if present
  const eslintIndexPath = path.join(packagesDir, 'eslint-plugin', 'src', 'index.ts');
  if (fs.existsSync(eslintIndexPath)) {
    let eslintContent = fs.readFileSync(eslintIndexPath, 'utf8');
    eslintContent = eslintContent.replace(
      /version:\s*'[^']+'/,
      `version: '${newVersion}'`
    );
    fs.writeFileSync(eslintIndexPath, eslintContent, 'utf8');
  }

  // Update packages/ssg/src/build/builder.ts if present
  const ssgBuilderPath = path.join(packagesDir, 'ssg', 'src', 'build', 'builder.ts');
  if (fs.existsSync(ssgBuilderPath)) {
    let builderContent = fs.readFileSync(ssgBuilderPath, 'utf8');
    builderContent = builderContent.replace(
      /`v\d+\.\d+\.\d+`/,
      `\`v${newVersion}\``
    );
    fs.writeFileSync(ssgBuilderPath, builderContent, 'utf8');
  }

  console.log(`🚀 Bumped all packages (${releaseType}): ${oldVersion} ──► ${newVersion}`);
}
