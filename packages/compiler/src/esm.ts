import MagicString, { type SourceMap } from 'magic-string';
import { DriftLexer } from './lexer.js';
import { DriftParser } from './parser.js';
import { DriftTransformer } from './transformer.js';
import { DriftGenerator } from './generator.js';
import { ASTNodeType, type CompiledModule, type ProgramNode } from '../types/index.js';

export interface CompileToESMOptions {
  /** Source filename used in generated header comments, source map, and error reporting. */
  filename?: string;
  /** Emit verbose compiler debug logs to console. */
  debug?: boolean;
  /** Whether to generate a Source Map v3 (defaults to true). */
  sourceMap?: boolean;
}

export interface CompileToESMResult {
  /** The generated executable ECMAScript Module (ESM) JavaScript string. */
  code: string;
  /** Source map v3 object or null when sourceMap is false. */
  map: SourceMap | null;
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
 * Extracts character offset ranges of all top-level ImportDeclaration statements inside <script> tags.
 */
export function extractImportRanges(ast: ProgramNode): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  for (const node of ast.body) {
    if (node.type === ASTNodeType.Element && node.tagName === 'script') {
      for (const child of node.children) {
        if (child.type === ASTNodeType.Text && child.content) {
          const baseOffset = child.loc.start.offset;
          const stmts = Array.isArray(child.content) ? child.content : [child.content];
          for (const stmt of stmts) {
            if (stmt && stmt.type === 'ImportDeclaration') {
              ranges.push({
                start: baseOffset + stmt.start,
                end: baseOffset + stmt.end,
              });
            }
          }
        }
      }
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

/**
 * Generates executable ESM and a v3 SourceMap by mutating the original source with MagicString,
 * preserving authored import statements and line/column mappings 1:1.
 */
export function generateESMWithSourceMap(
  src: string,
  filePath: string,
  mod: CompiledModule,
  importRanges: { start: number; end: number }[]
): { code: string; map: SourceMap } {
  const bytecodeJSON = JSON.stringify(Array.from(mod.bytecode));
  const constantsJSON = serializeConstants(mod.constants);
  const bindingsJSON = JSON.stringify(mod.reactiveBindings ?? []);
  const declaredVarsJSON = JSON.stringify(mod.declaredVars ?? []);
  const derivedJSON = JSON.stringify(mod.derived ?? []);
  const effectsJSON = JSON.stringify(mod.effects ?? []);

  const scopeEntries = Array.from(
    new Set(
      (mod.imports ?? [])
        .filter((imp) => !imp.isSideEffect && Boolean(imp.localName))
        .map((imp) => imp.localName)
    )
  );
  const scopeObj = scopeEntries.length > 0 ? `{\n    ${scopeEntries.join(',\n    ')}\n  }` : '{}';

  const moduleBody = `/** @type {import('driftjs-compiler').CompiledModule} */
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

  const s = new MagicString(src);
  const header = `// [DriftJS] Auto-generated from: ${filePath}\n// Do not edit — regenerated on every save / build.\n`;

  if (importRanges.length === 0) {
    if (src.length === 0) {
      s.append(header + moduleBody);
    } else {
      s.overwrite(0, src.length, header + moduleBody);
    }
  } else {
    const firstImport = importRanges[0]!;
    const firstStart = firstImport.start;
    if (firstStart > 0) {
      s.overwrite(0, firstStart, header);
    } else {
      s.prepend(header);
    }

    for (let i = 0; i < importRanges.length - 1; i++) {
      const curr = importRanges[i]!;
      const next = importRanges[i + 1]!;
      if (next.start > curr.end) {
        s.overwrite(curr.end, next.start, '\n');
      }
    }

    const lastImport = importRanges[importRanges.length - 1]!;
    const lastEnd = lastImport.end;
    if (lastEnd < src.length) {
      s.overwrite(lastEnd, src.length, `\n\n${moduleBody}`);
    } else {
      s.append(`\n\n${moduleBody}`);
    }
  }

  const code = s.toString();
  const map = s.generateMap({
    source: filePath,
    file: `${filePath}.js`,
    includeContent: true,
    hires: true,
  });

  return { code, map };
}

/**
 * Compiles Drift SFC source code directly into an executable ECMAScript Module (ESM) string,
 * accompanied by a v3 SourceMap unless sourceMap is explicitly set to false.
 *
 * @param src - Raw template source string.
 * @param options - Compilation options including filename, debug flag, and sourceMap toggle.
 * @returns An object containing the generated ESM JS code, v3 source map, and compiledModule.
 */
export function compileToESM(src: string, options: CompileToESMOptions = {}): CompileToESMResult {
  const { filename = 'anonymous.drift', debug = false, sourceMap = true } = options;

  const lexer = new DriftLexer(src);
  const parser = new DriftParser(lexer);
  const ast = parser.parse();
  const transformer = new DriftTransformer(ast);
  const transformedAst = transformer.transform();
  const generator = new DriftGenerator(transformedAst);
  const compiledModule = generator.generate();

  if (debug) {
    console.log('--- Transformed AST ---');
    console.log(JSON.stringify(transformedAst, null, 2));
    console.log('--- Compiled Module ---');
    console.log(JSON.stringify(compiledModule, null, 2));
  }

  if (sourceMap === false) {
    const code = generateESM(compiledModule, filename);
    return {
      code,
      map: null,
      compiledModule,
    };
  }

  const importRanges = extractImportRanges(transformedAst);
  const { code, map } = generateESMWithSourceMap(src, filename, compiledModule, importRanges);

  return {
    code,
    map,
    compiledModule,
  };
}
