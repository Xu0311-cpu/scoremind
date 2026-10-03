const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/comparisonRules.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", compiled)(mod, mod.exports);
const { buildHarmonicComparison, canMountHarmonicComparison } = mod.exports;

const sha = "d954c063542c39b11ac271495c33d5a65ffd5b1c835b6cae81f0d1a0094531c5";
const chord = { beat: 1, root: "C", quality: "major", pitches: ["C4", "E4", "G4"], roman_numeral: "I", harmonic_function: "tonic" };
const event = { offset_qn: "0", label: "C major", root: "C", quality: "major", roman_numeral: null, key_context: null,
  harmonic_function: null, evidence: "原谱 C4 E4 G4" };
const entry = { measure_index: 1, assessment: "determined", basis: "score_only_attested", events: [event], rationale: "只判断已录位置", unclear_reason: null };

function input() {
  return {
    revealed: true, currentSha: sha, analysisSha: sha, selectedIndex: 1,
    structure: { measure_numbers: ["0", "1", "1"], measure_durations_qn: ["1", "4", "4"] },
    annotations: { file_sha256: sha, measure_count: 3, pitch_basis: "written", entries: [entry] },
    measures: [1, 2, 3].map((measure_index) => ({ measure_index, detected_chords: [chord] })),
    timeline: {
      status: "complete", pitch_basis: "written",
      measures: [1, 2, 3].flatMap((index) => [1, 2].map((part_index) => ({
        measure_id: `p${part_index}:m${index}`, part_index, measure_index: index,
        measure_number: index === 1 ? "0" : "1", start: String(index - 1), end: String(index),
      }))),
      source_notes: [{ note_id: "p1:m1:n1", measure_id: "p1:m1", pitch: "C4", start: "0", duration: "1" }],
      slices: [{ measure_ids: ["p1:m1", "p2:m1"] }], diagnostics: [],
    },
  };
}

test("blind state never mounts comparison, even with stale analysis data", () => {
  assert.equal(canMountHarmonicComparison(false, true, sha, sha), false);
  assert.equal(canMountHarmonicComparison(true, false, sha, sha), false);
  assert.equal(canMountHarmonicComparison(true, true, sha, null), false);
  assert.equal(canMountHarmonicComparison(true, true, sha, "other"), false);
  assert.equal(canMountHarmonicComparison(true, true, sha, sha), true);
  const result = buildHarmonicComparison({ ...input(), revealed: false });
  assert.equal(result.kind, "unavailable");
});

test("same-file single onset offers only manual position review, not a verdict", () => {
  const result = buildHarmonicComparison(input());
  assert.equal(result.kind, "visible");
  assert.equal(result.directlyComparable, true);
  assert.deepEqual(result.sourceIds, ["p1:m1:n1"]);
  assert.equal(result.sliceCount, 1);
});

test("repeated printed measure numbers stay keyed by written index", () => {
  const second = { ...entry, measure_index: 2, events: [{ ...event, label: "人工第二书面小节" }] };
  const third = { ...entry, measure_index: 3, events: [{ ...event, label: "人工第三书面小节" }] };
  const data = input();
  data.annotations.entries = [second, third];
  assert.equal(buildHarmonicComparison({ ...data, selectedIndex: 2 }).entry.events[0].label, "人工第二书面小节");
  assert.equal(buildHarmonicComparison({ ...data, selectedIndex: 3 }).entry.events[0].label, "人工第三书面小节");
});

test("file switch, absent hash and unverified measure grid refuse side-by-side data", () => {
  const data = input();
  assert.equal(buildHarmonicComparison({ ...data, currentSha: "other" }).kind, "unavailable");
  assert.equal(buildHarmonicComparison({ ...data, analysisSha: null }).kind, "unavailable");
  assert.equal(buildHarmonicComparison({ ...data, structure: null }).kind, "unavailable");
  assert.equal(buildHarmonicComparison({ ...data, measures: data.measures.map((m) => ({ ...m, measure_index: null })) }).kind, "unavailable");
  const broken = { ...data.timeline, measures: data.timeline.measures.filter((m) => !(m.measure_index === 2 && m.part_index === 2)) };
  assert.equal(buildHarmonicComparison({ ...data, timeline: broken }).kind, "unavailable");
});

test("no annotation, unclear, multiple events and multiple machine chords are never auto-aligned", () => {
  const data = input();
  const empty = buildHarmonicComparison({ ...data, selectedIndex: 2 });
  assert.equal(empty.kind, "visible");
  assert.equal(empty.directlyComparable, false);
  assert.match(empty.reasons.join(" "), /尚无独立人工标注/);
  const unclear = { ...entry, assessment: "unclear", events: [], unclear_reason: "无把握" };
  assert.match(buildHarmonicComparison({ ...data, annotations: { ...data.annotations, entries: [unclear] } }).reasons.join(" "), /不明确/);
  const multi = { ...entry, events: [event, { ...event, offset_qn: "1", label: "第二事件" }] };
  assert.match(buildHarmonicComparison({ ...data, annotations: { ...data.annotations, entries: [multi] } }).reasons.join(" "), /唯一/);
  assert.match(buildHarmonicComparison({ ...data, measures: [{ ...data.measures[0], detected_chords: [chord, chord] }, ...data.measures.slice(1)] }).reasons.join(" "), /唯一/);
});

test("concert pitch, partial and unsupported timelines, and missing fields remain conservative", () => {
  const data = input();
  assert.match(buildHarmonicComparison({ ...data, annotations: { ...data.annotations, pitch_basis: "concert" } }).reasons.join(" "), /音高基准/);
  assert.match(buildHarmonicComparison({ ...data, timeline: { ...data.timeline, status: "partial" } }).reasons.join(" "), /partial/);
  assert.equal(buildHarmonicComparison({ ...data, timeline: { ...data.timeline, status: "unsupported" } }).kind, "unavailable");
  assert.match(buildHarmonicComparison({ ...data, annotations: { ...data.annotations, entries: [{ ...entry, events: [{ ...event, root: null }] }] } }).reasons.join(" "), /根音/);
  assert.match(buildHarmonicComparison({ ...data, measures: [{ ...data.measures[0], detected_chords: [{ ...chord, quality: "unknown" }] }, ...data.measures.slice(1)] }).reasons.join(" "), /质量/);
  assert.match(buildHarmonicComparison({ ...data, timeline: { ...data.timeline, source_notes: [] } }).reasons.join(" "), /来源缺失/);
  assert.match(buildHarmonicComparison({ ...data, timeline: { ...data.timeline, diagnostics: [{ measure_ids: ["p1:m1"], code: "tie_ambiguous" }] } }).reasons.join(" "), /诊断/);
});
