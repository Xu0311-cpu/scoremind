const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/currentMeasureReading.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { currentMeasureReading, chordEventLabel } = mod.exports;

const event = (beat, root = "C", quality = "major") => ({ beat, pitches: ["C4", "E4", "G4"], root, quality, roman_numeral: null, harmonic_function: "unknown" });

test("written index, not duplicate display number, selects the current measure", () => {
  const measures = [
    { measure_index: 1, measure_number: 1, detected_chords: [event(1)] },
    { measure_index: 2, measure_number: 1, detected_chords: [event(2, "G", "major"), event(3, "F", "major")] },
  ];
  assert.equal(currentMeasureReading(measures, 2).measure, measures[1]);
  assert.equal(currentMeasureReading(measures, 2).measure.detected_chords.length, 2);
});

test("missing or ambiguous written identity does not borrow a chord conclusion", () => {
  const legacy = [{ measure_number: 1, detected_chords: [event(1)] }];
  assert.equal(currentMeasureReading(legacy, 1).measure, null);
  assert.equal(currentMeasureReading(legacy, null).measure, null);
  const duplicate = [{ measure_index: 1, measure_number: 1, detected_chords: [] }, { measure_index: 1, measure_number: 1, detected_chords: [event(1)] }];
  assert.equal(currentMeasureReading(duplicate, 1).measure, null);
});

test("unknown quality remains unknown instead of gaining a chord label", () => {
  assert.equal(chordEventLabel(event(1, null, "unknown")), "未能确定和弦");
});
