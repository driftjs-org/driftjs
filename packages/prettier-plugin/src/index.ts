export * from '../types/index.js';
export { parse, locStart, locEnd } from './parser.js';
export { print, embed } from './printer.js';
export { options, defaultOptions } from './options.js';

import { parse, locStart, locEnd } from './parser.js';
import { print, embed } from './printer.js';
import { options, defaultOptions } from './options.js';

export const languages = [
  {
    name: 'Drift',
    parsers: ['drift'],
    extensions: ['.drift'],
    vscodeLanguageIds: ['drift'],
  },
];

export const parsers = {
  drift: {
    parse,
    astFormat: 'drift-ast',
    locStart,
    locEnd,
  },
};

export const printers = {
  'drift-ast': {
    print,
    embed,
  },
};

const plugin = {
  languages,
  parsers,
  printers,
  options,
  defaultOptions,
};

export default plugin;
