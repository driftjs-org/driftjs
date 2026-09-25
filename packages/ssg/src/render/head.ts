import fs from 'node:fs';
import path from 'node:path';
import type { MetaTag, HeadConfig, HeadExtractionResult } from '../../types/index.js';

export type { MetaTag, HeadConfig };

/**
 * Builds HTML head tags from a HeadConfig and auto-discovers public stylesheets.
 */
export function buildHeadTags(
  headConfig?: HeadConfig | undefined,
  publicDir?: string | undefined,
  base: string = '/'
): string[] {
  const tags: string[] = [];
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  if (headConfig) {
    if (headConfig.title) {
      tags.push(`<title>${headConfig.title}</title>`);
    }
    if (headConfig.meta) {
      for (const m of headConfig.meta) {
        const attrs = Object.entries(m)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
          .join(' ');
        if (attrs) {
          tags.push(`<meta ${attrs} />`);
        }
      }
    }
    if (headConfig.links) {
      for (const l of headConfig.links) {
        const attrs = Object.entries(l)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
          .join(' ');
        if (attrs) {
          tags.push(`<link ${attrs} />`);
        }
      }
    }
  }

  // Auto-detect common CSS files in public directory if not explicitly linked
  if (publicDir && fs.existsSync(publicDir)) {
    const candidateFiles = ['styles.css', 'style.css', 'main.css'];
    for (const file of candidateFiles) {
      const fullPath = path.join(publicDir, file);
      if (fs.existsSync(fullPath)) {
        const href = `${normalizedBase}${file}`;
        const hasLink = tags.some((t) => t.includes(file));
        if (!hasLink) {
          tags.push(`<link rel="stylesheet" href="${href}" />`);
        }
      }
    }
  }

  return tags;
}

/**
 * Extracts title and meta tags from an HTML string or head block.
 */
export function extractHeadTags(html: string): HeadExtractionResult {
  let title: string | undefined;
  let headContent = '';
  let bodyContent = html;

  // Extract <Head>...</Head> or <head>...</head> tags if present
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch && headMatch[1]) {
    headContent = headMatch[1];
    bodyContent = html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
  }

  // Extract <title>...</title>
  const titleMatch = (headContent || html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  return { title, headHtml: headContent, bodyHtml: bodyContent };
}

/**
 * Merges head elements (title, meta tags, links) ensuring unique meta keys.
 */
export function mergeHead(
  existingHeadHtml: string,
  extraTags: string[] = []
): string {
  const metaMap = new Map<string, string>();
  const linkMap = new Map<string, string>();
  let titleTag = '';

  const combined = existingHeadHtml + '\n' + extraTags.join('\n');
  const tagMatches = combined.match(/<[^>]+>[^<]*<\/[^>]+>|<[^>]+\/>|<[^>]+>/g);
  const lines = tagMatches && tagMatches.length > 0
    ? tagMatches.map((t) => t.trim()).filter(Boolean)
    : combined.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.toLowerCase().startsWith('<title')) {
      titleTag = line;
      continue;
    }

    if (line.toLowerCase().startsWith('<meta')) {
      const nameMatch = line.match(/\bname=["']([^"']+)["']/i);
      const propMatch = line.match(/\bproperty=["']([^"']+)["']/i);
      const charsetMatch = line.match(/\bcharset=/i);
      const key = charsetMatch
        ? 'charset'
        : nameMatch
        ? `name:${nameMatch[1]?.toLowerCase()}`
        : propMatch
        ? `prop:${propMatch[1]?.toLowerCase()}`
        : line;
      metaMap.set(key, line);
      continue;
    }

    if (line.toLowerCase().startsWith('<link')) {
      const hrefMatch = line.match(/\bhref=["']([^"']+)["']/i);
      const relMatch = line.match(/\brel=["']([^"']+)["']/i);
      const key = hrefMatch
        ? `${relMatch ? relMatch[1] : 'link'}:${hrefMatch[1]}`
        : line;
      linkMap.set(key, line);
      continue;
    }
  }

  const result: string[] = [];
  if (titleTag) result.push(titleTag);
  for (const meta of metaMap.values()) result.push(meta);
  for (const link of linkMap.values()) result.push(link);

  return result.join('\n');
}

/**
 * Injects head tags and client scripts into an HTML document shell.
 */
export function injectDocument(
  html: string,
  options: {
    headTags?: string[] | undefined;
    scripts?: string[] | undefined;
    title?: string | undefined;
    lang?: string | undefined;
  } = {}
): string {
  const lang = options.lang || 'en';

  // If the rendered content is already a full document (has <!DOCTYPE html> or <html>)
  if (html.includes('<html') || html.includes('<!DOCTYPE') || html.includes('<!doctype')) {
    let result = html;
    if (!result.includes('<!DOCTYPE') && !result.includes('<!doctype')) {
      result = `<!DOCTYPE html>\n${result}`;
    }
    if (options.headTags && options.headTags.length > 0) {
      const headMatch = result.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      if (headMatch) {
        const merged = mergeHead(headMatch[1] || '', options.headTags);
        const formattedMerged = merged ? `\n    ${merged.split('\n').join('\n    ')}\n  ` : '';
        result = result.replace(/<head[^>]*>[\s\S]*?<\/head>/i, `<head>${formattedMerged}</head>`);
      } else {
        const headInsert = options.headTags.join('\n    ');
        result = result.replace('<html', `<head>\n    ${headInsert}\n  </head>\n<html`);
      }
    }
    if (options.scripts && options.scripts.length > 0) {
      const scriptInsert = options.scripts.join('\n    ');
      if (result.includes('</body>')) {
        result = result.replace('</body>', `    ${scriptInsert}\n  </body>`);
      } else {
        result += `\n${scriptInsert}`;
      }
    }
    return result;
  }

  // Wrap inside default HTML5 shell
  const initialHead: string[] = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  ];
  if (options.title) {
    initialHead.unshift(`<title>${options.title}</title>`);
  }
  const mergedHeadContent = mergeHead(initialHead.join('\n'), options.headTags || []);
  const formattedHead = mergedHeadContent ? `\n    ${mergedHeadContent.split('\n').join('\n    ')}\n  ` : '';
  const scriptsHtml = (options.scripts || []).map((s) => `    ${s}`).join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>${formattedHead}</head>
  <body>
    ${html}${scriptsHtml ? `\n${scriptsHtml}` : ''}
  </body>
</html>`;
}

/**
 * Generates standard XML sitemap.xml.
 */
export function generateSitemap(
  routes: string[],
  siteUrl: string,
  lastmod: string = new Date().toISOString().split('T')[0]!
): string {
  const baseUrl = siteUrl.replace(/\/+$/, '');
  const urlEntries = routes
    .map((r) => {
      const cleanRoute = r === '/' ? '' : (r.startsWith('/') ? r : `/${r}`);
      const loc = `${baseUrl}${cleanRoute}`;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * Generates standard robots.txt.
 */
export function generateRobotsTxt(siteUrl?: string): string {
  let robots = `User-agent: *\nAllow: /\n`;
  if (siteUrl) {
    const baseUrl = siteUrl.replace(/\/+$/, '');
    robots += `\nSitemap: ${baseUrl}/sitemap.xml\n`;
  }
  return robots;
}
