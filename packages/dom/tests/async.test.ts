import { describe, it, expect } from 'vitest';
import { DriftClientVM } from '../src/index.js';
import { Opcode } from '../types/index.js';
import { setScopeValue } from 'driftjs-shared';
import { compile } from '../../compiler/src/index.js';

describe('DriftClientVM – Zero-Proxy Async Reactivity & Microtask Batching', () => {
  it('updates DOM reactively when state changes inside an async function (async/await)', async () => {
    const mod = {
      bytecode: new Uint32Array([
        Opcode.EXEC_SCRIPT, 0,
        Opcode.CREATE_ELEMENT, 0, 1,
        Opcode.INTERPOLATE_TEXT, 1, 2,
        Opcode.RETURN,
        Opcode.APPEND_CHILD, 0, 1,
      ]),
      constants: [
        { __drift_fn__: '(scope) => { scope.status = "idle"; }' },
        'span',
        { __drift_fn__: '(scope) => scope.status' },
      ],
      reactiveBindings: [
        { variable: 'status', positions: [5] },
      ],
      declaredVars: ['status'],
      scope: {},
    };

    const vm = new DriftClientVM();
    const root = vm.execute(mod as any, { document }) as HTMLElement;

    expect(root.textContent).toBe('idle');

    // Simulate async data fetching operation mutating state
    const loadData = async () => {
      setScopeValue((vm as any).scope, 'status', 'loading');

      await new Promise((r) => setTimeout(r, 10));

      setScopeValue((vm as any).scope, 'status', 'success');
    };

    const promise = loadData();

    // After first sync step inside loadData, microtask fires
    await Promise.resolve();
    expect(root.textContent).toBe('loading');

    // After async timeout finishes and second setScopeValue runs
    await promise;
    await Promise.resolve();
    expect(root.textContent).toBe('success');
  });

  it('updates DOM reactively when state changes inside setTimeout', async () => {
    const mod = {
      bytecode: new Uint32Array([
        Opcode.EXEC_SCRIPT, 0,
        Opcode.CREATE_ELEMENT, 0, 1,
        Opcode.INTERPOLATE_TEXT, 1, 2,
        Opcode.RETURN,
        Opcode.APPEND_CHILD, 0, 1,
      ]),
      constants: [
        { __drift_fn__: '(scope) => { scope.count = 0; }' },
        'div',
        { __drift_fn__: '(scope) => scope.count' },
      ],
      reactiveBindings: [
        { variable: 'count', positions: [5] },
      ],
      declaredVars: ['count'],
      scope: {},
    };

    const vm = new DriftClientVM();
    const root = vm.execute(mod as any, { document }) as HTMLElement;

    expect(root.textContent).toBe('0');

    setTimeout(() => {
      setScopeValue((vm as any).scope, 'count', 100);
    }, 10);

    await new Promise((r) => setTimeout(r, 20));
    await Promise.resolve();

    expect(root.textContent).toBe('100');
  });

  it('coalesces multiple sync/async state assignments into a single microtask update pass', async () => {
    let updateCount = 0;

    const mod = {
      bytecode: new Uint32Array([
        Opcode.CREATE_ELEMENT, 0, 0,
        Opcode.INTERPOLATE_TEXT, 1, 1,
        Opcode.RETURN,
        Opcode.APPEND_CHILD, 0, 1,
      ]),
      constants: ['div', { __drift_fn__: '(scope) => scope.val' }],
      reactiveBindings: [
        { variable: 'val', positions: [3] },
      ],
      declaredVars: ['val'],
      scope: {},
    };

    const vm = new DriftClientVM();

    // Spy on triggerUpdates
    const origTrigger = vm.triggerUpdates.bind(vm);
    vm.triggerUpdates = (changed) => {
      updateCount++;
      origTrigger(changed);
    };

    vm.execute(mod as any, { document });

    // Perform 5 rapid assignments
    vm.markDirty('val');
    vm.markDirty('val');
    vm.markDirty('val');
    vm.markDirty('val');
    vm.markDirty('val');

    expect(updateCount).toBe(0);

    await Promise.resolve();

    expect(updateCount).toBe(1);
  });

  it('triggers reactivity on array mutating calls (e.g. push)', async () => {
    const mod = {
      bytecode: new Uint32Array([
        Opcode.CREATE_ELEMENT, 0, 0,
        Opcode.INTERPOLATE_TEXT, 1, 1,
        Opcode.RETURN,
        Opcode.APPEND_CHILD, 0, 1,
      ]),
      constants: [
        'div',
        { __drift_fn__: '(scope) => scope.items.length' },
      ],
      reactiveBindings: [
        { variable: 'items', positions: [3] },
      ],
      declaredVars: ['items'],
      scope: { items: [1, 2] },
    };

    const vm = new DriftClientVM();
    const root = vm.execute(mod as any, { document }) as HTMLElement;

    expect(root.textContent).toBe('2');

    const scope = (vm as any).scope;
    scope.items.push(3);
    setScopeValue(scope, 'items', scope.items);

    await Promise.resolve();

    expect(root.textContent).toBe('3');
  });

  it('handles async functions and await inside compiled .drift SFC scripts', async () => {
    const src = `
      <script>
        let data = "initial";
        async function fetchAsyncData() {
          const res = await Promise.resolve("loaded async");
          data = res;
        }
      </script>
      <div>{data}</div>
    `;

    const mod = compile(src);
    const vm = new DriftClientVM();
    const root = vm.execute(mod, { document }) as HTMLElement;

    expect(root.textContent).toBe('initial');

    const scope = (vm as any).scope;
    await scope.fetchAsyncData();

    await Promise.resolve();
    expect(root.textContent).toBe('loaded async');
  });

  it('renders @async directive with fallback and body resolution', async () => {
    let resolvePromise: (val: string) => void = () => {};
    const testPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    const src = `
      <script>
        let p = myPromise;
      </script>
      <div class="container">
        @async (p as msg) {
          <span class="body-content">{msg}</span>
        } @fallback {
          <span class="loading">Loading...</span>
        }
      </div>
    `;

    const mod = compile(src);
    const vm = new DriftClientVM();
    const root = vm.execute(mod, {
      document,
      scope: { myPromise: testPromise },
    }) as HTMLElement;

    // Immediately after mount, fallback should be displayed
    const loadingSpan = root.querySelector('.loading');
    expect(loadingSpan).not.toBeNull();
    expect(loadingSpan?.textContent).toBe('Loading...');
    expect(root.querySelector('.body-content')).toBeNull();

    // Resolve promise
    resolvePromise('Hello Async World');
    await testPromise;
    await Promise.resolve();

    expect(root.querySelector('.loading')).toBeNull();
    const bodySpan = root.querySelector('.body-content');
    expect(bodySpan).not.toBeNull();
    expect(bodySpan?.textContent).toBe('Hello Async World');

    vm.unmount();
  });

  it('renders @async directive @catch branch upon rejection', async () => {
    let rejectPromise: (err: any) => void = () => {};
    const testPromise = new Promise<string>((_, reject) => {
      rejectPromise = reject;
    });

    const src = `
      <script>
        let p = myPromise;
      </script>
      <div class="container">
        @async (p as msg) {
          <span class="body-content">{msg}</span>
        } @fallback {
          <span class="loading">Loading...</span>
        } @catch (err) {
          <span class="error">Failed: {err}</span>
        }
      </div>
    `;

    const mod = compile(src);
    const vm = new DriftClientVM();
    const root = vm.execute(mod, {
      document,
      scope: { myPromise: testPromise },
    }) as HTMLElement;

    expect(root.querySelector('.loading')?.textContent).toBe('Loading...');

    rejectPromise('Network timeout');
    try {
      await testPromise;
    } catch {
      // Expected
    }
    await Promise.resolve();

    expect(root.querySelector('.loading')).toBeNull();
    const errorSpan = root.querySelector('.error');
    expect(errorSpan).not.toBeNull();
    expect(errorSpan?.textContent).toBe('Failed: Network timeout');

    vm.unmount();
  });
});


