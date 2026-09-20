/**
 * Sets a variable in scope, updating parent scope if it exists higher in prototype chain.
 */
export function setScopeValue<T = any>(targetScope: Record<string, any>, name: string, val: T): T {
  if (!targetScope || typeof targetScope !== 'object') return val;
  if (name === '__proto__' || name === 'constructor' || name === 'prototype' || name === '__drift_mark_dirty__') {
    return val;
  }

  let curr: any = targetScope;
  let setOn: any = null;
  const dirtyFns: ((name: string) => void)[] = [];

  // Single upward pass: find owner and collect dirty functions simultaneously
  while (curr && curr !== Object.prototype) {
    if (typeof curr.__drift_mark_dirty__ === 'function') {
      dirtyFns.push(curr.__drift_mark_dirty__);
    }
    if (Object.prototype.hasOwnProperty.call(curr, name)) {
      curr[name] = val;
      setOn = curr;
      break;
    }
    curr = Object.getPrototypeOf(curr);
  }

  if (!setOn) {
    targetScope[name] = val;
  }

  // Trigger dirty marking on all affected scope VMs (skip internal __drift_ variables)
  if (!name.startsWith('__drift_')) {
    for (let i = 0; i < dirtyFns.length; i++) {
      try {
        dirtyFns[i]!(name);
      } catch (err) {
        console.error(`[DriftJS] Error notifying dirty update for "${name}":`, err);
      }
    }
  }

  return val;
}

/**
 * Safely checks if a property exists on scope or any of its parent scopes,
 * stopping before Object.prototype to prevent prototype pollution / scope hijacking.
 */
export function inScopeChain(scope: any, name: string): boolean {
  if (!scope || typeof scope !== 'object') return false;
  let curr: any = scope;
  while (curr && curr !== Object.prototype) {
    if (Object.prototype.hasOwnProperty.call(curr, name)) {
      return true;
    }
    curr = Object.getPrototypeOf(curr);
  }
  return false;
}

/**
 * Safely gets a variable value from the scope chain, or falls back to globalThis in a single traversal.
 */
export function getScopeValue(scope: any, name: string): any {
  if (name === '__proto__' || name === 'constructor' || name === 'prototype' || name === '__drift_mark_dirty__') {
    return undefined;
  }

  // Single pass on scope chain
  if (scope && typeof scope === 'object') {
    let curr: any = scope;
    while (curr && curr !== Object.prototype) {
      if (Object.prototype.hasOwnProperty.call(curr, name)) {
        return curr[name];
      }
      curr = Object.getPrototypeOf(curr);
    }
  }

  // Fallback: single pass on globalThis
  if (typeof globalThis !== 'undefined' && globalThis) {
    let curr: any = globalThis;
    while (curr && curr !== Object.prototype) {
      if (Object.prototype.hasOwnProperty.call(curr, name)) {
        return (globalThis as any)[name];
      }
      curr = Object.getPrototypeOf(curr);
    }
  }

  return undefined;
}

/**
 * Safely sets an own property on a scope object, rejecting prototype pollution keys
 * and internal engine properties.
 */
export function setScopeProp<T = any>(scope: Record<string, any>, key: string, val: T): T {
  if (!scope || typeof scope !== 'object') return val;
  if (key === '__proto__' || key === 'constructor' || key === 'prototype' || key === '__drift_mark_dirty__') {
    return val;
  }
  scope[key] = val;
  return val;
}

/**
 * Populates scope for `@for` loop items.
 *
 * Destructuring patterns (`{ a, b = default }`, `[x, y]`, etc.) are NOT handled here.
 * They are compiled to AOT populator functions at build time (see
 * `DriftGenerator.buildItemPopulatorFn`) and stored in the constant pool, so no runtime
 * string parsing ever happens during loop rendering (BUG-112 / BUG-113 / BUG-115).
 * This helper is only an identifier fallback for hand-crafted / legacy bytecode modules.
 */
export function populateItemScope(
  scope: Record<string, any>,
  itemName: string,
  itemVal: any,
  indexName: string | null,
  indexVal: number
): void {
  setScopeProp(scope, itemName, itemVal);
  if (indexName) setScopeProp(scope, indexName, indexVal);
}


