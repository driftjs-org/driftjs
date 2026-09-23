import { describe, it, expect } from "vitest";
import {
  extractScriptVars,
  validateTextDocument,
  isInsideInterpolation,
  isInsideDirectiveHeader,
  computeCompletions,
  computeHover,
  getTagContext,
  isInsideScriptBlock,
  isInsideDirectiveExpression,
  isExpressionContext,
} from "../src/server.js";
import { TextDocument } from "vscode-languageserver-textdocument";

describe("VSCode Language Server - extractScriptVars", () => {
  it("extracts comma-separated variable declarations, destructuring patterns, and functions", () => {
    const sfc = `
      <script>
        let a = 1, b = 2, c = 3;
        const { count, total } = props;
        const [ item, setItem ] = useItem();
        function handleClick() {}
      </script>
      <div>{a} {b} {c} {count} {total} {item}</div>
    `;

    const items = extractScriptVars(sfc);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("a");
    expect(labels).toContain("b");
    expect(labels).toContain("c");
    expect(labels).toContain("count");
    expect(labels).toContain("total");
    expect(labels).toContain("item");
    expect(labels).toContain("setItem");
    expect(labels).toContain("handleClick");
  });

  it("extractScriptVars does not experience catastrophic backtracking on multiline text (BUG-016)", () => {
    const sfc = `
      <script>
        let longUnfinished = "some unclosed string with lots of words and lines
        let another = 123;
      </script>
      <div>test</div>
    `;

    const start = Date.now();
    const items = extractScriptVars(sfc);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
    expect(items.some((i) => i.label === "another")).toBe(true);
  });

  it("does not treat RHS expressions, function arguments, or calls as local variables (BUG-018)", () => {
    const sfc = `
      <script>
        let a = computeTotal(discount, tax);
        const { result = fallbackCalc(rate) } = calculate(base);
        import { helper } from './utils';
      </script>
      <div>{a}</div>
    `;

    const items = extractScriptVars(sfc);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("a");
    expect(labels).toContain("result");
    expect(labels).toContain("helper");

    // RHS expressions must NOT be captured as local variables
    expect(labels).not.toContain("computeTotal");
    expect(labels).not.toContain("discount");
    expect(labels).not.toContain("tax");
    expect(labels).not.toContain("fallbackCalc");
    expect(labels).not.toContain("rate");
    expect(labels).not.toContain("calculate");
    expect(labels).not.toContain("base");
  });

  it("verifies built server and extension bundles are valid CommonJS without syntax errors", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const vm = await import("vm");

    const distServer = path.resolve(__dirname, "../dist/server.cjs");
    const distExtension = path.resolve(__dirname, "../dist/extension.cjs");

    if (fs.existsSync(distServer) && fs.existsSync(distExtension)) {
      expect(() => {
        new vm.Script(fs.readFileSync(distServer, "utf-8"));
        new vm.Script(fs.readFileSync(distExtension, "utf-8"));
      }).not.toThrow();
    }
  });
});

describe("VSCode Language Server - validateTextDocument (BUG-003 & BUG-004)", () => {
  it("emits diagnostics for mismatched tags without silencing as transient (BUG-003)", () => {
    const doc = TextDocument.create("file:///test.drift", "drift", 1, "<div><span></div>");
    const diags = validateTextDocument(doc);

    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]?.message).toMatch(/Mismatched closing tag|Expected/i);
    expect(diags[0]?.range.start.line).toBe(0);
    expect(diags[0]?.range.start.character).toBeGreaterThanOrEqual(0);
  });

  it("emits diagnostics for unclosed elements and invalid syntax (BUG-003)", () => {
    const doc = TextDocument.create("file:///test.drift", "drift", 1, "@if (x > 0) {\n  <div>\n}");
    const diags = validateTextDocument(doc);

    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]?.message).toMatch(/Unclosed element/i);
  });

  it("emits diagnostics for Acorn syntax errors inside <script> with valid line and column (BUG-004)", () => {
    const doc = TextDocument.create(
      "file:///test.drift",
      "drift",
      1,
      "<script>\nlet a = ;\n</script>\n<div>Hello</div>"
    );
    const diags = validateTextDocument(doc);

    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]?.range.start.line).toBeGreaterThanOrEqual(1);
  });

  it("returns zero diagnostics for valid Drift components", () => {
    const doc = TextDocument.create(
      "file:///test.drift",
      "drift",
      1,
      "<script>\nlet count = 0;\n</script>\n@if (count > 0) {\n  <span>{count}</span>\n}\n"
    );
    const diags = validateTextDocument(doc);

    expect(diags).toEqual([]);
  });
});

