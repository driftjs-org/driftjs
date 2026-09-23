import { doc } from 'prettier';
import type { AstPath, Doc } from 'prettier';
import { ASTNodeType } from 'driftjs-compiler';
import type {
  ProgramNode,
  TemplateChildNode,
  ElementNode,
  AttributeNode,
  InterpolationNode,
  TextNode,
  CommentNode,
  IfNode,
  ForNode,
  SwitchNode,
  AsyncNode,
} from 'driftjs-compiler';
import type { DriftParserOptions } from '../types/index.js';

const { group, indent, softline, hardline, join } = doc.builders;

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function isWhitespaceOnly(text: string): boolean {
  return /^\s*$/.test(text);
}

function hasBlockChildren(children: readonly TemplateChildNode[]): boolean {
  for (const child of children) {
    if (
      child.type === ASTNodeType.Element ||
      child.type === ASTNodeType.If ||
      child.type === ASTNodeType.For ||
      child.type === ASTNodeType.Switch ||
      child.type === ASTNodeType.Async
    ) {
      return true;
    }
  }
  return false;
}

function getRawTagContent(elem: ElementNode): string {
  const parts: string[] = [];
  for (const child of elem.children) {
    if (child.type === ASTNodeType.Text && typeof child.content === 'string') {
      parts.push(child.content);
    }
  }
  return parts.join('');
}

function printAttributes(
  attributes: readonly AttributeNode[],
  options: any
): Doc {
  if (!attributes || attributes.length === 0) {
    return '';
  }

  const quote = options.singleQuote ? "'" : '"';
  const parts: Doc[] = [];

  for (const attr of attributes) {
    if (attr.value === null) {
      parts.push(attr.name);
    } else if (typeof attr.value === 'string') {
      parts.push(`${attr.name}=${quote}${attr.value}${quote}`);
    } else if (attr.value.type === ASTNodeType.Interpolation) {
      const expr = typeof attr.value.expression === 'string' ? attr.value.expression.trim() : '';
      parts.push(`${attr.name}={${expr}}`);
    }
  }

  return [' ', join(' ', parts)];
}

function printChildrenList(
  children: readonly TemplateChildNode[],
  path: AstPath,
  options: any,
  print: (path: AstPath) => Doc,
  isBlock: boolean,
  propName: string
): Doc {
  if (!children || children.length === 0) {
    return '';
  }

  const mappedDocs: Doc[] = path.map(print, propName);
  const printedDocs: Doc[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    if (child.type === ASTNodeType.Text && typeof child.content === 'string') {
      if (isWhitespaceOnly(child.content)) {
        continue;
      }
    }
    const docItem = mappedDocs[i];
    if (docItem !== undefined && docItem !== '') {
      printedDocs.push(docItem);
    }
  }

  if (printedDocs.length === 0) {
    return '';
  }

  if (isBlock) {
    return join(hardline, printedDocs);
  }

  return printedDocs.length === 1 ? printedDocs[0]! : join('', printedDocs);
}

