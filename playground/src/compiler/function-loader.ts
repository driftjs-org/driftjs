/**
 * Recursively instantiates __drift_fn__ closure strings on CompiledModule objects.
 * When driftjs-compiler runs in-browser, function ASTs are serialized as string representations
 * inside the constant pool. This loader converts them into executable closures.
 */
export function instantiateFunctionsRecursively(obj: any, visited: Set<any> = new Set()): any {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return obj;
  if (typeof Node !== 'undefined' && obj instanceof Node) return obj;
  if (typeof Window !== 'undefined' && obj instanceof Window) return obj;
  visited.add(obj);

  if (typeof obj.__drift_fn__ === 'string') {
    try {
      obj.__drift_fn__ = new Function('return (' + obj.__drift_fn__ + ')')();
    } catch (err) {
      console.error('[Drift Playground] Error compiling function expression:', obj.__drift_fn__, err);
    }
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      instantiateFunctionsRecursively(obj[i], visited);
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype' ||
        key.startsWith('__drift_parent')
      ) {
        continue;
      }
      instantiateFunctionsRecursively(obj[key], visited);
    }
  }

  return obj;
}
