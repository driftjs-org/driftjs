/**
 * ESLint processor for Drift (.drift) Single File Components.
 * Allows using ESLint with .drift files by extracting script blocks.
 */
export const driftProcessor = {
  preprocess(text: string, filename: string): Array<string | { text: string; filename: string }> {
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/i;
    const match = scriptRegex.exec(text);

    if (!match) {
      return [''];
    }

    const beforeScript = text.slice(0, match.index + match[0].indexOf('>') + 1);
    const lineCount = beforeScript.split('\n').length - 1;
    const padding = '\n'.repeat(lineCount);
    const scriptBody = match[1] ?? '';

    return [`${padding}${scriptBody}`];
  },

  postprocess(messages: any[][], filename: string): any[] {
    const flat = messages.flat();
    return flat.sort((a, b) => {
      if (a.line === b.line) {
        return (a.column || 0) - (b.column || 0);
      }
      return (a.line || 0) - (b.line || 0);
    });
  },

  supportsAutofix: true,
};