describe("VSCode Language Server - Directive Block and Interpolation Completions (BUG-005)", () => {
  it("correctly identifies interpolation vs directive block opening braces", () => {
    const insideDirectiveTag = "@if (count > 0) {\n  <button ";
    expect(isInsideInterpolation(insideDirectiveTag, insideDirectiveTag.length)).toBe(false);

    const insideDirectiveInterp = "@if (count > 0) {\n  <p>{cou";
    expect(isInsideInterpolation(insideDirectiveInterp, insideDirectiveInterp.length)).toBe(true);

    const afterClosedInterp = "@if (count > 0) {\n  <p>{count}</p>\n  <span ";
    expect(isInsideInterpolation(afterClosedInterp, afterClosedInterp.length)).toBe(false);

    const attrInterp = "<div class={act";
    expect(isInsideInterpolation(attrInterp, attrInterp.length)).toBe(true);

    const insideForTag = "@for (item, index) in items {\n  <li><button ";
    expect(isInsideInterpolation(insideForTag, insideForTag.length)).toBe(false);
  });

  it("identifies directive headers vs directive names", () => {
    expect(isInsideDirectiveHeader("@if")).toBe(false);
    expect(isInsideDirectiveHeader("@if ")).toBe(true);
    expect(isInsideDirectiveHeader("@if (")).toBe(true);
    expect(isInsideDirectiveHeader("@if (count")).toBe(true);
    expect(isInsideDirectiveHeader("@for (item, index) in items")).toBe(true);
    expect(isInsideDirectiveHeader("@case \"active\"")).toBe(true);
  });

  it("suggests HTML attributes inside tags within directive blocks instead of only scriptVars", () => {
    const text = `<script>\nlet count = 0;\n</script>\n@if (count > 0) {\n  <button \n}`;
    const offset = text.indexOf("<button ") + "<button ".length;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("class");
    expect(labels).toContain("onclick");
    expect(labels).toContain("disabled");
  });

  it("suggests HTML element tags inside directive blocks", () => {
    const text = `<script>\nlet count = 0;\n</script>\n@if (count > 0) {\n  <\n}`;
    const offset = text.indexOf("<\n") + 1;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("div");
    expect(labels).toContain("button");
    expect(labels).toContain("span");
  });

  it("suggests directives inside directive blocks when typing @", () => {
    const text = `<script>\nlet count = 0;\n</script>\n@if (count > 0) {\n  @\n}`;
    const offset = text.indexOf("@\n") + 1;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("@if");
    expect(labels).toContain("@else if");
    expect(labels).toContain("@for");
  });

  it("suggests script variables inside interpolations within directive blocks", () => {
    const text = `<script>\nlet myCount = 0;\n</script>\n@if (myCount > 0) {\n  <p>{myC\n}`;
    const offset = text.indexOf("{myC") + "{myC".length;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("myCount");
    expect(labels).not.toContain("class");
  });
});

