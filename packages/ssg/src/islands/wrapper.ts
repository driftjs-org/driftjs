import { escapeHtml, isValidHtmlTagName } from 'driftjs-shared';
import type { IslandTriggerStrategy } from '../../types/index.js';

export interface WrapIslandOptions {
  trigger?: IslandTriggerStrategy | undefined;
  props?: Record<string, any> | undefined;
  timeout?: number | undefined;
  media?: string | undefined;
  rootMargin?: string | undefined;
  islandTag?: string | undefined;
  className?: string | undefined;
}

/**
 * Wraps server-rendered HTML inside an island container element with data-drift-* attributes.
 */
export function wrapIslandHtml(
  islandName: string,
  innerHtml: string,
  options: WrapIslandOptions = {}
): string {
  const rawTag = options.islandTag || 'div';
  const tag = isValidHtmlTagName(rawTag) ? rawTag : 'div';
  const trigger = options.trigger || 'idle';
  let attrs = ` data-drift-island="${escapeHtml(islandName)}" data-drift-trigger="${escapeHtml(trigger)}"`;

  if (options.className) {
    attrs = ` class="${escapeHtml(options.className)}"` + attrs;
  }

  if (options.props && Object.keys(options.props).length > 0) {
    const safeProps = escapeHtml(JSON.stringify(options.props));
    attrs += ` data-drift-props="${safeProps}"`;
  }
  if (options.timeout !== undefined) {
    attrs += ` data-drift-timeout="${Number(options.timeout)}"`;
  }
  if (options.media) {
    attrs += ` data-drift-media="${escapeHtml(options.media)}"`;
  }
  if (options.rootMargin) {
    attrs += ` data-drift-root-margin="${escapeHtml(options.rootMargin)}"`;
  }

  return `<${tag}${attrs}>${innerHtml}</${tag}>`;
}
