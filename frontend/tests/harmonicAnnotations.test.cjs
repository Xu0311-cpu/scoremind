const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/harmonicAnnotations.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { MAX_HARMONY_BYTES, createHarmonyPackage, harmonyStorageKey, parseHarmonyPackage, readHarmonyDraft,
  revealStorageKey, saveHarmonyEntry, saveHarmonyEntryWithStorage, updateHarmonyPackage, validateHarmonyPackage, writeHarmonyDraft } = mod.exports;

const sha = "d954c063542c39b11ac271495c33d5a65ffd5b1c835b6cae81f0d1a0094531c5";
const scope = { file_sha256: sha, measure_durations_qn: ["4", "4", "4", "4"] };
const at = "2026-10-03T00:00:00.000Z";
const event = { offset_qn: "0", label: "C major triad", root: "C", quality: "major",
  roman_numeral: null, key_context: null, harmonic_function: null, evidence: "原谱 C4 E4 G4" };
const entry = { id: "entry-1", measure_index: 1, basis: "score_only_attested", assessment: "determined",
  events: [event], unclear_reason: null, rationale: "仅确认已经记录的位置，不声明整小节穷尽。",
  created_at: at, updated_at: at };
const blank = createHarmonyPackage(scope, "契约示例", "set-one");
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("independent contract round-trips without machine analysis version", () => {
  const saved = saveHarmonyEntry(scope, blank, entry);
  const loaded = parseHarmonyPackage(JSON.stringify(saved), scope);
  assert.deepEqual(loaded, saved);
  const local = storage();
  writeHarmonyDraft(local, scope, saved);
  assert.deepEqual(readHarmonyDraft(local, scope), saved);
  assert.notEqual(harmonyStorageKey(sha), revealStorageKey(sha));
  assert.equal(readHarmonyDraft(local, { ...scope, file_sha256: "b".repeat(64) }), null);
  assert.ok(!Object.hasOwn(saved, "analysis_version"));
});

test("design sample A is a valid importable contract example, not a gold standard", () => {
  const sample = fs.readFileSync(path.join(__dirname, "fixtures/independent_harmony_simple.json"), "utf8");
  const parsed = parseHarmonyPackage(sample, scope);
  assert.equal(parsed.entries[0].events[0].offset_qn, "0");
  assert.equal(parsed.entries[0].basis, "score_only_attested");
  assert.equal(parsed.entries.length, 1);
});

test("determined is non-exhaustive: missing second event remains unannotated", () => {
  const twoPositions = { file_sha256: sha, measure_durations_qn: ["4"] };
  const oneEvent = saveHarmonyEntry(twoPositions, createHarmonyPackage(twoPositions, "人", "set-two"), entry);
  assert.equal(oneEvent.entries[0].events.length, 1);
  assert.equal(oneEvent.entries[0].assessment, "determined");
});

test("repeated printed measure numbers stay separate by written index", () => {
  const pickup = { file_sha256: sha, measure_durations_qn: ["1", "3", "2"] };
  let value = createHarmonyPackage(pickup, "人", "set-three");
  value = saveHarmonyEntry(pickup, value, { ...entry, measure_index: 2, events: [{ ...event, offset_qn: "1" }] });
  value = saveHarmonyEntry(pickup, value, { ...entry, id: "entry-3", measure_index: 3, assessment: "unclear", events: [], unclear_reason: "无法判断" });
  assert.deepEqual(value.entries.map((item) => item.measure_index), [2, 3]);
  assert.throws(() => saveHarmonyEntry(pickup, value, { ...entry, id: "other", measure_index: 2 }), /不能静默覆盖/);
});

