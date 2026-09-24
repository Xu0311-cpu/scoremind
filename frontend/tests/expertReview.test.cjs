const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/reviewRecords.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { MAX_REVIEW_BYTES, createReviewPackage, deleteReviewRecord, parseReviewPackage, readReviewDraft, reviewScopeFromTimeline, reviewStorageKey, serializeReviewPackage, submitReviewRecord, upsertReviewRecord, writeReviewDraft } = mod.exports;

const sha = "a".repeat(64);
const otherSha = "b".repeat(64);
const timeline = {
  status: "complete",
  measures: [
    { measure_id: "p1:m1", measure_index: 1, measure_number: "1" },
    { measure_id: "p1:m2", measure_index: 2, measure_number: "1" },
  ],
  source_notes: [{ measure_id: "p1:m1", note_id: "p1:m1:n1" }, { measure_id: "p1:m2", note_id: "p1:m2:n1" }],
};
const scope = reviewScopeFromTimeline(sha, "3.9.0", timeline);
const at = "2026-01-01T00:00:00.000Z";
const record = {
  id: "review-1", measure_index: 1, source_note_id: "p1:m1:n1", status: "needs_review",
  category: "pitch", suggested_result: "C4", rationale: "谱面与来源需核对。", created_at: at, updated_at: at,
};

function fakeStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test("add, edit and delete records without changing machine analysis", () => {
  const analysis = { detected_chords: [{ root: "C" }] };
  const added = upsertReviewRecord(scope, [], record);
  assert.equal(added.length, 1);
  const edited = upsertReviewRecord(scope, added, { ...record, status: "wrong", rationale: "修订后依据" });
  assert.equal(edited.length, 1);
  assert.equal(edited[0].status, "wrong");
  assert.deepEqual(deleteReviewRecord(scope, edited, record.id), []);
  assert.equal(analysis.detected_chords[0].root, "C");
});

test("draft reload is isolated by exact file fingerprint and analysis version", () => {
  const storage = fakeStorage();
  writeReviewDraft(storage, scope, [record]);
  assert.deepEqual(readReviewDraft(storage, scope), [record]);
  const otherScope = reviewScopeFromTimeline(otherSha, "3.9.0", timeline);
  assert.deepEqual(readReviewDraft(storage, otherScope), []);
  assert.notEqual(reviewStorageKey(scope), reviewStorageKey(otherScope));
  assert.deepEqual(readReviewDraft(storage, reviewScopeFromTimeline(sha, "4.0.0", timeline)), []);
});

test("wrong score, version, source ID and measure are refused before import", () => {
  const valid = createReviewPackage(scope, [record]);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, file_sha256: otherSha }), scope), /指纹/);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, analysis_version: "3.8.0" }), scope), /版本/);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, records: [{ ...record, measure_index: 2 }] }), scope), /无效/);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, records: [{ ...record, source_note_id: "missing" }] }), scope), /无效/);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, records: [{ ...record, measure_index: 3, source_note_id: null }] }), scope), /无效/);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, records: [record, record] }), scope), /无效/);
});

test("old or unsupported analysis has no review scope", () => {
  assert.equal(reviewScopeFromTimeline(sha, "3.9.0", undefined), null);
  assert.equal(reviewScopeFromTimeline(sha, "3.9.0", { ...timeline, status: "unsupported" }), null);
  assert.equal(reviewScopeFromTimeline("", "3.9.0", timeline), null);
  assert.equal(reviewScopeFromTimeline(sha, "3.9.0", { ...timeline, source_notes: [timeline.source_notes[0], timeline.source_notes[0]] }), null);
});

test("malformed and unexpected JSON is rejected; long text and markup stay plain data", () => {
  assert.throws(() => parseReviewPackage("{bad", scope), /JSON/);
  const valid = createReviewPackage(scope, [record]);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, extra: true }), scope), /格式/);
  assert.throws(() => parseReviewPackage(JSON.stringify({ ...valid, records: [{ ...record, rationale: "x".repeat(2001) }] }), scope), /无效/);
  const markup = "<img src=x onerror=alert(1)>";
  assert.equal(parseReviewPackage(JSON.stringify({ ...valid, records: [{ ...record, rationale: markup }] }), scope).records[0].rationale, markup);
});

test("blocked or corrupt browser storage never becomes valid review data", () => {
  const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); } };
  assert.throws(() => readReviewDraft(blocked, scope), /SecurityError/);
  assert.throws(() => writeReviewDraft(blocked, scope, [record]), /QuotaExceededError/);
  const storage = fakeStorage();
  storage.setItem(reviewStorageKey(scope), "not json");
  assert.throws(() => readReviewDraft(storage, scope), /JSON/);
});

test("saved review JSON always round-trips through export, reload and import under the shared byte limit", () => {
  const records = Array.from({ length: 400 }, (_, index) => ({ ...record, id: `review-${index}`, rationale: "字".repeat(500) }));
  const exported = serializeReviewPackage(scope, records);
  assert.ok(Buffer.byteLength(exported, "utf8") <= MAX_REVIEW_BYTES);
  const storage = fakeStorage();
  writeReviewDraft(storage, scope, records);
  assert.equal(storage.getItem(reviewStorageKey(scope)), exported);
  assert.deepEqual(readReviewDraft(storage, scope), records);
  assert.deepEqual(parseReviewPackage(exported, scope).records, records);
});

test("oversize records cannot enter memory, overwrite a draft or produce an unimportable export", () => {
  const storage = fakeStorage();
  writeReviewDraft(storage, scope, [record]);
  const before = storage.getItem(reviewStorageKey(scope));
  const oversized = Array.from({ length: 500 }, (_, index) => ({ ...record, id: `review-${index}`, rationale: "x".repeat(2000) }));
  assert.ok(Buffer.byteLength(JSON.stringify({ ...createReviewPackage(scope, []), records: oversized }), "utf8") > MAX_REVIEW_BYTES);
  assert.throws(() => createReviewPackage(scope, oversized), /1 MB/);
  assert.throws(() => serializeReviewPackage(scope, oversized), /1 MB/);
  assert.throws(() => writeReviewDraft(storage, scope, oversized), /1 MB/);
  assert.throws(() => upsertReviewRecord(scope, oversized.slice(0, -1), oversized.at(-1)), /1 MB/);
  assert.equal(storage.getItem(reviewStorageKey(scope)), before);
  assert.deepEqual(readReviewDraft(storage, scope), [record]);
});

test("a rejected save leaves the form draft intact and never invokes reset", () => {
  const draft = { ...record, rationale: "   " };
  let resetCalls = 0;
  let records = [record];
  const accepted = submitReviewRecord(draft, (candidate) => {
    try { records = upsertReviewRecord(scope, records, candidate); return true; }
    catch { return false; }
  }, () => { resetCalls += 1; });
  assert.equal(accepted, false);
  assert.equal(resetCalls, 0);
  assert.equal(draft.rationale, "   ");
  assert.deepEqual(records, [record]);
  assert.equal(submitReviewRecord({ ...record, rationale: "已核实" }, () => true, () => { resetCalls += 1; }), true);
  assert.equal(resetCalls, 1);
});
