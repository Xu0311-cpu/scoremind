const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const source = fs.readFileSync(path.join(__dirname, "../app/ExplanationResult.tsx"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", compiled)(mod, mod.exports, require);
const ExplanationResult = mod.exports.default;
const result = { explanation_version: "3.15.0", summary: "原始模板摘要", sections: [{ title: "注意限制", text: "same_offset_vertical_pitch_set_only".repeat(10) }], warnings: ["完整原始警告"] };

test("concise Chinese explanation precedes a closed disclosure containing all original evidence", () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationResult, { result, keyText: "全局调性为 C major。", noteText: "2 个音暂不判断。" }));
  assert.ok(html.indexOf("全局调性为 C major。") < html.indexOf("<details"));
  assert.ok(html.indexOf("2 个音暂不判断。") < html.indexOf("<details"));
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:[\s=>])/);
  assert.ok(html.includes(result.sections[0].text));
  assert.ok(html.includes("完整原始警告"));
  assert.ok(html.includes("原始模板摘要"));
});

test("template text is rendered as text, including inside expanded details", () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationResult, { result: { ...result, warnings: ["<script>alert('x')</script>"] }, keyText: "无调性结果", noteText: "无音符结果" }));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
