import matter from 'gray-matter';
import { marked } from 'marked';
import type { HeadingEntry, MarkdownRenderResult } from '../../types/index.js';

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
 * Compiles a markdown string into HTML with heading IDs and extracts frontmatter and table of contents.
 * Powered by standard gray-matter and marked.
 */
export function renderMarkdown(markdown: string): MarkdownRenderResult {
  const { data: frontmatter, content: body } = matter(markdown);

  const tokens = marked.lexer(body);
  const headings: HeadingEntry[] = [];

  for (const token of tokens) {
    if (token.type === 'heading') {
      const text = token.text;
      const depth = token.depth;
      const id = slugify(text);
      headings.push({ depth, text, id });
    }
  }

  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text);
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  const html = marked.parse(body, { renderer }) as string;

  return {
    html: html.trim(),
    headings,
    frontmatter,
  };
}
