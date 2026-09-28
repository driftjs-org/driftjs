import { DriftClientVM } from 'driftjs-dom';
import { instantiateFunctionsRecursively } from '../compiler/function-loader.js';

let activeVM: DriftClientVM | null = null;

/**
 * Cleanly unmounts and clears the active preview VM.
 */
export function unmountPreview(): void {
  if (activeVM) {
    try {
      activeVM.unmount();
    } catch (err) {
      console.warn('[Drift Playground] Error during VM unmount:', err);
    }
    activeVM = null;
  }
}

/**
 * Mounts a compiled module into a preview container element.
 */
export function mountPreview(
  container: HTMLElement,
  rawModule: any
): { vm: DriftClientVM | null; error?: Error } {
  unmountPreview();
  container.replaceChildren();

  try {
    // Clone module and instantiate executable closures
    const mod = JSON.parse(JSON.stringify(rawModule));
    instantiateFunctionsRecursively(mod);

    const doc = container.ownerDocument || document;
    const vm = new DriftClientVM();
    activeVM = vm;

    const node = vm.execute(mod, { document: doc });
    if (node) {
      container.appendChild(node);
    }

    return { vm };
  } catch (err: any) {
    console.error('[Drift Playground] Runtime execution error:', err);
    return { vm: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
