import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanIslands, wrapIslandHtml, extractIslandImports, generateIslandBootstrapSource } from '../src/index.js';

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
    expect(islands[0]!.componentPath).toBe(path.resolve('/my-project/src/pages', '../components/Counter.drift'));
    expect(islands[0]!.trigger).toBe('idle');
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

  it('adds an optional class name to the island container', () => {
    const wrapped = wrapIslandHtml('DriftCodeEditor', '', { className: 'drift-md-editor' });
    expect(wrapped.startsWith('<div class="drift-md-editor" data-drift-island=')).toBe(true);
  });

  it('marks package-specifier components as named exports', () => {
    const sfc = `
      <script>
        import { DriftCodeEditor } from 'driftjs-playground';
        import Counter from '../components/Counter.drift';
      </script>
      <main>
        <DriftCodeEditor client:load code="x" />
        <Counter client:load />
      </main>
    `;

    const islands = scanIslands(sfc);
    expect(islands[0]?.name).toBe('DriftCodeEditor');
    expect(islands[0]?.componentPath).toBe('driftjs-playground');
    expect(islands[0]?.exportName).toBe('DriftCodeEditor');
    expect(islands[1]?.exportName).toBeUndefined();
  });

  it('emits named imports for islands exposing a named export', () => {
    const source = generateIslandBootstrapSource(
      [
        { name: 'DriftCodeEditor', componentPath: 'driftjs-playground', exportName: 'DriftCodeEditor', trigger: 'eager', props: {} },
        { name: 'Counter', componentPath: '/abs/components/Counter.drift', trigger: 'eager', props: {} },
      ],
      '/root'
    );

    expect(source).toContain('import { DriftCodeEditor as __drift_comp_0 } from "driftjs-playground";');
    expect(source).toContain('import __drift_comp_1 from "/@fs/abs/components/Counter.drift";');
    expect(source).toContain('"DriftCodeEditor": __drift_comp_0');
  });

  describe('Security & Escaping (BUG-05 & BUG-06)', () => {
    it('escapes islandName to prevent attribute injection sinks (BUG-05)', () => {
      const wrapped = wrapIslandHtml('foo" data-injected="true', '<p>Test</p>');
      expect(wrapped).toContain('data-drift-island="foo&quot; data-injected=&quot;true"');
      expect(wrapped).not.toContain('data-injected="true"');
    });

    it('validates islandTag against valid HTML element tag names and falls back to div (BUG-05)', () => {
      const xssTag = wrapIslandHtml('MyIsland', '<p>Test</p>', { islandTag: 'div onmouseover=alert(1)' });
      expect(xssTag.startsWith('<div ')).toBe(true);
      expect(xssTag).not.toContain('onmouseover');

      const scriptTag = wrapIslandHtml('MyIsland', '<p>Test</p>', { islandTag: '<script>' });
      expect(scriptTag.startsWith('<div ')).toBe(true);

      const customTag = wrapIslandHtml('MyIsland', '<p>Test</p>', { islandTag: 'section' });
      expect(customTag.startsWith('<section ')).toBe(true);
      expect(customTag.endsWith('</section>')).toBe(true);
    });

    it('escapes className, media, rootMargin, and props attributes (BUG-05)', () => {
      const wrapped = wrapIslandHtml('MyIsland', '<p>Test</p>', {
        className: 'test" onclick="alert(1)',
        media: '(min-width: 600px)" onload="evil()',
        rootMargin: '10px" data-x="y',
        props: { message: '<script>alert(1)</script>' },
      });

      expect(wrapped).toContain('class="test&quot; onclick=&quot;alert(1)"');
      expect(wrapped).toContain('data-drift-media="(min-width: 600px)&quot; onload=&quot;evil()"');
      expect(wrapped).toContain('data-drift-root-margin="10px&quot; data-x=&quot;y"');
      expect(wrapped).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(wrapped).not.toContain('onclick="alert(1)"');
      expect(wrapped).not.toContain('onload="evil()"');
    });

    it('escapes module specifiers in generated island bootstrap code to prevent JS code injection (BUG-06)', () => {
      const source = generateIslandBootstrapSource(
        [
          {
            name: 'MaliciousComp',
            componentPath: "some-package'; /* injected code */",
            trigger: 'eager',
            props: {},
          },
        ],
        '/root'
      );

      expect(source).toContain('import __drift_comp_0 from "some-package\'; /* injected code */";');
      expect(source).not.toContain("'some-package'; /* injected code */'");
    });
  });
});