describe("TextMate Grammar - @case block and nested braces (BUG-006 & BUG-007)", () => {
  it("validates drift.tmLanguage.json syntax and structure", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const grammarPath = path.resolve(__dirname, "../syntaxes/drift.tmLanguage.json");
    const grammar = JSON.parse(fs.readFileSync(grammarPath, "utf-8"));

    expect(grammar.name).toBe("DriftJS");
    expect(grammar.scopeName).toBe("text.html.drift");
    expect(grammar.repository["drift-directives"]).toBeDefined();
    expect(grammar.repository["drift-interpolations"]).toBeDefined();
    expect(grammar.repository["nested-braces"]).toBeDefined();
  });

  it("handles @case and all directives with expressions without falling into interpolations (BUG-006)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const grammarPath = path.resolve(__dirname, "../syntaxes/drift.tmLanguage.json");
    const grammar = JSON.parse(fs.readFileSync(grammarPath, "utf-8"));

    const dirRule = grammar.repository["drift-directives"].patterns[0];
    expect(dirRule).toBeDefined();

    // Check that begin matches all 9 directives including @case, @async, @catch
    const beginRegex = new RegExp(dirRule.begin);
    expect(beginRegex.test("@if")).toBe(true);
    expect(beginRegex.test("@else if")).toBe(true);
    expect(beginRegex.test("@else")).toBe(true);
    expect(beginRegex.test("@for")).toBe(true);
    expect(beginRegex.test("@switch")).toBe(true);
    expect(beginRegex.test("@case")).toBe(true);
    expect(beginRegex.test("@default")).toBe(true);
    expect(beginRegex.test("@async")).toBe(true);
    expect(beginRegex.test("@fallback")).toBe(true);
    expect(beginRegex.test("@catch")).toBe(true);

    // Rule contains expression pattern and block pattern with $self
    expect(dirRule.patterns.length).toBe(2);
    expect(dirRule.patterns[0].patterns[0].include).toBe("source.js");
    expect(dirRule.patterns[1].patterns[0].include).toBe("$self");
  });

  it("supports recursive nested braces in interpolations (BUG-007)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const grammarPath = path.resolve(__dirname, "../syntaxes/drift.tmLanguage.json");
    const grammar = JSON.parse(fs.readFileSync(grammarPath, "utf-8"));

    const interpRule = grammar.repository["drift-interpolations"];
    expect(interpRule.patterns.some((p: any) => p.include === "#nested-braces")).toBe(true);
    expect(interpRule.patterns.some((p: any) => p.include === "source.js")).toBe(true);

    const nestedRule = grammar.repository["nested-braces"];
    expect(nestedRule.begin).toBe("\\{");
    expect(nestedRule.end).toBe("\\}");
    expect(nestedRule.patterns.some((p: any) => p.include === "#nested-braces")).toBe(true);
    expect(nestedRule.patterns.some((p: any) => p.include === "source.js")).toBe(true);
  });
});

describe("VSCode Language Server - Modern Directives @async, @fallback, @catch (BUG-008)", () => {
  it("suggests @async, @fallback, and @catch in completions", () => {
    const text = `<script>\nlet data = null;\n</script>\n@`;
    const offset = text.indexOf("@") + 1;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("@async");
    expect(labels).toContain("@fallback");
    expect(labels).toContain("@catch");

    const asyncItem = items.find((i) => i.label === "@async");
    expect(asyncItem?.insertText).toContain("@async (${1:promise}) as ${2:data}");
    expect(asyncItem?.insertText).toContain("@fallback");
    expect(asyncItem?.insertText).toContain("@catch");
  });

  it("snippets.json contains valid @async, @fallback, and @catch snippets", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const snippetsPath = path.resolve(__dirname, "../snippets.json");
    const snippets = JSON.parse(fs.readFileSync(snippetsPath, "utf-8"));

    expect(snippets["Drift Async Directive"]).toBeDefined();
    expect(snippets["Drift Async Directive"].prefix).toBe("@async");
    expect(snippets["Drift Fallback Directive"]).toBeDefined();
    expect(snippets["Drift Fallback Directive"].prefix).toBe("@fallback");
    expect(snippets["Drift Catch Directive"]).toBeDefined();
    expect(snippets["Drift Catch Directive"].prefix).toBe("@catch");
  });

  it("hover displays documentation for @async, @fallback, and @catch directives", () => {
    const sfc = `@async (fetchData()) as res {\n  <div>{res}</div>\n} @fallback {\n  <span>Loading</span>\n} @catch (err) {\n  <span>{err}</span>\n}`;

    const hoverAsync = computeHover(sfc, { line: 0, character: 3 });
    expect(hoverAsync).not.toBeNull();
    expect((hoverAsync?.contents as any).value).toContain("@async");

    const hoverFallback = computeHover(sfc, { line: 2, character: 5 });
    expect(hoverFallback).not.toBeNull();
    expect((hoverFallback?.contents as any).value).toContain("@fallback");

    const hoverCatch = computeHover(sfc, { line: 4, character: 5 });
    expect(hoverCatch).not.toBeNull();
    expect((hoverCatch?.contents as any).value).toContain("@catch");
  });

  it("treats braces inside @async, @fallback, @catch as directive blocks, not interpolations", () => {
    const insideAsyncBlock = `@async (fetchData()) as res {\n  <button `;
    expect(isInsideInterpolation(insideAsyncBlock, insideAsyncBlock.length)).toBe(false);

    const insideFallbackBlock = `@fallback {\n  <span `;
    expect(isInsideInterpolation(insideFallbackBlock, insideFallbackBlock.length)).toBe(false);

    const insideCatchBlock = `@catch (err) {\n  <p `;
    expect(isInsideInterpolation(insideCatchBlock, insideCatchBlock.length)).toBe(false);

    const insideAsyncHeader = `@async (loadUser`;
    expect(isInsideDirectiveHeader(insideAsyncHeader)).toBe(true);

    const insideCatchHeader = `@catch (err`;
    expect(isInsideDirectiveHeader(insideCatchHeader)).toBe(true);
  });
});

