import { compile } from './index.js';
import type { CompiledModule } from '../types/index.js';

export interface CompileToESMOptions {
  /** Source filename used in generated header comments and error reporting. */
  filename?: string;
  /** Emit verbose compiler debug logs to console. */
  debug?: boolean;
}

export interface CompileToESMResult {
  /** The generated executable ECMAScript Module (ESM) JavaScript string. */
  code: string;
  /** Source map placeholder (null for now). */
  map?: null;
  /** The in-memory CompiledModule emitted by the compiler generator. */
  compiledModule: CompiledModule;
}

/**
 * Serializes arbitrary constant pool values into valid JavaScript code literals.
 */
export function serializeValueToJS(val: unknown): string {
  if (val === null || val === undefined) return String(val);
  if (typeof val === 'number') {
    if (Number.isNaN(val)) return 'NaN';
    if (val === Infinity) return 'Infinity';
    if (val === -Infinity) return '-Infinity';
    if (Object.is(val, -0)) return '-0';
    return String(val);
  }
  if (typeof val === 'bigint') return `${val.toString()}n`;
  if (typeof val === 'function') return val.toString();
  if (typeof val === 'object') {
    if ('__drift_fn__' in (val as any)) {
      const fnStr = (val as any).__drift_fn__;
      return `{ __drift_fn__: ${typeof fnStr === 'function' ? fnStr.toString() : fnStr} }`;
    }
    if (val instanceof RegExp) {
      return val.toString();
    }
    if (val instanceof Date) {
      return `new Date(${val.getTime()})`;
    }
    if (val instanceof Set) {
      return `new Set([${Array.from(val).map(serializeValueToJS).join(', ')}])`;
    }
    if (val instanceof Map) {
      return `new Map([${Array.from(val.entries()).map(([k, v]) => `[${serializeValueToJS(k)}, ${serializeValueToJS(v)}]`).join(', ')}])`;
    }
    if (val instanceof Uint8Array) {
      return `new Uint8Array([${Array.from(val).join(', ')}])`;
    }
    if (val instanceof Uint32Array) {
      return `new Uint32Array([${Array.from(val).join(', ')}])`;
    }
    if (Array.isArray(val)) {
      return `[${val.map(serializeValueToJS).join(', ')}]`;
    }
    const entries = Object.entries(val as Record<string, any>)
      .filter(([k]) => k !== 'start' && k !== 'end' && k !== 'loc')
      .map(([k, v]) => `${JSON.stringify(k)}: ${serializeValueToJS(v)}`);
    return `{ ${entries.join(', ')} }`;
  }
  return JSON.stringify(val);
}

/**
 * Formats an array of constant pool values into a JavaScript array literal string.
 */
export function serializeConstants(constants: readonly unknown[]): string {
  return `[\n    ${constants.map(serializeValueToJS).join(',\n    ')}\n  ]`;
}

/**
 * Generates an executable ECMAScript Module (ESM) JavaScript string from a CompiledModule.
 */
export function generateESM(mod: CompiledModule, filePath: string = 'anonymous.drift'): string {
  const bytecodeJSON = JSON.stringify(Array.from(mod.bytecode));
  const constantsJSON = serializeConstants(mod.constants);
  const bindingsJSON = JSON.stringify(mod.reactiveBindings ?? []);
  const declaredVarsJSON = JSON.stringify(mod.declaredVars ?? []);
  const derivedJSON = JSON.stringify(mod.derived ?? []);
  const effectsJSON = JSON.stringify(mod.effects ?? []);

  const importStatements: string[] = [];
  const scopeEntries: string[] = [];

  if (mod.imports && mod.imports.length > 0) {
    for (const imp of mod.imports) {
      if (imp.isSideEffect || (!imp.localName && !imp.isDefault && !imp.isNamespace)) {
        importStatements.push(`import ${JSON.stringify(imp.source)};`);
      } else if (imp.isNamespace) {
        importStatements.push(`import * as ${imp.localName} from ${JSON.stringify(imp.source)};`);
        scopeEntries.push(imp.localName);
      } else if (imp.isDefault) {
        importStatements.push(`import ${imp.localName} from ${JSON.stringify(imp.source)};`);
        scopeEntries.push(imp.localName);
      } else if (imp.importedName) {
        importStatements.push(`import { ${imp.importedName} as ${imp.localName} } from ${JSON.stringify(imp.source)};`);
        scopeEntries.push(imp.localName);
      }
    }
  }

  const importsHeader = importStatements.length > 0 ? importStatements.join('\n') + '\n\n' : '';
  const scopeObj = scopeEntries.length > 0 ? `{\n    ${scopeEntries.join(',\n    ')}\n  }` : '{}';

  return `\
// [DriftJS] Auto-generated from: ${filePath}
// Do not edit — regenerated on every save / build.
${importsHeader}/** @type {import('driftjs-compiler').CompiledModule} */
const compiledModule = {
  bytecode: new Uint32Array(${bytecodeJSON}),
  constants: ${constantsJSON},
  reactiveBindings: ${bindingsJSON},
  declaredVars: ${declaredVarsJSON},
  derived: ${derivedJSON},
  effects: ${effectsJSON},
  scope: ${scopeObj},
};

export default compiledModule;
`;
}

/**
 * Compiles Drift SFC source code directly into an executable ECMAScript Module (ESM) string.
 *
 * @param src - Raw template source string.
 * @param options - Compilation options including filename and debug flag.
 * @returns An object containing the generated ESM JS code, source map, and compiledModule.
 */
export function compileToESM(src: string, options: CompileToESMOptions = {}): CompileToESMResult {
  const { filename = 'anonymous.drift', debug = false } = options;
  const compiledModule = compile(src, debug);
  const code = generateESM(compiledModule, filename);
  return {
    code,
    map: null,
    compiledModule,
  };
}
