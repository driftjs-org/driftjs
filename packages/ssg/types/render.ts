import type { RouteRecord, RouteParams } from './router.js';
import type { IslandTriggerStrategy } from './config.js';

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
  timeout?: number;
  /** CSS media query if specified */
  media?: string;
  /** Root margin if specified */
  rootMargin?: string;
}

export interface LayoutDescriptor {
  filePath: string;
  component: any;
}

export interface PageRenderContext {
  url: string;
  params: RouteParams;
  props: Record<string, any>;
  route: RouteRecord;
  site?: string;
  headTags?: string[];
}
