export type BuildTool = 'vite' | 'rollup' | 'webpack' | 'esbuild' | 'rspack';

export interface ScaffoldOptions {
  projectName: string;
  targetDir: string;
  templateDir: string;
  renderMode?: 'csr' | 'ssr';
  buildTool?: BuildTool;
  overwriteMode?: 'empty' | 'ignore';
  autoInstall?: boolean;
  autoRun?: boolean;
  packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun';
  installLintTools?: boolean;
}
