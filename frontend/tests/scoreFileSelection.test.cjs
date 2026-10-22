const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/scoreFileSelection.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);

test("original MusicXML and XML names pass application validation", () => {
  assert.equal(mod.exports.isSupportedScoreFile("mozart_k157_opening.musicxml"), true);
  assert.equal(mod.exports.isSupportedScoreFile("SCORE.MUSICXML"), true);
  assert.equal(mod.exports.isSupportedScoreFile("score.xml"), true);
});

test("showing files in the chooser does not authorize unsupported uploads", () => {
  for (const name of ["score.pdf", "scan.png", "score.mxl", "score.musicxml.pdf", "score"]) {
    assert.equal(mod.exports.isSupportedScoreFile(name), false);
  }
});
