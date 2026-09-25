import fs from 'node:fs';
import { compile, type CompiledModule } from 'driftjs-compiler';
import { DriftServerVM, serializeNode, type ServerNode } from 'driftjs-ssr';
import type { RouteRecord, RouteParams } from '../types/index.js';
import { renderMarkdown } from './content.js';
import { extractHeadTags, injectDocument } from './head.js';
import { scanIslands } from './islands.js';

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
  islands: ReturnType<typeof scanIslands>;
  title?: string | undefined;
}

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
function createSlotNode(): ServerNode {
  return {
    type: 'comment',
    content: SLOT_MARKER,
    children: [],
  };
}

/**
 * Renders a layout enclosing child HTML.
 */
export function renderLayout(
  layoutFilePath: string,
  childHtml: string,
  scope: Record<string, any> = {}
): string {
  const source = fs.readFileSync(layoutFilePath, 'utf8');
  const compiled = compile(source);

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

  // Fallback if {children} was printed without comment (e.g. at end of container)
  return `${layoutHtml}\n${childHtml}`;
}

/**
 * Renders a full page through its nested layout hierarchy and document shell.
 */
export async function renderPage(options: RenderPageOptions): Promise<RenderResult> {
  const { route, pathname, params, props, documentPath, scripts, headTags, site } = options;

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
    const compiled = compile(source);
    pageHtml = renderModule(compiled, pageScope);
  }

  // Apply nested layouts from innermost to outermost
  let composedHtml = pageHtml;
  const layouts = [...route.layouts].reverse();

  for (const layoutPath of layouts) {
    if (fs.existsSync(layoutPath)) {
      composedHtml = renderLayout(layoutPath, composedHtml, pageScope);
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
    finalHtml = renderLayout(documentPath, bodyHtml, {
      ...pageScope,
      title: finalTitle,
    });
    // Inject scripts into document if not present
    if (scripts && scripts.length > 0 && !finalHtml.includes(scripts[0]!)) {
      finalHtml = injectDocument(finalHtml, {
        headTags: extraHead,
        scripts,
        title: finalTitle,
      });
    }
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
