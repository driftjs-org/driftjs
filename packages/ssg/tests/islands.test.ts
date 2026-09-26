import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanIslands, wrapIslandHtml, extractIslandImports } from '../src/index.js';

describe('Drift SSG Islands Scanner & Wrapper', () => {
  it('extracts component import specifiers from SFC script tag', () => {
    const sfc = `
      <script>
        import Counter from '../components/Counter.drift';
        import Header from './Header.drift';
      </script>
      <main>
        <Counter client:load />
      </main>
    `;

    const imports = extractIslandImports(sfc);
    expect(imports).toEqual({
      Counter: '../components/Counter.drift',
      Header: './Header.drift',
    });
  });

  it('scans .drift templates and auto-extracts imports when importMap is omitted', () => {
    const sfc = `
      <script>
        import Counter from '../components/Counter.drift';
      </script>
      <div>
        <Counter client:load initial={5} />
      </div>
    `;

    const islands = scanIslands(sfc);
    expect(islands.length).toBe(1);
    expect(islands[0]).toEqual({
      name: 'Counter',
      componentPath: '../components/Counter.drift',
      trigger: 'eager',
      props: { initial: '5' },
      media: undefined,
    });
  });

  it('resolves relative component paths to absolute paths when sourceFilePath is provided', () => {
    const fakeFilePath = '/my-project/src/pages/index.drift';
    const sfc = `
      <script>
        import Counter from '../components/Counter.drift';
      </script>
      <div>
        <Counter client:idle />
      </div>
    `;

    const islands = scanIslands(sfc, {}, fakeFilePath);
    expect(islands.length).toBe(1);
    expect(islands[0].componentPath).toBe(path.resolve('/my-project/src/pages', '../components/Counter.drift'));
    expect(islands[0].trigger).toBe('idle');
  });

  it('scans .drift templates and detects client:* hydration directives', () => {
    const sfc = `
      <script>
        import Counter from '../components/Counter.drift';
        import SearchBox from '../components/SearchBox.drift';
      </script>

      <main class="page">
        <header>Static Header</header>
        <Counter client:load initial="10" />
        <Counter client:visible />
        <SearchBox client:interaction />
        <Sidebar client:media="(max-width: 768px)" />
        <div class="static">Static Footer</div>
      </main>
    `;

    const importMap = {
      Counter: '../components/Counter.drift',
      SearchBox: '../components/SearchBox.drift',
    };

    const islands = scanIslands(sfc, importMap);

    expect(islands.length).toBe(4);

    expect(islands[0]).toEqual({
      name: 'Counter',
      componentPath: '../components/Counter.drift',
      trigger: 'eager',
      props: { initial: '10' },
      media: undefined,
    });

    expect(islands[1]).toEqual({
      name: 'Counter',
      componentPath: '../components/Counter.drift',
      trigger: 'visible',
      props: {},
      media: undefined,
    });

    expect(islands[2]).toEqual({
      name: 'SearchBox',
      componentPath: '../components/SearchBox.drift',
      trigger: 'interaction',
      props: {},
      media: undefined,
    });

    expect(islands[3]).toEqual({
      name: 'Sidebar',
      componentPath: 'Sidebar',
      trigger: 'media',
      props: {},
      media: '(max-width: 768px)',
    });
  });

  it('wraps inner island HTML with data-drift-island attributes for client hydration', () => {
    const innerHtml = '<button>Count: 5</button>';
    const wrapped = wrapIslandHtml('Counter', innerHtml, {
      trigger: 'idle',
      props: { initial: 5 },
      timeout: 2000,
    });

    expect(wrapped).toContain('data-drift-island="Counter"');
    expect(wrapped).toContain('data-drift-trigger="idle"');
    expect(wrapped).toContain('data-drift-props="{&quot;initial&quot;:5}"');
    expect(wrapped).toContain('data-drift-timeout="2000"');
    expect(wrapped).toContain(innerHtml);
  });
});

