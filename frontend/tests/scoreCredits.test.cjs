const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/scoreCredits.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { resolveScoreCredits } = mod.exports;
const empty = { workTitle: "", movementTitle: "", creators: [], rights: [], sources: [], credits: [] };

test("credit-only title, subtitle and composer remain visible", () => {
  const result = resolveScoreCredits({ ...empty, credits: [
    { types: ["title"], text: "String Quartet No.4 in C major" },
    { types: ["subtitle"], text: "K.157" },
    { types: ["composer"], text: "Wolfgang Amadeus Mozart" },
  ] });
  assert.equal(result.title, "String Quartet No.4 in C major");
  assert.equal(result.subtitle, "K.157");
  assert.equal(result.composer, "Wolfgang Amadeus Mozart");
});

test("structured metadata has priority while alternative credits remain available", () => {
  const result = resolveScoreCredits({ ...empty, workTitle: "Complete work title", movementTitle: "I. Allegro",
    creators: [{ type: "composer", text: "Composer A" }, { type: "arranger", text: "Arranger B" }],
    credits: [{ types: ["title"], text: "Printed title" }, { types: ["composer"], text: "Printed composer" }],
  });
  assert.equal(result.title, "Complete work title");
  assert.equal(result.subtitle, "I. Allegro");
  assert.equal(result.composer, "Composer A");
  assert.deepEqual(result.details, ["Arranger B", "Printed title", "Printed composer"]);
});

test("repeated page credits are deduplicated and untyped text is preserved without guessing its role", () => {
  const result = resolveScoreCredits({ ...empty, rights: ["CC0"], sources: ["https://example.test/source"], credits: [
    { types: ["rights"], text: "CC0" }, { types: ["rights"], text: "CC0" },
    { types: [], text: "Unlabelled printed credit" },
  ] });
  assert.equal(result.title, "");
  assert.equal(result.composer, "");
  assert.deepEqual(result.details, ["CC0", "https://example.test/source", "Unlabelled printed credit"]);
});

test("movement-only title and lyricist fallback do not duplicate their own credits", () => {
  const result = resolveScoreCredits({ ...empty, movementTitle: "Song", credits: [
    { types: ["title"], text: "Song" }, { types: ["subtitle"], text: "Song" },
    { types: ["lyricist"], text: "Poet A" },
  ] });
  assert.equal(result.title, "Song");
  assert.equal(result.subtitle, "");
  assert.equal(result.lyricist, "Poet A");
  assert.deepEqual(result.details, []);
});
