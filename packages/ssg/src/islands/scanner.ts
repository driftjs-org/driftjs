import fs from 'node:fs';
import path from 'node:path';
import {
  DriftLexer,
  DriftParser,
  DriftTransformer,
  DriftGenerator,
  type ElementNode,
} from 'driftjs-compiler';
import type { IslandDescriptor, IslandTriggerStrategy, DriftSourceAnalysis } from '../../types/index.js';

export type { DriftSourceAnalysis };

export const CLIENT_DIRECTIVES: Record<string, IslandTriggerStrategy> = {
  'client:load': 'eager',
  'client:idle': 'idle',
  'client:visible': 'visible',
  'client:interaction': 'interaction',
  'client:media': 'media',
};

const sourceAnalysisCache = new Map<string, DriftSourceAnalysis>();

/**
 * Clears the internal Drift source analysis cache.
 */
export function clearSourceAnalysisCache(): void {
  sourceAnalysisCache.clear();
}

/**
 * Recursively traverses an AST node tree to find all element nodes with client:* directives.
 */
export function findIslandElements(node: any, results: ElementNode[] = []): ElementNode[] {
  if (!node || typeof node !== 'object') return results;

  if (node.type === 'Element') {
    const elem = node as ElementNode;
    const hasIslandDirective = elem.attributes.some((attr) =>
      attr.name in CLIENT_DIRECTIVES
    );
    if (hasIslandDirective) {
      results.push(elem);
    }
  }

  if (Array.isArray(node.body)) {
    for (const child of node.body) findIslandElements(child, results);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) findIslandElements(child, results);
  }
  if (Array.isArray(node.consequent)) {
    for (const child of node.consequent) findIslandElements(child, results);
  }
  if (Array.isArray(node.alternate)) {
    for (const child of node.alternate) findIslandElements(child, results);
  } else if (node.alternate) {
    findIslandElements(node.alternate, results);
  }

  return results;
}

/**
 * Performs a single-pass analysis of a .drift template source string:
 * lexes, parses, extracts island elements, transforms, and generates compiled bytecode and imports.
 * Caches the result to avoid redundant lexing, parsing, and compilation during static site generation.
 */
export function analyzeDriftSource(
  templateSource: string,
  sourceFilePath?: string
): DriftSourceAnalysis {
  const cacheKey = sourceFilePath ? `${path.resolve(sourceFilePath)}::${templateSource}` : templateSource;
  const cached = sourceAnalysisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const lexer = new DriftLexer(templateSource);
    const parser = new DriftParser(lexer);
    const ast = parser.parse();
    const islandElements = findIslandElements(ast);

    const transformer = new DriftTransformer(ast);
    const transformedAst = transformer.transform();
    const generator = new DriftGenerator(transformedAst);
    const compiled = generator.generate();

    const scriptImports: Record<string, { source: string; importedName: string }> = {};
    const cssImports: string[] = [];

    if (compiled && compiled.imports) {
      for (const imp of compiled.imports) {
        if (imp.localName && imp.source) {
          scriptImports[imp.localName] = {
            source: imp.source,
            importedName: imp.importedName || 'default',
          };
        }
        if (imp.source && /\.(css|scss|sass|less|styl|stylus)(\?.*)?$/i.test(imp.source)) {
          cssImports.push(imp.source);
        }
      }
    }

    const autoImports: Record<string, string> = {};
    for (const [localName, info] of Object.entries(scriptImports)) {
      autoImports[localName] = info.source;
    }

    const islands: IslandDescriptor[] = [];
    for (const elem of islandElements) {
      const name = elem.tagName;
      let trigger: IslandTriggerStrategy = 'idle';
      let media: string | undefined;
      const props: Record<string, any> = {};

      for (const attr of elem.attributes) {
        if (attr.name in CLIENT_DIRECTIVES) {
          trigger = CLIENT_DIRECTIVES[attr.name]!;
          if (attr.name === 'client:media' && typeof attr.value === 'string') {
            media = attr.value;
          }
        } else {
          // Plain props
          if (typeof attr.value === 'string') {
            props[attr.name] = attr.value;
          } else if (attr.value && typeof attr.value === 'object') {
            if ('expression' in attr.value && typeof (attr.value as any).expression === 'string') {
              props[attr.name] = (attr.value as any).expression;
            } else if ('value' in attr.value) {
              props[attr.name] = (attr.value as any).value;
            } else {
              props[attr.name] = true;
            }
          } else {
            props[attr.name] = true;
          }
        }
      }

      let componentPath = autoImports[name] || name;
      if (sourceFilePath && componentPath.startsWith('.')) {
        componentPath = path.resolve(path.dirname(sourceFilePath), componentPath);
      }

      const binding = scriptImports[name];
      const isPackageSpecifier = Boolean(binding) && !componentPath.startsWith('.') && !path.isAbsolute(componentPath);
      const exportName =
        isPackageSpecifier && binding!.importedName === name && binding!.importedName !== 'default'
          ? binding!.importedName
          : undefined;

      islands.push({
        name,
        componentPath,
        exportName,
        trigger,
        props,
        media,
      });
    }

    const analysis: DriftSourceAnalysis = {
      compiled,
      ast,
      imports: compiled.imports || [],
      scriptImports,
      cssImports,
      islandElements,
      islands,
    };

    sourceAnalysisCache.set(cacheKey, analysis);
    return analysis;
  } catch (err: any) {
    const context = sourceFilePath ? ` in "${sourceFilePath}"` : '';
    throw new Error(`Failed to analyze Drift template${context}: ${err.message || String(err)}`, { cause: err });
  }
}

