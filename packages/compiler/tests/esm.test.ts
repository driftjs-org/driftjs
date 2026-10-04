import { describe, it, expect } from 'vitest';
import * as acorn from 'acorn';
import {
  compileToESM,
  generateESM,
  serializeValueToJS,
  serializeConstants,
  compile,
} from '../src/index.js';

describe('driftjs-compiler – ESM Code Generation & Serialization', () => {
  describe('serializeValueToJS', () => {
    it('serializes primitives correctly', () => {
      expect(serializeValueToJS(null)).toBe('null');
      expect(serializeValueToJS(undefined)).toBe('undefined');
      expect(serializeValueToJS(true)).toBe('true');
      expect(serializeValueToJS(false)).toBe('false');
      expect(serializeValueToJS('hello')).toBe('"hello"');
      expect(serializeValueToJS(42)).toBe('42');
      expect(serializeValueToJS(3.14)).toBe('3.14');
    });

    it('serializes special numeric values correctly', () => {
      expect(serializeValueToJS(NaN)).toBe('NaN');
      expect(serializeValueToJS(Infinity)).toBe('Infinity');
      expect(serializeValueToJS(-Infinity)).toBe('-Infinity');
      expect(serializeValueToJS(-0)).toBe('-0');
      expect(serializeValueToJS(123n)).toBe('123n');
    });

    it('serializes complex objects, arrays, and standard collections', () => {
      expect(serializeValueToJS([1, 2, 'three'])).toBe('[1, 2, "three"]');
      expect(serializeValueToJS({ foo: 'bar', num: 10 })).toBe('{ "foo": "bar", "num": 10 }');

      const date = new Date(1700000000000);
      expect(serializeValueToJS(date)).toBe('new Date(1700000000000)');

      const set = new Set([1, 2, 'three']);
      expect(serializeValueToJS(set)).toBe('new Set([1, 2, "three"])');

      const map = new Map([['key', 42]]);
      expect(serializeValueToJS(map)).toBe('new Map([["key", 42]])');

      const uint8 = new Uint8Array([10, 20, 30]);
      expect(serializeValueToJS(uint8)).toBe('new Uint8Array([10, 20, 30])');

      const uint32 = new Uint32Array([100, 200]);
      expect(serializeValueToJS(uint32)).toBe('new Uint32Array([100, 200])');

      const regex = /^[a-z]+$/gi;
      expect(serializeValueToJS(regex)).toBe('/^[a-z]+$/gi');
    });

    it('serializes compiled function thunks with __drift_fn__', () => {
      const thunkObj = { __drift_fn__: '(scope) => scope.count + 1' };
      expect(serializeValueToJS(thunkObj)).toBe('{ __drift_fn__: (scope) => scope.count + 1 }');
    });
  });

  describe('serializeConstants', () => {
    it('formats constant pool into a formatted array literal', () => {
      const constants = ['div', 42, { __drift_fn__: '(scope) => scope.title' }];
      const result = serializeConstants(constants);
      expect(result).toContain('"div"');
      expect(result).toContain('42');
      expect(result).toContain('__drift_fn__: (scope) => scope.title');
    });
  });

  describe('compileToESM', () => {
    it('compiles a simple component into valid executable ESM code with v3 source map', () => {
      const source = `
        <script>
          let count = 0;
          function increment() { count++; }
        </script>
        <button onclick={increment}>Count: {count}</button>
      `;

      const result = compileToESM(source, { filename: 'Counter.drift' });

      expect(result).toHaveProperty('code');
      expect(result.map).toBeDefined();
      expect(result.map?.version).toBe(3);
      expect(result.map?.sources).toContain('Counter.drift');
      expect(result.map?.sourcesContent?.[0]).toBe(source);
      expect(typeof result.map?.mappings).toBe('string');
      expect(result.map?.mappings.length).toBeGreaterThan(0);
      expect(result.compiledModule).toBeDefined();

      // Check header and export
      expect(result.code).toContain('// [DriftJS] Auto-generated from: Counter.drift');
      expect(result.code).toContain('export default compiledModule;');
      expect(result.code).toContain('bytecode: new Uint32Array(');
      expect(result.code).toContain('constants: [');

      // Check that the generated code is syntactically valid JavaScript
      expect(() => {
        acorn.parse(result.code, { ecmaVersion: 'latest', sourceType: 'module' });
      }).not.toThrow();
    });

    it('handles imported components and preserves authored import syntax in code and source map', () => {
      const source = `
        <script>
          import Header from './Header.drift';
          import { Button, Card } from './ui.js';
          import * as Icons from './icons.js';
          import './global.css';

          let title = "Hello World";
        </script>
        <Header title={title} />
      `;

      const result = compileToESM(source, { filename: 'App.drift' });

      // Preserves original import statements character-for-character
      expect(result.code).toContain("import Header from './Header.drift';");
      expect(result.code).toContain("import { Button, Card } from './ui.js';");
      expect(result.code).toContain("import * as Icons from './icons.js';");
      expect(result.code).toContain("import './global.css';");

      // Scope object should bind imported components
      expect(result.code).toContain('scope: {');
      expect(result.code).toContain('Header');
      expect(result.code).toContain('Button');
      expect(result.code).toContain('Card');
      expect(result.code).toContain('Icons');

      // Valid JS syntax
      expect(() => {
        acorn.parse(result.code, { ecmaVersion: 'latest', sourceType: 'module' });
      }).not.toThrow();

      // Source map contains correct metadata
      expect(result.map).not.toBeNull();
      expect(result.map?.version).toBe(3);
      expect(result.map?.file).toBe('App.drift.js');
      expect(result.map?.sources).toContain('App.drift');
      expect(result.map?.sourcesContent?.[0]).toBe(source);
    });

    it('returns map: null when sourceMap: false is specified', () => {
      const source = '<p>No Source Map</p>';
      const result = compileToESM(source, { filename: 'NoMap.drift', sourceMap: false });

      expect(result.map).toBeNull();
      expect(result.code).toContain('// [DriftJS] Auto-generated from: NoMap.drift');
      expect(result.code).toContain('export default compiledModule;');
    });

    it('generateESM standalone produces valid ESM with fallback import generator', () => {
      const compiled = compile('<script>import Foo from "./Foo.drift";</script><Foo />');
      const esm = generateESM(compiled, 'Manual.drift');
      expect(esm).toContain('import Foo from "./Foo.drift";');
      expect(esm).toContain('export default compiledModule;');
    });
  });
});
