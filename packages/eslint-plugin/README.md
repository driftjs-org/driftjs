# driftjs-eslint-plugin

Official ESLint plugin and parser for **DriftJS** Single File Components (`.drift`).

Provides dedicated syntax parsing, template variable tracking, lifecycle safety checks, and template validation rules for DriftJS applications.

---

## Features

- **Drift SFC Parser:** Native parser (`driftjs-eslint-plugin/parser`) supporting `<script>` logic, template markup, interpolations (`{expr}`), and directives (`@if`, `@for`, `@switch`, `@async`).
- **Template Scope Awareness:** Automatically registers variables used in template expressions with ESLint scope analysis, preventing false-positive `no-unused-vars` errors.
- **Custom Drift Rules:** Rules checking directive syntax, keyed reconciliation, event delegation naming, DOM access safety, and duplicate script blocks.
- **Auto-Fixing:** Automatically converts camelCase event attributes (e.g. `onClick`) to lowercase (`onclick`) required by DriftJS DOM event delegation.
- **ESLint v8 & v9+ Flat Config Support:** First-class support for both modern flat configs (`eslint.config.js`) and legacy configs (`.eslintrc`).

---

## Installation

```bash
pnpm add -D driftjs-eslint-plugin eslint
```

---

## Configuration

### Flat Config (`eslint.config.js`) — Recommended

```javascript
import driftPlugin from 'driftjs-eslint-plugin';

export default [
  // Recommended configuration for .drift Single File Components
  driftPlugin.configs.recommended,

  // Custom project rules
  {
    files: ['**/*.drift'],
    rules: {
      'drift/prefer-for-key': 'error',
    },
  },
];
```

### Legacy Config (`.eslintrc.cjs`)

```javascript
module.exports = {
  plugins: ['driftjs-eslint-plugin'],
  overrides: [
    {
      files: ['*.drift'],
      parser: 'driftjs-eslint-plugin',
      rules: {
        'drift/no-duplicate-script': 'error',
        'drift/no-undef-in-template': 'error',
        'drift/valid-directives': 'error',
        'drift/no-unclosed-tags': 'error',
        'drift/prefer-for-key': 'warn',
        'drift/no-reserved-event-names': 'warn',
      },
    },
  ],
};
```

---

## Rules

| Rule | Description | Recommended | Fixable |
| :--- | :--- | :---: | :---: |
| `drift/no-duplicate-script` | Disallows multiple `<script>` blocks in a `.drift` SFC | Yes | No |
| `drift/no-undef-in-template` | Flags undeclared variables in interpolations & directives | Yes | No |
| `drift/valid-directives` | Validates syntax of `@if`, `@for`, `@switch`, `@async` | Yes | No |
| `drift/no-unclosed-tags` | Flags unclosed or mismatched HTML/element tags | Yes | No |
| `drift/prefer-for-key` | Suggests a `key` expression on `@for` for keyed LIS reconciliation | Yes | No |
| `drift/no-reserved-event-names` | Enforces lowercase HTML event handlers (`onclick` vs `onClick`) | Yes | Yes |
| `drift/no-direct-dom-access` | Warns against top-level `window` or `document` access in `<script>` | No | No |

---

## License

MIT (c) 2026 Hrutav Modha