/**
 * Extracts component import specifiers from a .drift template's <script> block.
 */
export function extractIslandImports(templateSource: string, sourceFilePath?: string): Record<string, string> {
  const analysis = analyzeDriftSource(templateSource, sourceFilePath);
  const imports: Record<string, string> = {};
  for (const [localName, info] of Object.entries(analysis.scriptImports)) {
    imports[localName] = info.source;
  }
  return imports;
}

/**
 * Extracts CSS / stylesheet import specifiers from a .drift template's <script> block.
 */
export function extractCssImports(templateSource: string, sourceFilePath?: string): string[] {
  const analysis = analyzeDriftSource(templateSource, sourceFilePath);
  return analysis.cssImports;
}

/**
 * Scans a .drift template string for client-hydrated island components.
 * Reuses the single-pass DriftSourceAnalysis cache.
 */
export function scanIslands(
  templateSource: string,
  importMap: Record<string, string> = {},
  sourceFilePath?: string,
  visited: Set<string> = new Set()
): IslandDescriptor[] {
  if (sourceFilePath) {
    visited.add(path.resolve(sourceFilePath));
  }

  const analysis = analyzeDriftSource(templateSource, sourceFilePath);
  const hasCustomImports = Object.keys(importMap).length > 0;

  let islands: IslandDescriptor[];
  if (hasCustomImports) {
    islands = analysis.islands.map((island) => {
      let componentPath = importMap[island.name] || island.componentPath;
      if (sourceFilePath && componentPath.startsWith('.')) {
        componentPath = path.resolve(path.dirname(sourceFilePath), componentPath);
      }
      return {
        ...island,
        componentPath,
      };
    });
  } else {
    // Clone descriptors to avoid external callers mutating cached objects
    islands = analysis.islands.map((island) => ({ ...island, props: { ...island.props } }));
  }

  // Recursively scan imported .drift components for nested islands
  if (sourceFilePath) {
    const resolvedImportMap: Record<string, string> = {};
    for (const [localName, info] of Object.entries(analysis.scriptImports)) {
      resolvedImportMap[localName] = info.source;
    }
    Object.assign(resolvedImportMap, importMap);

    for (const importSpec of Object.values(resolvedImportMap)) {
      if (typeof importSpec === 'string' && importSpec.endsWith('.drift')) {
        const resolved = importSpec.startsWith('.')
          ? path.resolve(path.dirname(sourceFilePath), importSpec)
          : importSpec;
        if (fs.existsSync(resolved) && !visited.has(resolved)) {
          visited.add(resolved);
          try {
            const nestedSrc = fs.readFileSync(resolved, 'utf8');
            const nestedIslands = scanIslands(nestedSrc, {}, resolved, visited);
            islands.push(...nestedIslands);
          } catch {
            // Ignore transient or unparseable child components
          }
        }
      }
    }
  }

  return islands;
}
