import fs from 'node:fs';
import path from 'node:path';
import { compile, DriftLexer, DriftParser, type ElementNode } from 'driftjs-compiler';
import type { IslandDescriptor, IslandTriggerStrategy } from '../../types/index.js';

export const CLIENT_DIRECTIVES: Record<string, IslandTriggerStrategy> = {
  'client:load': 'eager',
  'client:idle': 'idle',
  'client:visible': 'visible',
  'client:interaction': 'interaction',
  'client:media': 'media',
};

/**
 * Collects every import binding declared in a .drift template's <script> block.
 */
function collectScriptImports(
  templateSource: string,
  sourceFilePath?: string
): Record<string, { source: string; importedName: string }> {
  const imports: Record<string, { source: string; importedName: string }> = {};
  try {
    const compiled = compile(templateSource);
    if (compiled && compiled.imports) {
      for (const imp of compiled.imports) {
        if (imp.localName && imp.source) {
          imports[imp.localName] = {
            source: imp.source,
            importedName: imp.importedName || 'default',
          };
        }
      }
    }
  } catch (err: any) {
    const context = sourceFilePath ? ` in "${sourceFilePath}"` : '';
    throw new Error(`Failed to extract component imports${context}: ${err.message || String(err)}`, { cause: err });
  }
  return imports;
}

/**
 * Extracts component import specifiers from a .drift template's <script> block.
 */
export function extractIslandImports(templateSource: string, sourceFilePath?: string): Record<string, string> {
  const collected = collectScriptImports(templateSource, sourceFilePath);
  const imports: Record<string, string> = {};
  for (const [localName, info] of Object.entries(collected)) {
    imports[localName] = info.source;
  }
  return imports;
}

/**
 * Extracts CSS / stylesheet import specifiers from a .drift template's <script> block.
 */
export function extractCssImports(templateSource: string, sourceFilePath?: string): string[] {
  const cssImports: string[] = [];
  try {
    const compiled = compile(templateSource);
    if (compiled && compiled.imports) {
      for (const imp of compiled.imports) {
        if (imp.source && /\.(css|scss|sass|less|styl|stylus)(\?.*)?$/i.test(imp.source)) {
          cssImports.push(imp.source);
        }
      }
    }
  } catch (err: any) {
    const context = sourceFilePath ? ` in "${sourceFilePath}"` : '';
    throw new Error(`Failed to extract CSS imports${context}: ${err.message || String(err)}`, { cause: err });
  }
  return cssImports;
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
 * Scans a .drift template string for client-hydrated island components.
 */
export function scanIslands(
  templateSource: string,
  importMap: Record<string, string> = {},
  sourceFilePath?: string,
  visited: Set<string> = new Set()
): IslandDescriptor[] {
  const islands: IslandDescriptor[] = [];

  if (sourceFilePath) {
    visited.add(path.resolve(sourceFilePath));
  }

  try {
    const collected = collectScriptImports(templateSource, sourceFilePath);
    const autoImports: Record<string, string> = {};
    for (const [localName, info] of Object.entries(collected)) {
      autoImports[localName] = info.source;
    }
    const resolvedImportMap = { ...autoImports, ...importMap };

    const lexer = new DriftLexer(templateSource);
    const parser = new DriftParser(lexer);
    const ast = parser.parse();

    const islandElements = findIslandElements(ast);

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

      let componentPath = resolvedImportMap[name] || name;
      if (sourceFilePath && componentPath.startsWith('.')) {
        componentPath = path.resolve(path.dirname(sourceFilePath), componentPath);
      }

      // Package specifiers (e.g. `import { DriftCodeEditor } from 'driftjs-playground'`)
      // expose a named export, while .drift files expose a default export.
      const binding = collected[name];
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

    // Recursively scan imported .drift components for nested islands
    if (sourceFilePath) {
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
  } catch (err: any) {
    const context = sourceFilePath ? ` in "${sourceFilePath}"` : '';
    throw new Error(`Failed to parse template for islands${context}: ${err.message || String(err)}`, { cause: err });
  }

  return islands;
}