export function print(
  path: AstPath,
  options: any,
  printChild: (path: AstPath) => Doc
): Doc {
  const node = path.node;
  if (!node || typeof node !== 'object') {
    return '';
  }

  switch (node.type) {
    case ASTNodeType.Program: {
      const prog = node as ProgramNode;
      const elements: Doc[] = [];
      const body = prog.body;
      const bodyDocs = path.map(printChild, 'body');

      for (let i = 0; i < body.length; i++) {
        const item = body[i]!;
        if (item.type === ASTNodeType.Text && typeof item.content === 'string') {
          if (isWhitespaceOnly(item.content)) {
            continue;
          }
        }
        const itemDoc = bodyDocs[i];
        if (itemDoc !== undefined && itemDoc !== '') {
          elements.push(itemDoc);
        }
      }

      if (elements.length === 0) {
        return '';
      }

      return [join([hardline, hardline], elements), hardline];
    }

    case ASTNodeType.Element: {
      const elem = node as ElementNode;
      const tagLower = elem.tagName.toLowerCase();
      const isRaw = tagLower === 'script' || tagLower === 'style';
      const isVoid = VOID_ELEMENTS.has(tagLower);
      const attrsDoc = printAttributes(elem.attributes, options);

      if (isRaw) {
        const rawContent = getRawTagContent(elem).trim();
        if (!rawContent) {
          return [`<${elem.tagName}`, attrsDoc, `></${elem.tagName}>`];
        }
        const shouldIndent =
          tagLower === 'script'
            ? options.driftScriptIndent !== false
            : options.driftStyleIndent !== false;

        const innerDoc = shouldIndent
          ? indent([hardline, rawContent])
          : [hardline, rawContent];

        return [
          `<${elem.tagName}`,
          attrsDoc,
          '>',
          innerDoc,
          hardline,
          `</${elem.tagName}>`,
        ];
      }

      if (isVoid) {
        const selfClose = options.driftSelfCloseVoid !== false ? ' />' : '>';
        return [`<${elem.tagName}`, attrsDoc, selfClose];
      }

      if (elem.isSelfClosing) {
        return [`<${elem.tagName}`, attrsDoc, ' />'];
      }

      const hasBlock = hasBlockChildren(elem.children);
      const childrenDoc = printChildrenList(
        elem.children,
        path,
        options,
        printChild,
        hasBlock,
        'children'
      );

      if (!childrenDoc || (Array.isArray(childrenDoc) && childrenDoc.length === 0)) {
        return [`<${elem.tagName}`, attrsDoc, `></${elem.tagName}>`];
      }

      if (hasBlock) {
        return group([
          `<${elem.tagName}`,
          attrsDoc,
          '>',
          indent([hardline, childrenDoc]),
          hardline,
          `</${elem.tagName}>`,
        ]);
      }

      return group([
        `<${elem.tagName}`,
        attrsDoc,
        '>',
        indent([softline, childrenDoc]),
        softline,
        `</${elem.tagName}>`,
      ]);
    }

    case ASTNodeType.Attribute: {
      const attr = node as AttributeNode;
      const quote = options.singleQuote ? "'" : '"';
      if (attr.value === null) {
        return attr.name;
      }
      if (typeof attr.value === 'string') {
        return `${attr.name}=${quote}${attr.value}${quote}`;
      }
      if (attr.value.type === ASTNodeType.Interpolation) {
        const expr = typeof attr.value.expression === 'string' ? attr.value.expression.trim() : '';
        return `${attr.name}={${expr}}`;
      }
      return attr.name;
    }

    case ASTNodeType.Interpolation: {
      const interp = node as InterpolationNode;
      const expr = typeof interp.expression === 'string' ? interp.expression.trim() : '';
      return `{${expr}}`;
    }

    case ASTNodeType.Text: {
      const textNode = node as TextNode;
      if (typeof textNode.content === 'string') {
        if (isWhitespaceOnly(textNode.content)) {
          return '';
        }
        const hasLeading = /^\s/.test(textNode.content);
        const hasTrailing = /\s$/.test(textNode.content);
        const trimmed = textNode.content.trim();
        return (hasLeading ? ' ' : '') + trimmed + (hasTrailing ? ' ' : '');
      }
      return '';
    }

    case ASTNodeType.Comment: {
      const commentNode = node as CommentNode;
      return `<!-- ${commentNode.content.trim()} -->`;
    }

    case ASTNodeType.If: {
      const ifNode = node as IfNode;
      const parts: Doc[] = [];

      const printIfNode = (currIf: IfNode, currPath: AstPath, isElseIf: boolean) => {
        const test = typeof currIf.test === 'string' ? currIf.test.trim() : '';
        const consequentDoc = printChildrenList(
          currIf.consequent,
          currPath,
          options,
          printChild,
          hasBlockChildren(currIf.consequent),
          'consequent'
        );

        const prefix = isElseIf ? '@else if' : '@if';
        parts.push(
          `${prefix} ${test} {`,
          indent([hardline, consequentDoc]),
          hardline,
          '}'
        );

        if (currIf.alternate) {
          if (Array.isArray(currIf.alternate)) {
            const altDoc = printChildrenList(
              currIf.alternate,
              currPath,
              options,
              printChild,
              hasBlockChildren(currIf.alternate),
              'alternate'
            );
            parts.push(
              hardline,
              '@else {',
              indent([hardline, altDoc]),
              hardline,
              '}'
            );
          } else {
            parts.push(hardline);
            currPath.call((altPath) => {
              printIfNode(currIf.alternate as IfNode, altPath, true);
            }, 'alternate');
          }
        }
      };

      printIfNode(ifNode, path, false);
      return parts;
    }

    case ASTNodeType.For: {
      const forNode = node as ForNode;
      const itemStr = forNode.index ? `(${forNode.item}, ${forNode.index})` : forNode.item;
      const iterStr = typeof forNode.iterable === 'string' ? forNode.iterable.trim() : '';
      const keyStr = forNode.key && typeof forNode.key === 'string' ? ` key ${forNode.key.trim()}` : '';
      const bodyHasBlock = hasBlockChildren(forNode.body);
      const bodyDoc = printChildrenList(
        forNode.body,
        path,
        options,
        printChild,
        bodyHasBlock,
        'body'
      );

      return [
        `@for ${itemStr} in ${iterStr}${keyStr} {`,
        indent([hardline, bodyDoc]),
        hardline,
        '}',
      ];
    }

    case ASTNodeType.Switch: {
      const switchNode = node as SwitchNode;
      const disc = typeof switchNode.discriminant === 'string' ? switchNode.discriminant.trim() : '';
      const caseDocs: Doc[] = path.map((casePath) => {
        const c = casePath.node as any;
        const bodyDoc = printChildrenList(
          c.body,
          casePath,
          options,
          printChild,
          hasBlockChildren(c.body),
          'body'
        );
        if (c.expression !== null) {
          const expr = typeof c.expression === 'string' ? c.expression.trim() : '';
          return [
            `@case ${expr} {`,
            indent([hardline, bodyDoc]),
            hardline,
            '}',
          ];
        }
        return [
          '@default {',
          indent([hardline, bodyDoc]),
          hardline,
          '}',
        ];
      }, 'cases');

      return [
        `@switch ${disc} {`,
        indent([hardline, join(hardline, caseDocs)]),
        hardline,
        '}',
      ];
    }

    case ASTNodeType.Async: {
      const asyncNode = node as AsyncNode;
      const prom = typeof asyncNode.promise === 'string' ? asyncNode.promise.trim() : '';
      const alias = asyncNode.alias?.trim() ?? '';
      const bodyDoc = printChildrenList(
        asyncNode.body,
        path,
        options,
        printChild,
        hasBlockChildren(asyncNode.body),
        'body'
      );

      const parts: Doc[] = [
        `@async ${prom} as ${alias} {`,
        indent([hardline, bodyDoc]),
        hardline,
        '}',
      ];

      if (asyncNode.fallback) {
        const fallbackDoc = printChildrenList(
          asyncNode.fallback,
          path,
          options,
          printChild,
          hasBlockChildren(asyncNode.fallback),
          'fallback'
        );
        parts.push(
          hardline,
          '@fallback {',
          indent([hardline, fallbackDoc]),
          hardline,
          '}'
        );
      }

      if (asyncNode.catchBranch) {
        const catchBranch = asyncNode.catchBranch;
        const catchDoc = path.call((catchPath) => {
          return printChildrenList(
            catchBranch.body,
            catchPath,
            options,
            printChild,
            hasBlockChildren(catchBranch.body),
            'body'
          );
        }, 'catchBranch');

        parts.push(
          hardline,
          `@catch (${catchBranch.errorVar}) {`,
          indent([hardline, catchDoc]),
          hardline,
          '}'
        );
      }

      return parts;
    }

    default:
      return '';
  }
}

