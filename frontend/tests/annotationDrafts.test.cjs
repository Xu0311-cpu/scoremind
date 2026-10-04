const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/annotationDrafts.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { clearMeasureDraft, draftForMeasure, updateMeasureDraft } = mod.exports;

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
