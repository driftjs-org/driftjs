import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { driftPlugin } from 'driftjs-vite-plugin';
import { compile, type CompiledModule } from 'driftjs-compiler';
import { DriftServerVM, serializeNode, type ServerNode } from 'driftjs-ssr';
import type { RouteRecord, RouteParams, RenderPageOptions, RenderResult } from '../../types/index.js';
import { renderMarkdown } from '../content/index.js';
import { extractHeadTags, injectDocument } from './head.js';
import { scanIslands } from '../islands/index.js';

export type { RenderPageOptions, RenderResult };

const SLOT_MARKER = '__DRIFT_PAGE_CHILDREN__';

/**
 * Executes a compiled Drift module using DriftServerVM and returns the serialized HTML.
 */
export function renderModule(
  compiled: CompiledModule,
  scope: Record<string, any> = {}
): string {
  const vm = new DriftServerVM();
  const rootNode = vm.execute(compiled, { scope });
  return rootNode ? serializeNode(rootNode) : '';
}

/**
 * Creates a marker ServerNode comment that serializeNode prints unescaped as <!--__DRIFT_PAGE_CHILDREN__-->.
 */
export function createSlotNode(): ServerNode {
  return {
    type: 'comment',
    content: SLOT_MARKER,
    children: [],
  };
}

/**
 * Internal helper to render layout with a compiled module.
 */
function renderLayoutWithCompiled(
  compiled: CompiledModule,
  childHtml: string,
  scope: Record<string, any> = {}
): string {
  const slotNode = createSlotNode();
  const layoutScope = {
    ...scope,
    children: slotNode,
  };

  const layoutHtml = renderModule(compiled, layoutScope);
  const markerComment = `<!--${SLOT_MARKER}-->`;

  if (layoutHtml.includes(markerComment)) {
    return layoutHtml.replace(markerComment, childHtml);
  }

  return layoutHtml;
}

/**
 * Renders a layout enclosing child HTML, loading via Vite plugin.
 */
export async function renderLayout(
  layoutFilePath: string,
  childHtml: string,
  scope: Record<string, any> = {},
  moduleLoader?: ((filePath: string) => Promise<any>) | undefined
): Promise<string> {
  if (moduleLoader) {
    const mod = await moduleLoader(layoutFilePath);
    const compiled: CompiledModule = mod.default || mod;
    return renderLayoutWithCompiled(compiled, childHtml, scope);
  }

  const vite = await createViteServer({
    root: path.dirname(layoutFilePath),
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [driftPlugin()],
  });
  try {
    const mod = await vite.ssrLoadModule(layoutFilePath);
    const compiled: CompiledModule = mod.default || mod;
    return renderLayoutWithCompiled(compiled, childHtml, scope);
  } finally {
    await vite.close();
  }
}

/**
 * Renders a full page through its nested layout hierarchy and document shell.
 */
export async function renderPage(options: RenderPageOptions): Promise<RenderResult> {
  const { route, pathname, params, props, documentPath, scripts, headTags, site, moduleLoader } = options;

  let pageHtml = '';
  let islands: ReturnType<typeof scanIslands> = [];
  let pageTitle: string | undefined;

  const pageScope = {
    url: pathname,
    params,
    props,
    site,
    ...props,
  };

  if (route.filePath.endsWith('.md')) {
    // Markdown page
    const raw = fs.readFileSync(route.filePath, 'utf8');
    const mdResult = renderMarkdown(raw);
    pageHtml = mdResult.html;
    if (mdResult.frontmatter['title']) {
      pageTitle = String(mdResult.frontmatter['title']);
    }
  } else {
    // .drift SFC page
    const source = fs.readFileSync(route.filePath, 'utf8');
    islands = scanIslands(source);
    let compiled: CompiledModule;
    if (moduleLoader) {
      const mod = await moduleLoader(route.filePath);
      compiled = mod.default || mod;
    } else {
      const vite = await createViteServer({
        root: path.dirname(route.filePath),
        server: { middlewareMode: true },
        appType: 'custom',
        plugins: [driftPlugin()],
      });
      try {
        const mod = await vite.ssrLoadModule(route.filePath);
        compiled = mod.default || mod;
      } finally {
        await vite.close();
      }
    }
    pageHtml = renderModule(compiled, pageScope);
  }

  // Apply nested layouts from innermost to outermost
  let composedHtml = pageHtml;
  const layouts = [...route.layouts].reverse();

  for (const layoutPath of layouts) {
    if (fs.existsSync(layoutPath)) {
      composedHtml = await renderLayout(layoutPath, composedHtml, pageScope, moduleLoader);
      const layoutSource = fs.readFileSync(layoutPath, 'utf8');
      const layoutIslands = scanIslands(layoutSource);
      islands.push(...layoutIslands);
    }
  }

  // Extract head tags from the rendered markup
  const { title: extractedTitle, headHtml, bodyHtml } = extractHeadTags(composedHtml);
  const finalTitle = pageTitle || extractedTitle;

  const extraHead = [...(headTags || [])];
  if (headHtml) {
    extraHead.push(headHtml);
  }

  let finalHtml = bodyHtml;

  // Wrap in document shell
  if (documentPath && fs.existsSync(documentPath)) {
    finalHtml = await renderLayout(documentPath, bodyHtml, {
      ...pageScope,
      title: finalTitle,
    }, moduleLoader);
    finalHtml = injectDocument(finalHtml, {
      headTags: extraHead,
      scripts,
      title: finalTitle,
    });
  } else {
    finalHtml = injectDocument(bodyHtml, {
      headTags: extraHead,
      scripts,
      title: finalTitle,
    });
  }

  return {
    html: finalHtml,
    islands,
    title: finalTitle,
  };
}