export function embed(path: AstPath, options: any) {
  const node = path.node;
  if (!node || node.type !== ASTNodeType.Element) return null;

  const tagLower = node.tagName.toLowerCase();
  if (tagLower === 'script') {
    return async (textToDoc: (text: string, options: any) => Promise<Doc>) => {
      const rawContent = getRawTagContent(node).trim();
      const attrsDoc = printAttributes(node.attributes, options);
      if (!rawContent) {
        return [`<${node.tagName}`, attrsDoc, `></${node.tagName}>`];
      }

      try {
        const formatted = await textToDoc(rawContent, { parser: 'babel' });
        const shouldIndent = options.driftScriptIndent !== false;
        const innerDoc = shouldIndent
          ? indent([hardline, formatted])
          : [hardline, formatted];

        return [
          `<${node.tagName}`,
          attrsDoc,
          '>',
          innerDoc,
          hardline,
          `</${node.tagName}>`,
        ];
      } catch {
        return [
          `<${node.tagName}`,
          attrsDoc,
          '>',
          indent([hardline, rawContent]),
          hardline,
          `</${node.tagName}>`,
        ];
      }
    };
  }

  if (tagLower === 'style') {
    return async (textToDoc: (text: string, options: any) => Promise<Doc>) => {
      const rawContent = getRawTagContent(node).trim();
      const attrsDoc = printAttributes(node.attributes, options);
      if (!rawContent) {
        return [`<${node.tagName}`, attrsDoc, `></${node.tagName}>`];
      }

      try {
        const formatted = await textToDoc(rawContent, { parser: 'css' });
        const shouldIndent = options.driftStyleIndent !== false;
        const innerDoc = shouldIndent
          ? indent([hardline, formatted])
          : [hardline, formatted];

        return [
          `<${node.tagName}`,
          attrsDoc,
          '>',
          innerDoc,
          hardline,
          `</${node.tagName}>`,
        ];
      } catch {
        return [
          `<${node.tagName}`,
          attrsDoc,
          '>',
          indent([hardline, rawContent]),
          hardline,
          `</${node.tagName}>`,
        ];
      }
    };
  }

  return null;
}
