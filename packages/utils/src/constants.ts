/** Maximum registers allowed per Virtual Machine execution frame */
export const MAX_REGISTERS = 256;

/**
 * Standard WHATWG HTML void element tag names.
 * These elements cannot have child nodes and are self-closing in HTML serialization.
 */
export const VOID_ELEMENTS: ReadonlySet<string> = new Set([
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

/**
 * Shared reactive primitive tokens for symbol-keyed identification.
 */
export const STATE_TOKEN = Symbol.for('drift.state');
export const DERIVED_TOKEN = Symbol.for('drift.derived');
export const EFFECT_TOKEN = Symbol.for('drift.effect');
export const PROPS_TOKEN = Symbol.for('drift.props');

/**
 * Canonical function names for reactive primitives.
 */
export const STATE_FN = 'state';
export const DERIVED_FN = 'derived';
export const DERIVE_FN_LEGACY = 'derive';
export const EFFECT_FN = 'effect';
export const PROPS_FN = 'props';

