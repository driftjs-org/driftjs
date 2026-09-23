# driftjs-prettier-plugin

Official Prettier plugin for formatting **DriftJS** Single File Components (`.drift`).

Formats `<script>` blocks (via Prettier's Babel parser), `<style>` blocks (via Prettier's CSS parser), and DriftJS template markup with all directives (`@if`, `@else if`, `@else`, `@for`, `@switch`, `@case`, `@default`, `@async`, `@fallback`, `@catch`), dynamic interpolations, and attributes.

---

## Features

- **Drift SFC Formatting:** Seamlessly parses and formats `.drift` Single File Components.
- **Embedded Languages:** Formats `<script>` logic with Babel and `<style>` sheets with CSS parsers.
- **Directives Support:** Formats all Drift template directives with clean block structures and indentation.
- **Dynamic Bindings:** Formats dynamic interpolations `{expr}` and attribute bindings `onclick={handler}`.
- **Self-Closing Void Elements:** Normalizes HTML void elements (`<input />`, `<img />`, `<hr />`, etc.).
- **Prettier v3 Compatible:** Built natively for Prettier v3 plugin architecture.

---

## Installation

```bash
pnpm add -D driftjs-prettier-plugin prettier
```

---

## Configuration

Add `driftjs-prettier-plugin` to your Prettier configuration file:

### `.prettierrc` (JSON)

```json
{
  "plugins": ["driftjs-prettier-plugin"],
  "tabWidth": 2,
  "singleQuote": true,
  "driftScriptIndent": true,
  "driftStyleIndent": true,
  "driftSelfCloseVoid": true
}
```

### `prettier.config.js` (ESM)

```javascript
export default {
  plugins: ['driftjs-prettier-plugin'],
  tabWidth: 2,
  printWidth: 80,
  driftScriptIndent: true,
  driftStyleIndent: true,
  driftSelfCloseVoid: true,
};
```

---

## Options

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `driftScriptIndent` | `boolean` | `true` | Whether to indent code inside `<script>` blocks. |
| `driftStyleIndent` | `boolean` | `true` | Whether to indent code inside `<style>` blocks. |
| `driftSelfCloseVoid` | `boolean` | `true` | Whether to self-close void HTML tags (e.g. `<input />` vs `<input>`). |

---

## CLI Usage

```bash
# Check formatting
pnpm prettier --check "**/*.drift"

# Format files in-place
pnpm prettier --write "**/*.drift"
```

---

## License

MIT (c) 2026 Hrutav Modha
