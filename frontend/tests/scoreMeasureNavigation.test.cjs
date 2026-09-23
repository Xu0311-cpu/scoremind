const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/scoreMeasureNavigation.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
const moduleForTest = { exports: {} };
new Function("module", "exports", compiled)(moduleForTest, moduleForTest.exports);
const { adjacentMeasureIndex, initialMeasureIndex, locateWrittenMeasure, writtenMeasureOptions } = moduleForTest.exports;

function timeline(numbers = ["0", "1", "1"], parts = 1) {
  return {
    status: "partial", // Repeated display numbers are diagnostic, but written positions remain distinct.
    measures: Array.from({ length: parts }, (_, part) => numbers.map((number, index) => ({
      measure_id: `p${part + 1}:m${index + 1}`,
      part_index: part + 1,
      measure_index: index + 1,
      measure_number: number,
      start: String(index),
      end: String(index + 1),
    }))).flat(),
  };
}

function score(measureCount = 3, staffCount = 1) {
  const pages = [{}];
  const sources = Array.from({ length: measureCount }, (_, index) => ({ measureListIndex: index, CompleteNumberOfStaves: staffCount }));
  return {
    Sheet: { SourceMeasures: sources },
    GraphicSheet: {
      MusicPages: pages,
      MeasureList: sources.map((source) => Array.from({ length: staffCount }, (_, staff) => ({
        parentSourceMeasure: source,
        ParentMusicSystem: { Parent: pages[0] },
        PositionAndShape: { AbsolutePosition: { x: source.measureListIndex * 10, y: staff * 10 }, BorderLeft: 0, BorderRight: 8 },
        ParentStaffLine: { PositionAndShape: { AbsolutePosition: { y: staff * 10 } }, TopLineOffset: 0, BottomLineOffset: 4 },
      }))),
    },
  };
}

test("pickup and repeated display number remain three distinct written positions", () => {
  const options = writtenMeasureOptions(timeline());
  assert.deepEqual(options.map((option) => option.measureIndex), [1, 2, 3]);
  assert.match(options[1].label, /标号 1/);
  assert.match(options[2].label, /标号 1/);
  assert.equal(initialMeasureIndex(timeline()), 1);
  assert.equal(adjacentMeasureIndex(options, 2, 1), 3);
  assert.equal(adjacentMeasureIndex(options, 2, -1), 1);
  assert.equal(adjacentMeasureIndex(options, 3, 1), null);
});

test("new or unsupported analysis resets the initial selection safely", () => {
  assert.equal(initialMeasureIndex(undefined), null);
  assert.equal(initialMeasureIndex({ status: "unsupported", measures: [] }), null);
  assert.equal(initialMeasureIndex(timeline(["9"])), 1);
  assert.equal(adjacentMeasureIndex(writtenMeasureOptions(timeline(["9"])), 3, -1), null);
});

test("one written position highlights every staff across both parts", () => {
  const result = locateWrittenMeasure(score(3, 2), timeline(["0", "1", "1"], 2), 3);
  assert.equal(result.status, "available");
  assert.deepEqual(result.outlines.map((outline) => [outline.left, outline.right]), [[20, 28], [20, 28]]);
  assert.deepEqual(result.outlines.map((outline) => [outline.top, outline.bottom]), [[-0.6, 4.6], [9.4, 14.6]]);
});

test("unsupported timeline, missing preview and mismatched count never return a target", () => {
  const unsupported = timeline(); unsupported.status = "unsupported";
  assert.equal(locateWrittenMeasure(score(), unsupported, 2).status, "unavailable");
  assert.equal(locateWrittenMeasure({}, timeline(), 2).status, "unavailable");
  assert.equal(locateWrittenMeasure(score(2), timeline(), 2).status, "unavailable");
  assert.equal(locateWrittenMeasure(score(), timeline(), null).status, "unavailable");
});

test("source mismatch, missing staff and inconsistent part grid are rejected", () => {
  const wrongSource = score();
  wrongSource.GraphicSheet.MeasureList[1][0].parentSourceMeasure = wrongSource.Sheet.SourceMeasures[0];
  assert.equal(locateWrittenMeasure(wrongSource, timeline(), 2).status, "unavailable");
  const missingStaff = score(3, 2);
  missingStaff.GraphicSheet.MeasureList[1].pop();
  assert.equal(locateWrittenMeasure(missingStaff, timeline(), 2).status, "unavailable");
  const badGrid = timeline(["0", "1", "1"], 2);
  badGrid.measures[4].end = "99";
  assert.equal(locateWrittenMeasure(score(3, 2), badGrid, 2).status, "unavailable");
});
