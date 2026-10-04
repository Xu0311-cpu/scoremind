const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/annotationDiscard.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { confirmDraftDiscard, guardFileSelection } = mod.exports;

function transfer() {
  const files = [];
  return { items: { add: (file) => files.push(file) }, get files() { return files; } };
}

test("clean state does not prompt; dirty state requires explicit confirmation", () => {
  let prompts = 0;
  assert.equal(confirmDraftDiscard(false, () => { prompts++; return false; }), true);
  assert.equal(prompts, 0);
  assert.equal(confirmDraftDiscard(true, () => { prompts++; return false; }), false);
  assert.equal(confirmDraftDiscard(true, () => { prompts++; return true; }), true);
  assert.equal(prompts, 2);
});

test("cancelled file switch restores the original input FileList and leaves the selection rejected", () => {
  const original = { name: "original.musicxml" };
  const replacement = { name: "replacement.musicxml" };
  const input = { files: [replacement] };
  assert.equal(guardFileSelection(input, original, true, () => false, transfer), false);
  assert.deepEqual(input.files, [original]);
  assert.equal(guardFileSelection(input, original, true, () => true, transfer), true);
  assert.deepEqual(input.files, [original]);
});

test("cancelled unsupported selection restores the old file; empty original selection stays empty", () => {
  const original = { name: "original.musicxml" };
  const input = { files: [{ name: "unsupported.pdf" }] };
  assert.equal(guardFileSelection(input, original, true, () => false, transfer), false);
  assert.deepEqual(input.files, [original]);
  input.files = [{ name: "another.musicxml" }];
  assert.equal(guardFileSelection(input, null, true, () => false, transfer), false);
  assert.deepEqual(input.files, []);
});
