import type { IslandDescriptor } from './islands.js';
import type { IslandTriggerStrategy } from './config.js';

export interface HeadingEntry {
  depth: number;
  text: string;
  id: string;
}

export interface MarkdownIslandOptions {
  /** Island component name registered on the client (e.g. 'DriftCodeEditor') */
  component?: string | undefined;
  /** Import specifier or resolved path of the island component module */
  componentPath?: string | undefined;
  /** Named export of the component module. Defaults to a default import */
  exportName?: string | undefined;
  /** Selective hydration trigger. Defaults to 'eager' (client:load) */
  trigger?: IslandTriggerStrategy | undefined;
  /** Height passed to the editor component */
  height?: string | undefined;
  /** Width passed to the editor component */
  width?: string | undefined;
  /** Extra props merged into every generated island */
  props?: Record<string, any> | undefined;
  /** Class applied to the generated island container */
  wrapperClass?: string | undefined;
}

export interface MarkdownRenderResult {
  html: string;
  headings: HeadingEntry[];
  frontmatter: Record<string, any>;
  /** Islands requested by the markdown source (e.g. `drift exe` fences) */
  islands: IslandDescriptor[];
}

export interface ContentEntry<T = Record<string, any>> {
  /** Relative identifier within collection, e.g. 'hello-world' */
  id: string;
  /** URL slug */
  slug: string;
  /** Collection name, e.g. 'blog' */
  collection: string;
  /** Typed YAML frontmatter data */
  data: T;
  /** Raw markdown body string */
  body: string;
  /** Rendered HTML string */
  html: string;
  /** Table of contents headings */
  headings: HeadingEntry[];
  /** Absolute file path */
  filePath: string;
}

export interface CollectionConfig<T = any> {
  schema?: (data: any) => T;
}
