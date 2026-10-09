import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { vite, rollup, esbuild, webpack, rspack } from '../src/index.js';

describe('driftjs-unplugin – Real Bundler Integration Tests', () => {
  let tmpDir: string;
  let componentPath: string;
  let entryPath: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `drift-bundler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const driftComponent = `
      <script>
        let count = 42;
        function increment() { count++; }
      </script>
      <button onclick={increment}>Count: {count}</button>
    `;
    componentPath = path.join(tmpDir, 'Counter.drift');
    fs.writeFileSync(componentPath, driftComponent);

    const entryCode = `
      import Counter from "./Counter.drift";
      export { Counter };
    `;
    entryPath = path.join(tmpDir, 'entry.js');
    fs.writeFileSync(entryPath, entryCode);
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('compiles and bundles .drift SFCs using Vite', async () => {
    const viteMod = await import('vite');
    const result: any = await viteMod.build({
      root: tmpDir,
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: entryPath,
          formats: ['es'],
        },
        rollupOptions: {
          external: ['driftjs-compiler', 'driftjs-dom'],
        },
      },
      plugins: [vite()],
    });

    const outputCode: string = Array.isArray(result)
      ? result[0].output[0].code
      : result.output[0].code;

    expect(outputCode).toBeDefined();
    expect(outputCode).toContain('bytecode');
    expect(outputCode).toContain('Counter');
  });

  it('compiles and bundles .drift SFCs using Rollup', async () => {
    const rollupMod = await import('rollup');
    const bundle = await rollupMod.rollup({
      input: entryPath,
      plugins: [rollup()],
      external: ['driftjs-compiler', 'driftjs-dom'],
    });

    const { output } = await bundle.generate({ format: 'esm' });
    const outputCode = output[0]?.code;

    expect(outputCode).toBeDefined();
    expect(outputCode).toContain('bytecode');
    expect(outputCode).toContain('Counter');
  });

  it('compiles and bundles .drift SFCs using esbuild', async () => {
    const esbuildMod = await import('esbuild');
    const result = await esbuildMod.build({
      entryPoints: [entryPath],
      bundle: true,
      write: false,
      format: 'esm',
      external: ['driftjs-compiler', 'driftjs-dom'],
      plugins: [esbuild()],
    });

    expect(result.outputFiles).toBeDefined();
    expect(result.outputFiles!.length).toBeGreaterThan(0);

    const outputCode = result.outputFiles![0]!.text;
    expect(outputCode).toContain('bytecode');
    expect(outputCode).toContain('Counter');
  });

  it('compiles and bundles .drift SFCs using Webpack', async () => {
    const webpackMod = (await import('webpack')).default;
    const outDir = path.join(tmpDir, 'dist-webpack');

    await new Promise<void>((resolve, reject) => {
      webpackMod(
        {
          mode: 'production',
          entry: entryPath,
          output: {
            path: outDir,
            filename: 'bundle.js',
            library: { type: 'module' },
          },
          experiments: {
            outputModule: true,
          },
          externals: {
            'driftjs-compiler': 'driftjs-compiler',
            'driftjs-dom': 'driftjs-dom',
          },
          plugins: [webpack()],
        },
        (err: any, stats: any) => {
          if (err) return reject(err);
          if (stats && stats.hasErrors()) {
            return reject(new Error(stats.toString()));
          }
          resolve();
        }
      );
    });

    const bundlePath = path.join(outDir, 'bundle.js');
    expect(fs.existsSync(bundlePath)).toBe(true);

    const outputCode = fs.readFileSync(bundlePath, 'utf8');
    expect(outputCode).toContain('bytecode');
  });

  it('compiles and bundles .drift SFCs using Rspack', async () => {
    const { rspack: rspackMod } = await import('@rspack/core');
    const outDir = path.join(tmpDir, 'dist-rspack');

    await new Promise<void>((resolve, reject) => {
      (rspackMod as any)(
        {
          mode: 'production',
          entry: entryPath,
          output: {
            path: outDir,
            filename: 'bundle.js',
            library: { type: 'module' },
          },
          externals: {
            'driftjs-compiler': 'driftjs-compiler',
            'driftjs-dom': 'driftjs-dom',
          },
          plugins: [rspack()],
        },
        (err: any, stats: any) => {
          if (err) return reject(err);
          if (stats && stats.hasErrors()) {
            return reject(new Error(stats.toString()));
          }
          resolve();
        }
      );
    });

    const bundlePath = path.join(outDir, 'bundle.js');
    expect(fs.existsSync(bundlePath)).toBe(true);

    const outputCode = fs.readFileSync(bundlePath, 'utf8');
    expect(outputCode).toContain('bytecode');
  });

  it('bundles nested .drift component hierarchies across modules', async () => {
    const childComponent = `
      <script>
        export let text = "Hello from Child";
      </script>
      <span>{text}</span>
    `;
    fs.writeFileSync(path.join(tmpDir, 'Child.drift'), childComponent);

    const parentComponent = `
      <script>
        import Child from "./Child.drift";
        let title = "Parent Container";
      </script>
      <div>
        <h1>{title}</h1>
        <Child text="Custom Props" />
      </div>
    `;
    fs.writeFileSync(path.join(tmpDir, 'Parent.drift'), parentComponent);

    const nestedEntryPath = path.join(tmpDir, 'nested-entry.js');
    fs.writeFileSync(nestedEntryPath, 'import Parent from "./Parent.drift"; export { Parent };');

    const esbuildMod = await import('esbuild');
    const result = await esbuildMod.build({
      entryPoints: [nestedEntryPath],
      bundle: true,
      write: false,
      format: 'esm',
      external: ['driftjs-compiler', 'driftjs-dom'],
      plugins: [esbuild()],
    });

    const outputCode = result.outputFiles![0]!.text;
    expect(outputCode).toContain('Parent Container');
    expect(outputCode).toContain('bytecode');
  });
});
