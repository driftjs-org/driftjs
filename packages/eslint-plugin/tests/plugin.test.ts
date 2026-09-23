import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin, { parseForESLint, driftProcessor } from '../src/index.js';

describe('driftjs-eslint-plugin', () => {
  describe('Parser: parseForESLint', () => {
    it('parses a complete .drift SFC with <script> and template', () => {
      const code = `<script>
  let count = 0;
  function increment() {
    count++;
  }
</script>

<button onclick={increment}>Count: {count}</button>`;

      const result = parseForESLint(code);
      expect(result.ast).toBeDefined();
      expect(result.ast.type).toBe('Program');
      expect(result.services.drift).toBeDefined();

      const drift = result.services.drift!;
      expect(drift.declaredScriptVars.has('count')).toBe(true);
      expect(drift.declaredScriptVars.has('increment')).toBe(true);
      expect(drift.templateReferencedVars.has('count')).toBe(true);
      expect(drift.templateReferencedVars.has('increment')).toBe(true);
      expect(drift.scriptRange).not.toBeNull();
      expect(drift.scriptRange!.startLine).toBe(1);
    });

    it('parses a template-only .drift SFC without <script>', () => {
      const code = `<div><h1>Static Header</h1><p>Welcome to DriftJS</p></div>`;
      const result = parseForESLint(code);
      expect(result.ast).toBeDefined();
      expect(result.ast.type).toBe('Program');
      expect(result.services.drift!.scriptRange).toBeNull();
      expect(result.services.drift!.templateAst).not.toBeNull();
    });

    it('throws remapped SyntaxError for syntax errors in <script>', () => {
      const code = `<script>
  let a = ;
</script>
<div></div>`;

      expect(() => parseForESLint(code)).toThrow();
    });
  });

  describe('Rule: no-duplicate-script', () => {
    const linter = new Linter({ configType: 'flat' });

    it('reports error when multiple <script> tags exist', () => {
      const code = `<script>
  let a = 1;
</script>
<script>
  let b = 2;
</script>
<div>{a} {b}</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-duplicate-script': 'error' },
      });

      expect(messages.some((m) => m.ruleId === 'drift/no-duplicate-script')).toBe(true);
    });

    it('passes when only one <script> tag is present', () => {
      const code = `<script>
  let a = 1;
</script>
<div>{a}</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-duplicate-script': 'error' },
      });

      expect(messages.filter((m) => m.ruleId === 'drift/no-duplicate-script')).toHaveLength(0);
    });
  });

  describe('Rule: no-undef-in-template', () => {
    const linter = new Linter({ configType: 'flat' });

    it('flags undeclared variables in template', () => {
      const code = `<script>
  let count = 0;
</script>
<div>
  <span>{count}</span>
  <span>{missingVar}</span>
</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-undef-in-template': 'error' },
      });

      const undefMsg = messages.find((m) => m.ruleId === 'drift/no-undef-in-template');
      expect(undefMsg).toBeDefined();
      expect(undefMsg!.message).toContain('missingVar');
    });

    it('recognizes directive-scoped variables in @for and globals', () => {
      const code = `<script>
  let items = ['a', 'b'];
</script>
<div>
  @for item in items key item {
    <p>{item} {props.title} {Math.max(1, 2)}</p>
  }
</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-undef-in-template': 'error' },
      });

      expect(messages.filter((m) => m.ruleId === 'drift/no-undef-in-template')).toHaveLength(0);
    });
  });

  describe('Rule: valid-directives', () => {
    const linter = new Linter({ configType: 'flat' });

    it('reports error on @if with empty condition', () => {
      const code = `<div>
  @if {
    <span>Invalid</span>
  }
</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/valid-directives': 'error' },
      });

      expect(messages.some((m) => m.ruleId === 'drift/valid-directives')).toBe(true);
    });
  });

  describe('Rule: no-direct-dom-access', () => {
    const linter = new Linter({ configType: 'flat' });

    it('warns on top-level window/document access', () => {
      const code = `<script>
  const w = window.innerWidth;
</script>
<div></div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-direct-dom-access': 'warn' },
      });

      expect(messages.some((m) => m.ruleId === 'drift/no-direct-dom-access')).toBe(true);
    });

    it('allows window/document access inside functions', () => {
      const code = `<script>
  function getWidth() {
    return window.innerWidth;
  }
</script>
<button onclick={getWidth}>Width</button>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-direct-dom-access': 'warn' },
      });

      expect(messages.filter((m) => m.ruleId === 'drift/no-direct-dom-access')).toHaveLength(0);
    });
  });

  describe('Rule: prefer-for-key', () => {
    const linter = new Linter({ configType: 'flat' });

    it('warns when @for does not specify a key', () => {
      const code = `<script>
  let items = [1, 2];
</script>
<div>
  @for item in items {
    <p>{item}</p>
  }
</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/prefer-for-key': 'warn' },
      });

      expect(messages.some((m) => m.ruleId === 'drift/prefer-for-key')).toBe(true);
    });

    it('passes when @for specifies a key', () => {
      const code = `<script>
  let items = [{ id: 1 }];
</script>
<div>
  @for item in items key item.id {
    <p>{item.id}</p>
  }
</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/prefer-for-key': 'warn' },
      });

      expect(messages.filter((m) => m.ruleId === 'drift/prefer-for-key')).toHaveLength(0);
    });
  });

  describe('Rule: no-reserved-event-names', () => {
    const linter = new Linter({ configType: 'flat' });

    it('flags camelCase events and provides auto-fix', () => {
      const code = `<script>
  function handleClick() {}
</script>
<button onClick={handleClick}>Click</button>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-reserved-event-names': 'error' },
      });

      const msg = messages.find((m) => m.ruleId === 'drift/no-reserved-event-names');
      expect(msg).toBeDefined();
      expect(msg!.fix).toBeDefined();

      const fixed = linter.verifyAndFix(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-reserved-event-names': 'error' },
      });

      expect(fixed.output).toContain('onclick={handleClick}');
    });
  });

  describe('Rule: no-unclosed-tags', () => {
    const linter = new Linter({ configType: 'flat' });

    it('flags unclosed tags in template', () => {
      const code = `<script>
  let title = 'Hello';
</script>
<div>
  <p>{title}
</div>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: { 'drift/no-unclosed-tags': 'error' },
      });

      expect(messages.some((m) => m.ruleId === 'drift/no-unclosed-tags')).toBe(true);
    });
  });

  describe('ESLint standard no-unused-vars integration', () => {
    const linter = new Linter({ configType: 'flat' });

    it('does not report variables used in template as unused', () => {
      const code = `<script>
  let usedInTemplate = 100;
  let unusedVar = 200;
  function handlePress() {}
</script>
<button onclick={handlePress}>{usedInTemplate}</button>`;

      const messages = linter.verify(code, {
        plugins: { drift: plugin },
        languageOptions: { parser: plugin.parser },
        rules: {
          'no-unused-vars': 'error',
        },
      });

      expect(messages.some((m) => m.message.includes('unusedVar'))).toBe(true);
      expect(messages.some((m) => m.message.includes('usedInTemplate'))).toBe(false);
      expect(messages.some((m) => m.message.includes('handlePress'))).toBe(false);
    });
  });

  describe('Processor: driftProcessor', () => {
    it('preprocesses and postprocesses drift script content', () => {
      const code = `<script>
  let x = 1;
</script>
<div>{x}</div>`;

      const blocks = driftProcessor.preprocess(code, 'Test.drift');
      expect(blocks).toHaveLength(1);
      expect(typeof blocks[0]).toBe('string');
      expect(blocks[0] as string).toContain('let x = 1;');

      const post = driftProcessor.postprocess(
        [[{ ruleId: 'test', message: 'msg', line: 2, column: 3 }]],
        'Test.drift'
      );
      expect(post).toHaveLength(1);
      expect(post[0].line).toBe(2);
    });
  });
});
