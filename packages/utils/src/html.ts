/**
 * Standard HTML tag name and attribute validation regular expressions.
 */
export const VALID_TAG_NAME_REGEX = /^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/;
export const VALID_ATTR_NAME_REGEX = /^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/;

/**
 * Escapes special HTML characters to prevent XSS / attribute injection.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Unescapes HTML entities back to their original character representations.
 */
export function unescapeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Validates whether a tag name is a safe, valid HTML element tag name.
 */
export function isValidHtmlTagName(tag: string): boolean {
  return typeof tag === 'string' && tag.length > 0 && VALID_TAG_NAME_REGEX.test(tag);
}
