export interface HeadingEntry {
  depth: number;
  text: string;
  id: string;
}

export interface MarkdownRenderResult {
  html: string;
  headings: HeadingEntry[];
  frontmatter: Record<string, any>;
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
