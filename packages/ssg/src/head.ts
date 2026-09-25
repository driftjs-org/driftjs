export interface MetaTag {
  name?: string;
  property?: string;
  content?: string;
  charset?: string;
  httpEquiv?: string;
  [key: string]: any;
}

export interface HeadConfig {
  title?: string;
  meta?: MetaTag[];
  links?: Array<{ rel: string; href: string; [key: string]: any }>;
}

/**
 * Extracts title and meta tags from an HTML string or head block.
 */
export function extractHeadTags(html: string): { title?: string | undefined; headHtml: string; bodyHtml: string } {
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
  const linkSet = new Set<string>();
  let titleTag = '';

  const combined = existingHeadHtml + '\n' + extraTags.join('\n');
  const lines = combined.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.toLowerCase().startsWith('<title')) {
      titleTag = line;
      continue;
    }

    if (line.toLowerCase().startsWith('<meta')) {
      const nameMatch = line.match(/\bname=["']([^"']+)["']/i);
      const propMatch = line.match(/\bproperty=["']([^"']+)["']/i);
      const key = nameMatch ? `name:${nameMatch[1]}` : propMatch ? `prop:${propMatch[1]}` : line;
      metaMap.set(key, line);
      continue;
    }

    if (line.toLowerCase().startsWith('<link')) {
      linkSet.add(line);
      continue;
    }
  }

  const result: string[] = [];
  if (titleTag) result.push(titleTag);
  for (const meta of metaMap.values()) result.push(meta);
  for (const link of linkSet.values()) result.push(link);

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
    if (options.headTags && options.headTags.length > 0) {
      const headInsert = options.headTags.join('\n  ');
      if (result.includes('</head>')) {
        result = result.replace('</head>', `  ${headInsert}\n</head>`);
      }
    }
    if (options.scripts && options.scripts.length > 0) {
      const scriptInsert = options.scripts.join('\n  ');
      if (result.includes('</body>')) {
        result = result.replace('</body>', `  ${scriptInsert}\n</body>`);
      } else {
        result += `\n${scriptInsert}`;
      }
    }
    return result;
  }

  // Wrap inside default HTML5 shell
  const titleTag = options.title ? `<title>${options.title}</title>` : '';
  const headExtra = (options.headTags || []).join('\n    ');
  const scriptsHtml = (options.scripts || []).join('\n    ');

  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${titleTag}
    ${headExtra}
  </head>
  <body>
    ${html}
    ${scriptsHtml}
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