describe("Language Configuration - Comments Schema (BUG-009)", () => {
  it("defines lineComment as a valid string conforming to VSCode schema", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.resolve(__dirname, "../language-configuration.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    expect(typeof config.comments.lineComment).toBe("string");
    expect(config.comments.lineComment).toBe("//");
    expect(Array.isArray(config.comments.blockComment)).toBe(true);
    expect(config.comments.blockComment).toEqual(["<!--", "-->"]);
  });
});

describe("VSCode Language Server - Hover False Positive Prevention (BUG-010)", () => {
  it("prevents state variable hover false positives on plain HTML text and tag names", () => {
    const sfc = `<script>\nlet div = 1;\nlet title = "App Title";\nlet count = 42;\n</script>\n<div title="main">\n  <p>The total count is visible</p>\n  <span>{count}</span>\n</div>`;

    // 1. Hover on `<div` (tag name): must NOT trigger state variable hover for `div`
    const hoverDivTag = computeHover(sfc, { line: 5, character: 2 }); // `<div`
    expect(hoverDivTag).toBeNull();

    // 2. Hover on `title="main"` (attribute name): must NOT trigger hover for `title`
    const hoverTitleAttr = computeHover(sfc, { line: 5, character: 7 }); // `title=`
    expect(hoverTitleAttr).toBeNull();

    // 3. Hover on `count` in plain text `The total count is visible`: must NOT trigger hover
    const hoverPlainText = computeHover(sfc, { line: 6, character: 15 }); // `count`
    expect(hoverPlainText).toBeNull();

    // 4. Hover on `{count}` inside interpolation: MUST trigger hover
    const hoverInterp = computeHover(sfc, { line: 7, character: 10 }); // `{count}`
    expect(hoverInterp).not.toBeNull();
    expect((hoverInterp?.contents as any).value).toContain("count");

    // 5. Hover inside <script> declaration: MUST trigger hover
    const hoverScript = computeHover(sfc, { line: 3, character: 5 }); // `let count`
    expect(hoverScript).not.toBeNull();
    expect((hoverScript?.contents as any).value).toContain("count");
  });

  it("allows hover on state variables inside directive expression headers", () => {
    const sfc = `<script>\nlet threshold = 10;\n</script>\n@if (threshold > 0) {\n  <div>Positive</div>\n}`;

    const hoverDirective = computeHover(sfc, { line: 3, character: 7 }); // `threshold`
    expect(hoverDirective).not.toBeNull();
    expect((hoverDirective?.contents as any).value).toContain("threshold");
  });
});

