/**
 * Configuration options for driftjs-prettier-plugin.
 */
export const options = {
  driftScriptIndent: {
    type: 'boolean' as const,
    category: 'Drift',
    default: true,
    description: 'Whether to indent code inside <script> blocks.',
  },
  driftStyleIndent: {
    type: 'boolean' as const,
    category: 'Drift',
    default: true,
    description: 'Whether to indent code inside <style> blocks.',
  },
  driftSelfCloseVoid: {
    type: 'boolean' as const,
    category: 'Drift',
    default: true,
    description: 'Whether to self-close void HTML tags (e.g. <input /> instead of <input>).',
  },
};

export const defaultOptions = {
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  driftScriptIndent: true,
  driftStyleIndent: true,
  driftSelfCloseVoid: true,
};
