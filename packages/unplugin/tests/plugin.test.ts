import { describe, it, expect, vi } from 'vitest';
import unplugin, { vite, rollup, webpack, esbuild, rspack, DRIFT_EXT } from '../src/index.js';

describe('driftjs-unplugin – Universal Build Tool Plugin', () => {
  it('exports universal bundler factories correctly', () => {
    expect(typeof vite).toBe('function');
    expect(typeof rollup).toBe('function');
    expect(typeof webpack).toBe('function');
    expect(typeof esbuild).toBe('function');
    expect(typeof rspack).toBe('function');
    expect(typeof unplugin).toBe('object');
  });

  describe('transformInclude', () => {
    const rawPlugin = unplugin.raw({}, { framework: 'vite', versions: {} }) as any;

    it('identifies .drift files and rejects non-drift files', () => {
      const transformInclude = rawPlugin.transformInclude as (id: string) => boolean;
      expect(transformInclude('src/App.drift')).toBe(true);
      expect(transformInclude('/path/to/Component.drift')).toBe(true);
      expect(transformInclude('src/index.ts')).toBe(false);
      expect(transformInclude('styles.css')).toBe(false);
      expect(transformInclude('App.drift.js')).toBe(false);
    });

    it('rejects special resource query strings (?raw, ?url)', () => {
      const transformInclude = rawPlugin.transformInclude as (id: string) => boolean;
      expect(transformInclude('src/App.drift?raw')).toBe(false);
      expect(transformInclude('src/App.drift?url')).toBe(false);
    });
  });

  describe('transform', () => {
    const rawPlugin = unplugin.raw({}, { framework: 'vite', versions: {} }) as any;
    const transform = rawPlugin.transform as (src: string, id: string) => { code: string; map: any } | null;

    it('ignores non-drift and raw files', () => {
      expect(transform('export const a = 1;', 'test.ts')).toBeNull();
      expect(transform('<div>raw</div>', 'App.drift?raw')).toBeNull();
    });

    it('compiles a .drift Single File Component into valid ESM code', () => {
      const source = `
        <script>
          let count = 0;
          function increment() { count++; }
        </script>
        <button onclick={increment}>Count: {count}</button>
      `;

      const result = transform(source, 'src/Counter.drift');
      expect(result).not.toBeNull();
      expect(result!.code).toContain('// [DriftJS] Auto-generated from: src/Counter.drift');
      expect(result!.code).toContain('export default compiledModule;');
      expect(result!.code).toContain('bytecode: new Uint32Array(');
      expect(result!.code).toContain('constants: [');
      expect(result!.code).toContain('reactiveBindings: [');
    });

    it('handles imported components and binds them into scope', () => {
      const source = `
        <script>
          import Header from './Header.drift';
          let title = "Universal Unplugin";
        </script>
        <Header title={title} />
      `;

      const result = transform(source, 'src/App.drift');
      expect(result).not.toBeNull();
      expect(result!.code).toContain('import Header from "./Header.drift";');
      expect(result!.code).toContain('Header');
    });

    it('throws a formatted error on syntax failure', () => {
      const badSource = `<script> let x = 1; </script> <div unclosed`;
      expect(() => {
        transform(badSource, 'src/Broken.drift');
      }).toThrow(/\[DriftJS\] Compilation failed in "src\/Broken\.drift":/);
    });

    it('compiles a static element without throwing', () => {
      expect(() => transform('<section class="hero"><h1>Title</h1></section>', 'src/Hero.drift')).not.toThrow();
    });

    it('compiles @if / @else directives', () => {
      const src = '@if show { <p>Visible</p> } @else { <p>Hidden</p> }';
      expect(() => transform(src, 'src/If.drift')).not.toThrow();
    });

    it('compiles @for loops', () => {
      const src = '<ul>@for item in items { <li>{item}</li> }</ul>';
      expect(() => transform(src, 'src/For.drift')).not.toThrow();
    });

    it('compiles interpolations', () => {
      const src = '<p>{greeting}, {name}!</p>';
      expect(() => transform(src, 'src/Interpolate.drift')).not.toThrow();
    });
  });

  describe('debug option', () => {
    it('calls console.log when debug: true', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const rawPlugin = unplugin.raw({ debug: true }, { framework: 'vite', versions: {} }) as any;
      const transform = rawPlugin.transform as (src: string, id: string) => any;
      transform('<p>Debug</p>', 'src/Debug.drift');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('does not call console.log when debug: false (default)', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const rawPlugin = unplugin.raw({}, { framework: 'vite', versions: {} }) as any;
      const transform = rawPlugin.transform as (src: string, id: string) => any;
      transform('<p>Quiet</p>', 'src/Quiet.drift');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('HMR', () => {
    it('triggers a full-reload for .drift files', () => {
      const rawPlugin = unplugin.raw({}, { framework: 'vite', versions: {} }) as any;
      const send = vi.fn();
      const invalidateModule = vi.fn();
      const fakeModule = { id: '/project/hero.drift' };

      const ctx = {
        file: '/project/hero.drift',
        server: {
          moduleGraph: {
            getModuleById: vi.fn().mockReturnValue(fakeModule),
            invalidateModule,
          },
          ws: { send },
        },
      };

      rawPlugin.vite.handleHotUpdate(ctx);
      expect(invalidateModule).toHaveBeenCalledWith(fakeModule);
      expect(send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' });
    });

    it('ignores non-.drift files in HMR', () => {
      const rawPlugin = unplugin.raw({}, { framework: 'vite', versions: {} }) as any;
      const send = vi.fn();

      const ctx = {
        file: '/project/app.ts',
        server: { moduleGraph: { getModuleById: vi.fn() }, ws: { send } },
      };

      rawPlugin.vite.handleHotUpdate(ctx);
      expect(send).not.toHaveBeenCalled();
    });
  });
});
