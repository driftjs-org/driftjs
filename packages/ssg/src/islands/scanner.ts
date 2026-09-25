import { DriftLexer, DriftParser, type ElementNode } from 'driftjs-compiler';
import type { IslandDescriptor, IslandTriggerStrategy } from '../../types/index.js';

export const CLIENT_DIRECTIVES: Record<string, IslandTriggerStrategy> = {
  'client:load': 'eager',
  'client:idle': 'idle',
  'client:visible': 'visible',
  'client:interaction': 'interaction',
  'client:media': 'media',
};

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
  importMap: Record<string, string> = {}
): IslandDescriptor[] {
  const islands: IslandDescriptor[] = [];

  try {
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
          } else if (attr.value && typeof attr.value === 'object' && 'value' in attr.value) {
            props[attr.name] = (attr.value as any).value;
          } else {
            props[attr.name] = true;
          }
        }
      }

      const componentPath = importMap[name] || name;

      islands.push({
        name,
        componentPath,
        trigger,
        props,
        media,
      });
    }
  } catch (err) {
    // If parsing fails (e.g. non-SFC file), return empty islands
  }

  return islands;
}
