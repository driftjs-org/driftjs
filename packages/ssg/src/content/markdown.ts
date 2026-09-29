import matter from 'gray-matter';
import { marked } from 'marked';
import type {
  HeadingEntry,
  IslandDescriptor,
  IslandTriggerStrategy,
  MarkdownIslandOptions,
  MarkdownRenderResult,
} from '../../types/index.js';
import { wrapIslandHtml } from '../islands/wrapper.js';

/**
 * Fence info string that promotes a markdown code block into a live DriftJS editor.
 */
export const DRIFT_EXE_FENCE = 'drift exe';

export interface ResolvedMarkdownIslandOptions {
  component: string;
  componentPath: string;
  exportName: string | undefined;
  trigger: IslandTriggerStrategy;
  height: string;
  width: string;
  wrapperClass: string;
  props: Record<string, any> | undefined;
}

/**
 * Built-in wiring for `drift exe` fences: a live DriftCodeEditor island.
 */
export const DEFAULT_MARKDOWN_ISLAND: ResolvedMarkdownIslandOptions = {
  component: 'DriftCodeEditor',
  componentPath: 'driftjs-playground',
  exportName: 'DriftCodeEditor',
  trigger: 'eager',
  height: '440px',
  width: '100%',
  wrapperClass: 'drift-md-editor',
  props: undefined,
};

/**
 * Package specifiers expose a named component export, while .drift files expose a default export.
 * Mirrors the convention used when scanning .drift templates for islands.
 */
function defaultExportNameFor(componentPath: string, component: string): string | undefined {
  const isPackageSpecifier =
    !componentPath.startsWith('.') && !componentPath.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(componentPath);
  return isPackageSpecifier ? component : undefined;
}

/**
 * Merges user options over the built-in live editor defaults.
 */
function resolveIslandOptions(options: MarkdownIslandOptions): ResolvedMarkdownIslandOptions {
  const component = options.component ?? DEFAULT_MARKDOWN_ISLAND.component;
  const componentPath = options.componentPath ?? DEFAULT_MARKDOWN_ISLAND.componentPath;
  return {
    component,
    componentPath,
    exportName: options.exportName ?? defaultExportNameFor(componentPath, component),
    trigger: options.trigger ?? DEFAULT_MARKDOWN_ISLAND.trigger,
    height: options.height ?? DEFAULT_MARKDOWN_ISLAND.height,
    width: options.width ?? DEFAULT_MARKDOWN_ISLAND.width,
    wrapperClass: options.wrapperClass ?? DEFAULT_MARKDOWN_ISLAND.wrapperClass,
    props: options.props ?? DEFAULT_MARKDOWN_ISLAND.props,
  };
}

/**
 * Converts a heading title into a URL-friendly anchor slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '') // remove html tags
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .replace(/[\s_-]+/g, '-') // collapse whitespace and dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

/**
 * Detects the `drift exe` fence header written after the opening backticks.
 */
export function isDriftExeFence(lang: string | null | undefined): boolean {
  return typeof lang === 'string' && lang.trim().toLowerCase() === DRIFT_EXE_FENCE;
}

/**
 * Builds the island descriptor emitted for a `drift exe` code block.
 */
export function createMarkdownIslandDescriptor(
  code: string,
  options: MarkdownIslandOptions = {}
): IslandDescriptor {
  const resolved = resolveIslandOptions(options);
  return {
    name: resolved.component,
    componentPath: resolved.componentPath,
    exportName: resolved.exportName,
    trigger: resolved.trigger,
    props: {
      ...resolved.props,
      code: code.replace(/\n+$/, ''),
      height: resolved.height,
      width: resolved.width,
    },
  };
}

/**
 * Renders a `drift exe` code block as a client-hydrated island container.
 */
export function renderDriftExeFence(code: string, options: MarkdownIslandOptions = {}): string {
  const resolved = resolveIslandOptions(options);
  return wrapIslandHtml(resolved.component, '', {
    trigger: resolved.trigger,
    props: createMarkdownIslandDescriptor(code, options).props,
    islandTag: 'div',
    className: resolved.wrapperClass,
  });
}

/**
 * Collects the island descriptors requested by every `drift exe` fence in a markdown body.
 * Used by the island discovery pass so editor islands get bundled even when a page is not rendered.
 */
export function scanMarkdownIslands(body: string, options: MarkdownIslandOptions = {}): IslandDescriptor[] {
  const islands: IslandDescriptor[] = [];
  for (const token of marked.lexer(body)) {
    if (token.type === 'code' && isDriftExeFence(token.lang)) {
      islands.push(createMarkdownIslandDescriptor(token.text, options));
    }
  }
  return islands;
}

/**
 * Strips YAML frontmatter from a markdown source, returning the body only.
 */
export function stripFrontmatter(markdown: string): string {
  return matter(markdown).content;
}

/**
 * Compiles a markdown string into HTML with heading IDs and extracts frontmatter and table of contents.
 * Powered by standard gray-matter and marked.
 *
 * Code blocks fenced with ```drift exe are promoted into `DriftCodeEditor` client islands.
 */
export function renderMarkdown(
  markdown: string,
  islandOptions: MarkdownIslandOptions = {}
): MarkdownRenderResult {
  const { data: frontmatter, content: body } = matter(markdown);

  const tokens = marked.lexer(body);
  const headings: HeadingEntry[] = [];
  const islands: IslandDescriptor[] = [];

  for (const token of tokens) {
    if (token.type === 'heading') {
      const text = token.text;
      const depth = token.depth;
      const id = slugify(text);
      headings.push({ depth, text, id });
    }
  }

  const renderer = new marked.Renderer();
  const renderCode = renderer.code?.bind(renderer);

  renderer.heading = ({ text, depth }) => {
    const id = slugify(text);
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  renderer.code = (token) => {
    if (isDriftExeFence(token.lang)) {
      islands.push(createMarkdownIslandDescriptor(token.text, islandOptions));
      return renderDriftExeFence(token.text, islandOptions);
    }
    return renderCode ? renderCode(token) : '';
  };

  const html = marked.parse(body, { renderer }) as string;

  return {
    html: html.trim(),
    headings,
    frontmatter,
    islands,
  };
}
