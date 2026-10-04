const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(name) {
  const source = fs.readFileSync(path.join(__dirname, `../app/${name}.ts`), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", compiled)(mod, mod.exports);
  return mod.exports;
}

const { adjacentAnnotationIndex, filteredAnnotationPositions, summarizeAnnotationProgress } = loadModule("annotationProgress");
const { createHarmonyPackage, saveHarmonyEntry, writeHarmonyDraft, readHarmonyDraft, parseHarmonyPackage } = loadModule("harmonicAnnotations");
const sha = "a".repeat(64);
const at = "2026-10-04T00:00:00.000Z";
const event = { offset_qn: "0", label: "人工事件", root: null, quality: null,
  roman_numeral: null, key_context: null, harmonic_function: null, evidence: "人工依据" };
function entry(index, assessment, basis = "score_only_attested") {
  return { id: `entry-${index}`, measure_index: index, basis, assessment,
    events: assessment === "unclear" ? [] : [event],
    unclear_reason: assessment === "determined" ? null : "仍有未判位置",
    rationale: "只记录已核对的位置", created_at: at, updated_at: at };
}

test("licensed real excerpt starts at display 0 but progress keys by written order", () => {
  const xml = fs.readFileSync(path.join(__dirname, "../../backend/tests/fixtures/professional/beethoven_fur_elise_opening.musicxml"), "utf8");
  const numbers = [...xml.matchAll(/<measure number="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(numbers, ["0", "1", "2", "3", "4", "5", "6", "7"]);
  let pack = { entries: [] };
  let progress = summarizeAnnotationProgress(numbers, pack);
  assert.equal(progress.unannotatedPositions, 8);
  assert.equal(progress.determinedRecords, 0);
  assert.equal(progress.positions[0].measureIndex, 1);
  assert.equal(progress.positions[0].displayNumber, "0");

  pack = { entries: [entry(2, "unclear"), entry(4, "partial", "machine_visible"), entry(6, "determined")] };
  progress = summarizeAnnotationProgress(numbers, pack);
  assert.deepEqual([progress.unannotatedPositions, progress.unclearRecords, progress.partialRecords,
    progress.determinedRecords, progress.scoreOnlyAttestedRecords, progress.machineVisibleRecords], [5, 1, 1, 1, 2, 1]);
  assert.deepEqual(filteredAnnotationPositions(progress.positions, "unclear").map((p) => p.measureIndex), [2]);
  assert.equal(progress.positions[3].basis, "machine_visible");
  assert.equal(adjacentAnnotationIndex(filteredAnnotationPositions(progress.positions, "unannotated"), 3, 1), 5);
});

test("repeated display numbers never merge; filtered navigation wraps in written order", () => {
  const xml = fs.readFileSync(path.join(__dirname, "../../backend/tests/fixtures/timeline_meter_tuplets.musicxml"), "utf8");
  const numbers = [...xml.matchAll(/<measure number="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(numbers, ["0", "1", "1"]);
  const pack = { entries: [entry(2, "unclear"), entry(3, "partial", "machine_visible")] };
  const progress = summarizeAnnotationProgress(numbers, pack);
  assert.deepEqual(progress.positions.map((position) => [position.measureIndex, position.displayNumber, position.status]),
    [[1, "0", "unannotated"], [2, "1", "unclear"], [3, "1", "partial"]]);
  const all = filteredAnnotationPositions(progress.positions, "all");
  assert.equal(adjacentAnnotationIndex(all, 2, 1), 3);
  assert.equal(adjacentAnnotationIndex(all, 1, -1), 3);
  assert.equal(adjacentAnnotationIndex(filteredAnnotationPositions(all, "determined"), 1, 1), null);
});

test("validated import and browser draft reload recompute only human record counts", () => {
  const scope = { file_sha256: sha, measure_durations_qn: ["4", "4", "4"] };
  const storage = new Map();
  const local = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const original = saveHarmonyEntry(scope, createHarmonyPackage(scope, "测试者", "set-2"), entry(1, "unclear"));
  writeHarmonyDraft(local, scope, original);
  assert.equal(summarizeAnnotationProgress(["1", "1", "2"], readHarmonyDraft(local, scope)).unclearRecords, 1);
  const imported = saveHarmonyEntry(scope, createHarmonyPackage(scope, "另一人", "set-3"), entry(3, "partial", "machine_visible"));
  const accepted = parseHarmonyPackage(JSON.stringify(imported), scope);
  writeHarmonyDraft(local, scope, accepted);
  const progress = summarizeAnnotationProgress(["1", "1", "2"], readHarmonyDraft(local, scope));
  assert.equal(progress.unclearRecords, 0);
  assert.equal(progress.partialRecords, 1);
  assert.equal(progress.machineVisibleRecords, 1);
  assert.deepEqual(filteredAnnotationPositions(progress.positions, "unannotated").map((p) => p.measureIndex), [1, 2]);
  assert.equal(readHarmonyDraft(local, { ...scope, file_sha256: "b".repeat(64) }), null);
});

test("determined counts one human entry, not exhaustive measure coverage or correctness", () => {
  const progress = summarizeAnnotationProgress(["1", "2"], { entries: [entry(1, "determined")] });
  assert.equal(progress.determinedRecords, 1);
  assert.equal(progress.unannotatedPositions, 1);
  assert.equal(progress.positions[0].status, "determined");
  assert.equal(Object.hasOwn(progress, "accuracy"), false);
  assert.equal(Object.hasOwn(progress, "false_negative"), false);
});
