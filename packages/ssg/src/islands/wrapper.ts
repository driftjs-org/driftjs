import type { IslandTriggerStrategy } from '../../types/index.js';

export interface WrapIslandOptions {
  trigger?: IslandTriggerStrategy | undefined;
  props?: Record<string, any> | undefined;
  timeout?: number | undefined;
  media?: string | undefined;
  rootMargin?: string | undefined;
  islandTag?: string | undefined;
}

/**
 * Wraps server-rendered HTML inside an island container element with data-drift-* attributes.
 */
export function wrapIslandHtml(
  islandName: string,
  innerHtml: string,
  options: WrapIslandOptions = {}
): string {
  const tag = options.islandTag || 'div';
  const trigger = options.trigger || 'idle';
  let attrs = ` data-drift-island="${islandName}" data-drift-trigger="${trigger}"`;

  if (options.props && Object.keys(options.props).length > 0) {
    const safeProps = JSON.stringify(options.props).replace(/"/g, '&quot;');
    attrs += ` data-drift-props="${safeProps}"`;
  }
  if (options.timeout !== undefined) {
    attrs += ` data-drift-timeout="${options.timeout}"`;
  }
  if (options.media) {
    attrs += ` data-drift-media="${options.media.replace(/"/g, '&quot;')}"`;
  }
  if (options.rootMargin) {
    attrs += ` data-drift-root-margin="${options.rootMargin.replace(/"/g, '&quot;')}"`;
  }

  return `<${tag}${attrs}>${innerHtml}</${tag}>`;
}
