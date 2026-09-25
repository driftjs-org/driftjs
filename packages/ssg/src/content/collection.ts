import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { ContentEntry } from '../../types/index.js';
import { renderMarkdown } from './markdown.js';

/**
 * Loads all content collection entries from a content directory.
 */
export async function getCollection<T = Record<string, any>>(
  collection: string,
  filter?: (entry: ContentEntry<T>) => boolean,
  contentDir: string = path.resolve(process.cwd(), 'src/content')
): Promise<ContentEntry<T>[]> {
  const collectionDir = path.resolve(contentDir, collection);
  if (!fs.existsSync(collectionDir)) {
    return [];
  }

  const entries: ContentEntry<T>[] = [];

  function readEntries(dir: string, relDir: string = '') {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        readEntries(fullPath, path.join(relDir, file.name));
      } else if (file.isFile() && file.name.endsWith('.md')) {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = renderMarkdown(raw);
        const nameWithoutExt = path.parse(file.name).name;
        const entryId = relDir ? path.join(relDir, nameWithoutExt) : nameWithoutExt;
        const slug = (parsed.frontmatter['slug'] as string) || entryId;

        const entry: ContentEntry<T> = {
          id: entryId,
          slug,
          collection,
          data: parsed.frontmatter as T,
          body: matter(raw).content,
          html: parsed.html,
          headings: parsed.headings,
          filePath: fullPath,
        };

        if (!filter || filter(entry)) {
          entries.push(entry);
        }
      }
    }
  }

  readEntries(collectionDir);
  return entries;
}

/**
 * Retrieves a single content collection entry by its slug or ID.
 */
export async function getEntry<T = Record<string, any>>(
  collection: string,
  slugOrId: string,
  contentDir?: string
): Promise<ContentEntry<T> | null> {
  const all = await getCollection<T>(collection, undefined, contentDir);
  const found = all.find((e) => e.slug === slugOrId || e.id === slugOrId);
  return found || null;
}
