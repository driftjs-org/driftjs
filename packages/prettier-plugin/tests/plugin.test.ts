import { describe, it, expect } from 'vitest';
import * as prettier from 'prettier';
import plugin from '../src/index.js';

async function formatDrift(code: string, customOptions: Record<string, any> = {}): Promise<string> {
  return await prettier.format(code, {
    parser: 'drift',
    plugins: [plugin],
    tabWidth: 2,
    useTabs: false,
    printWidth: 80,
    ...customOptions,
  });
}

describe('driftjs-prettier-plugin', () => {
  describe('HTML elements and attributes', () => {
    it('formats simple elements and text', async () => {
      const input = '<div><h1>Title</h1><p>Paragraph text</p></div>';
      const output = await formatDrift(input);
      expect(output).toBe(`<div>
  <h1>Title</h1>
  <p>Paragraph text</p>
</div>
`);
    });

    it('formats void elements with self-closing slashes', async () => {
      const input = '<div class="form"><input type="text" name="username" /><hr /></div>';
      const output = await formatDrift(input);
      expect(output).toContain('<input type="text" name="username" />');
      expect(output).toContain('<hr />');
    });

    it('formats dynamic attributes with interpolations', async () => {
      const input = '<button onclick={handleClick} class={isActive ? "active" : ""}>Click</button>';
      const output = await formatDrift(input);
      expect(output).toContain('onclick={handleClick}');
      expect(output).toContain('class={isActive ? "active" : ""}');
    });

    it('formats HTML comments', async () => {
      const input = '<div><!-- This is a comment --><span>Content</span></div>';
      const output = await formatDrift(input);
      expect(output).toContain('<!-- This is a comment -->');
      expect(output).toContain('<span>Content</span>');
    });
  });

  describe('<script> block formatting', () => {
    it('formats JavaScript inside <script> using babel parser', async () => {
      const input = `<script>
const   x=1;
function   add( a,b ){ return a+b;}
</script>
<div>{add(x, 2)}</div>`;

      const output = await formatDrift(input);
      expect(output).toContain('const x = 1;');
      expect(output).toContain('function add(a, b) {');
      expect(output).toContain('  return a + b;');
    });

    it('supports driftScriptIndent option', async () => {
      const input = `<script>
let count = 0;
</script>
<p>{count}</p>`;

      const indented = await formatDrift(input, { driftScriptIndent: true });
      expect(indented).toContain('  let count = 0;');

      const unindented = await formatDrift(input, { driftScriptIndent: false });
      expect(unindented).toContain('\nlet count = 0;\n');
    });
  });

  describe('<style> block formatting', () => {
    it('formats CSS inside <style> using css parser', async () => {
      const input = `<style>
.card{color:red;margin:0px;}
</style>
<div class="card">Text</div>`;

      const output = await formatDrift(input);
      expect(output).toContain('.card {');
      expect(output).toContain('  color: red;');
      expect(output).toContain('  margin: 0px;');
    });
  });

  describe('Directives', () => {
    it('formats @if, @else if, and @else blocks', async () => {
      const input = `<div>
@if count === 0 {
<span class="zero">Zero</span>
}
@else if count > 0 {
<span class="positive">Positive</span>
}
@else {
<span class="negative">Negative</span>
}
</div>`;

      const output = await formatDrift(input);
      expect(output).toContain('@if count === 0 {');
      expect(output).toContain('  <span class="zero">Zero</span>');
      expect(output).toContain('@else if count > 0 {');
      expect(output).toContain('  <span class="positive">Positive</span>');
      expect(output).toContain('@else {');
      expect(output).toContain('  <span class="negative">Negative</span>');
    });

    it('formats @for loops with keys', async () => {
      const input = `<ul>
@for item in items key item.id {
<li>{item.name}</li>
}
</ul>`;

      const output = await formatDrift(input);
      expect(output).toContain('@for item in items key item.id {');
      expect(output).toContain('  <li>{item.name}</li>');
    });

    it('formats @for loops with index and key', async () => {
      const input = `<div>
@for (item, idx) in items key item.id {
<p>{idx}: {item.title}</p>
}
</div>`;

      const output = await formatDrift(input);
      expect(output).toContain('@for (item, idx) in items key item.id {');
      expect(output).toContain('  <p>{idx}: {item.title}</p>');
    });

    it('formats @switch and @case blocks', async () => {
      const input = `<div>
@switch status {
@case 'active' {
<span>Active</span>
}
@default {
<span>Idle</span>
}
}
</div>`;

      const output = await formatDrift(input);
      expect(output).toContain("@switch status {");
      expect(output).toContain("@case 'active' {");
      expect(output).toContain('  <span>Active</span>');
      expect(output).toContain('@default {');
      expect(output).toContain('  <span>Idle</span>');
    });

    it('formats @async, @fallback, and @catch blocks', async () => {
      const input = `<div>
@async fetchUser() as user {
<h1>{user.name}</h1>
}
@fallback {
<p>Loading...</p>
}
@catch (err) {
<p>Error: {err.message}</p>
}
</div>`;

      const output = await formatDrift(input);
      expect(output).toContain('@async fetchUser() as user {');
      expect(output).toContain('  <h1>{user.name}</h1>');
      expect(output).toContain('@fallback {');
      expect(output).toContain('  <p>Loading...</p>');
      expect(output).toContain('@catch (err) {');
      expect(output).toContain('  <p>Error: {err.message}</p>');
    });
  });

  describe('Full Single File Component', () => {
    it('formats complete Drift SFC with script, style, and markup', async () => {
      const sfc = `<script>
let count=0;
function increment(){count++;}
</script>

<style>
.counter{font-weight:bold;}
</style>

<div class="counter">
<h1>Counter</h1>
<button onclick={increment}>Count: {count}</button>
@if count > 5 {
<p>High count!</p>
}
</div>`;

      const output = await formatDrift(sfc);
      expect(output).toContain('<script>');
      expect(output).toContain('let count = 0;');
      expect(output).toContain('function increment() {');
      expect(output).toContain('</script>');
      expect(output).toContain('<style>');
      expect(output).toContain('.counter {');
      expect(output).toContain('</style>');
      expect(output).toContain('<div class="counter">');
      expect(output).toContain('  <h1>Counter</h1>');
      expect(output).toContain('  <button onclick={increment}>Count: {count}</button>');
      expect(output).toContain('  @if count > 5 {');
      expect(output).toContain('    <p>High count!</p>');
      expect(output).toContain('  }');
      expect(output).toContain('</div>');
    });

    it('formats inline phrasing elements without breaking into newlines', async () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const output = await formatDrift(input);
      expect(output.trim()).toBe('<p>Hello <strong>world</strong>!</p>');
    });

    it('preserves spaces between sibling inline elements', async () => {
      const input = '<p><span>First</span> <span>Second</span></p>';
      const output = await formatDrift(input);
      expect(output.trim()).toBe('<p><span>First</span> <span>Second</span></p>');
    });

    it('collapses ragged internal whitespace in multiline text blocks', async () => {
      const input = `<p>
         First line of prose.
         Second line with ragged indentation.
</p>`;
      const output = await formatDrift(input);
      expect(output.trim()).toBe('<p>First line of prose. Second line with ragged indentation.</p>');
    });

    it('formats TypeScript inside <script lang="ts"> without error', async () => {
      const input = `<script lang="ts">
let count: number = 0;
function add(a: number, b: number): number { return a+b; }
</script>
<p>{add(count, 5)}</p>`;
      const output = await formatDrift(input);
      expect(output).toContain('let count: number = 0;');
      expect(output).toContain('function add(a: number, b: number): number {');
      expect(output).toContain('  return a + b;');
    });

    it('formats cuddled @if, @else if, and @else blocks', async () => {
      const input = `@if count === 0 {
<span>Zero</span>
}
@else if count > 0 {
<span>Positive</span>
}
@else {
<span>Negative</span>
}`;
      const output = await formatDrift(input);
      expect(output).toContain('} @else if count > 0 {');
      expect(output).toContain('} @else {');
    });
  });
});
