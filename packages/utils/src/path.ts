/**
 * Normalizes a URL path string: removes redundant slashes, ensures leading slash, trims trailing slash.
 * Single root path '/' is preserved.
 *
 * @param path - The path string to normalize.
 * @returns The normalized path string.
 */
export function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  let norm = path.replace(/\/+/g, '/');
  if (!norm.startsWith('/')) norm = '/' + norm;
  if (norm.length > 1 && norm.endsWith('/')) norm = norm.slice(0, -1);
  return norm;
}
