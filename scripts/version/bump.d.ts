export interface BumpOptions {
  packagesDir?: string;
  rootDir?: string;
  silent?: boolean;
  throwOnError?: boolean;
}

export interface BumpResult {
  oldVersion: string;
  newVersion: string;
}

export type ReleaseType = 'patch' | 'minor' | 'major';

export function computeNewVersion(oldVersion: string, releaseType: string): string;

export function updateTemplateDependencies(pkgData: any, newVersion: string): boolean;

export function findCliTemplatePackageJsons(cliDirPath: string): string[];

export function updateTemplateFile(filePath: string, newVersion: string): boolean;

export function bumpVersion(releaseType: string, options?: BumpOptions): BumpResult;
