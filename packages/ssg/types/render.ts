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
  timeout?: number | undefined;
  /** CSS media query if specified */
  media?: string | undefined;
  /** Root margin if specified */
  rootMargin?: string | undefined;
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
  site?: string | undefined;
  headTags?: string[] | undefined;
}
