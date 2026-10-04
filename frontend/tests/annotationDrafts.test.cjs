const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/annotationDrafts.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { clearMeasureDraft, draftForMeasure, isUnsavedMeasureDraft, unsavedMeasureIndices, updateMeasureDraft } = mod.exports;

const saved = { assessment: "partial", events: [{ offset_qn: "0", label: "已有事件" }],
  unclear_reason: "尚有未定位置", rationale: "已保存依据" };

test("unsaved text and event edits survive jumps through both measure selectors", () => {
  let drafts = {};
  drafts = updateMeasureDraft(drafts, 1, null, { rationale: "未保存的小节依据", unclearReason: "仍不明确" });
  drafts = updateMeasureDraft(drafts, 1, null, { assessment: "partial", events: [{ offset_qn: "0", label: "待保存事件" }] });
  drafts = updateMeasureDraft(drafts, 2, saved, { rationale: "第二小节的修改" });
  assert.deepEqual(draftForMeasure(drafts, 1, null), {
    assessment: "partial", events: [{ offset_qn: "0", label: "待保存事件" }],
    unclearReason: "仍不明确", rationale: "未保存的小节依据",
  });
  assert.equal(draftForMeasure(drafts, 2, saved).rationale, "第二小节的修改");
  assert.equal(draftForMeasure(drafts, 3, null).rationale, "");
});

test("failed save keeps the draft; successful save or delete clears only its measure", () => {
  let drafts = updateMeasureDraft({}, 1, null, { rationale: "仍需保留" });
  drafts = updateMeasureDraft(drafts, 2, null, { rationale: "另一小节" });
  assert.equal(draftForMeasure(drafts, 1, null).rationale, "仍需保留");
  drafts = clearMeasureDraft(drafts, 1);
  assert.equal(draftForMeasure(drafts, 1, null).rationale, "");
  assert.equal(draftForMeasure(drafts, 2, null).rationale, "另一小节");
  assert.deepEqual(clearMeasureDraft(drafts, 2), {});
});

test("blank and unchanged saved forms are clean; reverting edits removes the dirty state", () => {
  assert.equal(isUnsavedMeasureDraft(draftForMeasure({}, 1, null), null), false);
  const savedEntry = { ...saved, measure_index: 2 };
  let drafts = updateMeasureDraft({}, 1, null, {});
  drafts = updateMeasureDraft(drafts, 2, savedEntry, {});
  assert.deepEqual(unsavedMeasureIndices(drafts, { entries: [savedEntry] }), []);
  drafts = updateMeasureDraft(drafts, 2, savedEntry, { rationale: "改动" });
  assert.deepEqual(unsavedMeasureIndices(drafts, { entries: [savedEntry] }), [2]);
  drafts = updateMeasureDraft(drafts, 2, savedEntry, { rationale: saved.rationale });
  assert.deepEqual(unsavedMeasureIndices(drafts, { entries: [savedEntry] }), []);
});

test("event edits and unsaved text are counted per written measure, never as saved progress", () => {
  const event = { offset_qn: "0", label: "C major", root: "C", quality: "major", roman_numeral: null,
    key_context: null, harmonic_function: null, evidence: "谱面 C-E-G" };
  const savedEntry = { ...saved, measure_index: 2, events: [event] };
  let drafts = updateMeasureDraft({}, 1, null, { rationale: "第一小节未保存" });
  drafts = updateMeasureDraft(drafts, 2, savedEntry, { events: [{ ...event, evidence: "改动依据" }] });
  assert.deepEqual(unsavedMeasureIndices(drafts, { entries: [savedEntry] }), [1, 2]);
  assert.equal(isUnsavedMeasureDraft(draftForMeasure(drafts, 3, null), null), false);
  drafts = clearMeasureDraft(drafts, 1);
  assert.deepEqual(unsavedMeasureIndices(drafts, { entries: [savedEntry] }), [2]);
  drafts = updateMeasureDraft(drafts, 2, savedEntry, { events: [event] });
  assert.deepEqual(unsavedMeasureIndices(drafts, { entries: [savedEntry] }), []);
});
