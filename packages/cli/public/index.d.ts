declare module 'create-drift' {
  export interface ScaffoldOptions {
    projectName: string;
    targetDir: string;
    templateDir: string;
    renderMode?: 'csr' | 'ssr';
    overwriteMode?: 'empty' | 'ignore';
    autoInstall?: boolean;
    autoRun?: boolean;
    packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun';
    installLintTools?: boolean;
  }

  /**
   * Scaffolds a new DriftJS project by copying the starter template.
   */
  export function scaffoldProject(options: ScaffoldOptions): void;

  export function sanitizeDependencies(deps?: Record<string, string>, targetVersion?: string): void;

  export function detectPackageManager(): 'pnpm' | 'npm' | 'yarn' | 'bun';

  export function installDependencies(targetDir: string, pm: string): void;

  export function startDevServer(targetDir: string, pm: string): void;

  export function emptyDirectory(dirPath: string): void;

  export function isDirectoryNotEmpty(dirPath: string): boolean;
}
