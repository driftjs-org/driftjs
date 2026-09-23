import { describe, it, expect } from "vitest";
import {
  extractScriptVars,
  validateTextDocument,
  isInsideInterpolation,
  isInsideDirectiveHeader,
  computeCompletions,
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