describe("VSCode Language Server - Multiline Tag Attribute Autocompletion (BUG-011)", () => {
  it("correctly identifies tag context across multiple lines", () => {
    const multilineTag = `<button\n  id="primary"\n  class="btn"\n  `;
    const tagCtx = getTagContext(multilineTag, multilineTag.length);

    expect(tagCtx.insideTag).toBe(true);
    expect(tagCtx.tagName).toBe("button");
    expect(tagCtx.insideAttrValue).toBe(false);
  });

  it("suggests HTML attributes for multiline tags", () => {
    const text = `<button\n  id="primary"\n  class="btn"\n  \n>`;
    const offset = text.indexOf("class=\"btn\"\n  ") + "class=\"btn\"\n  ".length;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("style");
    expect(labels).toContain("onclick");
    expect(labels).toContain("disabled");
    expect(labels).toContain("type");
  });

  it("suggests type attribute values inside multiline type=\"", () => {
    const text = `<input\n  class="form-control"\n  type="\n>`;
    const offset = text.indexOf("type=\"") + "type=\"".length;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("text");
    expect(labels).toContain("password");
    expect(labels).toContain("checkbox");
    expect(labels).toContain("radio");
    expect(labels).not.toContain("onclick");
  });

  it("suppresses attribute name suggestions inside other attribute string values", () => {
    const text = `<div\n  id="main"\n  class="container \n>`;
    const offset = text.indexOf("class=\"container ") + "class=\"container ".length;
    const items = computeCompletions(text, offset);

    expect(items).toEqual([]);
  });

  it("does not suggest attributes after closing > in multiline tags", () => {
    const text = `<button\n  class="btn"\n>\n  \n</button>`;
    const offset = text.indexOf(">\n  ") + ">\n  ".length;
    const items = computeCompletions(text, offset);
    const labels = items.map((i) => i.label);

    // After `>`, should suggest HTML element tags, not attributes
    expect(labels).toContain("span");
    expect(labels).toContain("div");
    expect(labels).not.toContain("onclick");
  });
});

describe("Snippet Consistency - Canonical Syntax (BUG-012)", () => {
  it("uses canonical DriftJS parentheses syntax consistently in snippets.json and server.ts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const snippetsPath = path.resolve(__dirname, "../snippets.json");
    const snippets = JSON.parse(fs.readFileSync(snippetsPath, "utf-8"));

    // Check @if snippet
    expect(snippets["Drift If Directive"].body[0]).toBe("@if (${1:condition}) {");
    expect(snippets["Drift If Directive"].prefix).toBe("@if");

    // Check @else if snippet
    expect(snippets["Drift Else If Directive"].body[0]).toBe("@else if (${1:condition}) {");
    expect(snippets["Drift Else If Directive"].prefix).toContain("@else if");
    expect(snippets["Drift Else If Directive"].prefix).toContain("@elseif");

    // Check server completions
    const items = computeCompletions("@", 1);
    const ifItem = items.find((i) => i.label === "@if");
    expect(ifItem?.insertText).toBe("@if (${1:condition}) {\n\t$0\n}");

    const elseIfItem = items.find((i) => i.label === "@else if");
    expect(elseIfItem?.insertText).toBe("@else if (${1:condition}) {\n\t$0\n}");

    const elseIfAlias = items.find((i) => i.label === "@elseif");
    expect(elseIfAlias).toBeDefined();
    expect(elseIfAlias?.insertText).toBe("@else if (${1:condition}) {\n\t$0\n}");
  });
});

describe("Root Vitest Project Matrix (BUG-013)", () => {
  it("includes vscode-plugin in root vitest.config.ts projects", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const vitestConfigPath = path.resolve(__dirname, "../../../vitest.config.ts");
    const content = fs.readFileSync(vitestConfigPath, "utf-8");

    expect(content).toContain("name: 'vscode-plugin'");
    expect(content).toContain("packages/vscode-plugin/tests/**/*.test.ts");
  });
});