test("reject wrong score, old review format, unknown keys and invalid state", () => {
  const saved = saveHarmonyEntry(scope, blank, entry);
  assert.throws(() => parseHarmonyPackage(JSON.stringify(saved), { ...scope, file_sha256: "b".repeat(64) }), /指纹/);
  assert.throws(() => parseHarmonyPackage(JSON.stringify({ ...saved, format: "scoremind-expert-review" }), scope), /格式/);
  assert.throws(() => validateHarmonyPackage({ ...saved, analysis_version: "3.10" }, scope), /格式/);
  assert.throws(() => validateHarmonyPackage({ ...saved, measure_count: 5 }, scope), /小节数量/);
  assert.throws(() => validateHarmonyPackage({ ...saved, entries: [{ ...entry, assessment: "unclear" }] }, scope), /状态/);
  assert.throws(() => validateHarmonyPackage({ ...saved, entries: [entry, { ...entry, id: "next" }] }, scope), /条目/);
  assert.throws(() => validateHarmonyPackage({ ...saved, entries: [{ ...entry, id: "entry-2", measure_index: 5 }] }, scope), /条目/);
});

test("reject noncanonical or out-of-measure offsets and unsupported fields", () => {
  const put = (overrides) => validateHarmonyPackage({ ...blank, entries: [{ ...entry, events: [{ ...event, ...overrides }] }] }, scope);
  for (const offset_qn of ["2/4", "0/1", "1/1", "-1", "0.5", "4", "1/0", "01", "4/3/2"]) {
    assert.throws(() => put({ offset_qn }), undefined, offset_qn);
  }
  assert.throws(() => put({ roman_numeral: "I" }), /事件字段/);
  assert.throws(() => put({ root: "H" }), /事件字段/);
  assert.throws(() => put({ extra: true }), /事件字段/);
  const withTwo = [{ ...event }, { ...event, offset_qn: "0" }];
  assert.throws(() => validateHarmonyPackage({ ...blank, entries: [{ ...entry, events: withTwo }] }, scope), /拍点/);
  assert.equal(put({ offset_qn: "2/3" }).entries[0].events[0].offset_qn, "2/3");
});

test("UTF-8 byte cap applies equally to edit, export, import and storage", () => {
  const local = storage();
  const saved = saveHarmonyEntry(scope, blank, entry);
  writeHarmonyDraft(local, scope, saved);
  const previous = local.getItem(harmonyStorageKey(sha));
  const entries = Array.from({ length: 500 }, (_, index) => ({ ...entry, id: `id-${index}`, measure_index: index + 1,
    rationale: "字".repeat(2000) }));
  const largeScope = { file_sha256: sha, measure_durations_qn: Array(500).fill("4") };
  const largeBlank = createHarmonyPackage(largeScope, "人", "large-set");
  const candidate = { ...largeBlank, entries };
  assert.ok(Buffer.byteLength(JSON.stringify(candidate), "utf8") > MAX_HARMONY_BYTES);
  assert.throws(() => validateHarmonyPackage(candidate, largeScope), /1 MiB/);
  assert.throws(() => parseHarmonyPackage(JSON.stringify(candidate), largeScope), /1 MiB/);
  assert.equal(local.getItem(harmonyStorageKey(sha)), previous);
  assert.deepEqual(readHarmonyDraft(local, scope), saved);
});

test("storage failure does not turn package into a blind claim", () => {
  const blocked = { getItem() { throw Error("SecurityError"); }, setItem() { throw Error("QuotaExceededError"); } };
  assert.throws(() => readHarmonyDraft(blocked, scope), /SecurityError/);
  assert.throws(() => writeHarmonyDraft(blocked, scope, blank), /QuotaExceededError/);
  assert.equal(updateHarmonyPackage(scope, blank, { pitch_basis: "concert" }).pitch_basis, "concert");
  const session = saveHarmonyEntryWithStorage(scope, blank, entry, blocked);
  assert.equal(session.stored, false);
  assert.equal(session.value.entries[0].basis, "machine_visible");
  assert.equal(saveHarmonyEntryWithStorage(scope, blank, entry, null).value.entries[0].basis, "machine_visible");
  const local = storage();
  const persisted = saveHarmonyEntryWithStorage(scope, blank, entry, local);
  assert.equal(persisted.stored, true);
  assert.equal(readHarmonyDraft(local, scope).entries[0].basis, "score_only_attested");
});
