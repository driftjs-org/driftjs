import type { IslandTriggerStrategy } from './config.js';

export type IslandClientDirective =
  | 'client:load'
  | 'client:idle'
  | 'client:visible'
  | 'client:interaction'
  | 'client:media';

export interface IslandDescriptor {
  /** Identifier/name of the island component (e.g. 'Counter') */
  name: string;
  /** Resolved file path or import specifier of the component */
  componentPath: string;
  /** Selective hydration trigger */
  trigger: IslandTriggerStrategy;
  /** Props passed to the island */
  props: Record<string, any>;
  /** Timeout in ms if specified */
  timeout?: number | undefined;
  /** CSS media query if specified */
  media?: string | undefined;
  /** Root margin if specified */
  rootMargin?: string | undefined;
}

export interface IslandWrapperOptions {
  islandName: string;
  trigger: IslandTriggerStrategy;
  html: string;
  props?: Record<string, any> | undefined;
  timeout?: number | undefined;
  media?: string | undefined;
  rootMargin?: string | undefined;
}

export interface IslandBundleResult {
  scriptTag?: string | undefined;
  assetPath?: string | undefined;
  size: number;
  cssTag?: string | undefined;
  cssAssetPath?: string | undefined;
  cssSize?: number | undefined;
}

