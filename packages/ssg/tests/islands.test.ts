import { describe, it, expect } from 'vitest';
import { scanIslands, wrapIslandHtml } from '../src/index.js';

describe('Drift SSG Islands Scanner & Wrapper', () => {
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
