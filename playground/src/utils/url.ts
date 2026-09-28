/**
 * Encodes code into a URL-safe hash format.
 */
export function encodeCodeToHash(code: string): string {
  try {
    const encoded = btoa(encodeURIComponent(code).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return `#code=${encoded}`;
  } catch {
    return `#code=${encodeURIComponent(code)}`;
  }
}

/**
 * Decodes code from the URL hash.
 */
export function decodeCodeFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash.startsWith('#code=')) return null;

  const raw = hash.slice(6);
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(raw), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return decoded;
  } catch {
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
}

/**
 * Copies text to the user's clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
