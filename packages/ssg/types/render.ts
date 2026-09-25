import type { RouteRecord, RouteParams } from './router.js';
import type { IslandDescriptor } from './islands.js';

export type { IslandDescriptor } from './islands.js';

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

export interface RenderPageOptions {
  route: RouteRecord;
  pathname: string;
  params: RouteParams;
  props: Record<string, any>;
  documentPath?: string | undefined;
  scripts?: string[] | undefined;
  headTags?: string[] | undefined;
  site?: string | undefined;
}

export interface RenderResult {
  html: string;
  islands: IslandDescriptor[];
  title?: string | undefined;
}
