const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(name, localRequire = require) {
  const source = fs.readFileSync(path.join(__dirname, `../app/${name}`), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", compiled)(mod, mod.exports, localRequire);
  return mod.exports;
}
const helpers = load("notatedHarmony.ts");
const Reading = load("SustainedHarmonyReading.tsx", (id) => id === "./notatedHarmony" ? helpers : require(id)).default;
const slice = {
  slice_id: "s5", measure_index: 1, measure_ids: ["p1:m1", "p3:m1"], start: "2", end: "5/2", local_start: "2", local_end: "5/2",
  status: "recognized", root: "C", quality: "major", bass: "C3", inversion: 0,
  pitch_classes: ["C", "E", "G"], interval_pattern: [0, 4, 7], candidate_roots: ["C"], reason_codes: [],
  notes: [{ event_id: "event:p3:m1:n1", pitch: "G3", onset: "continuing", source_note_ids: ["p3:m1:n1"], event_source_note_ids: ["p3:m1:n1", "p3:m2:n1"], event_start: "0", event_end: "8" }],
};
const harmony = { schema_version: "1", analyzer_version: "3.16.0", legacy_analysis_version: "3.11.0", status: "available", pitch_basis: "written", time_unit: "quarter_note", interval_convention: "[start,end)", support_scope: [], slices: [slice], diagnostics: [] };

test("student sentence uses the new chord, inversion and written bass without old function labels", () => {
  assert.equal(helpers.harmonySliceSentence(slice), "C 大三和弦，原位。该区间包含 C、E、G，最低记谱音是 C3。");
  assert.match(helpers.harmonySliceSentence({ ...slice, inversion: 1, bass: "E3" }), /第一转位/);
  assert.match(helpers.harmonySliceSentence({ ...slice, root: null }), /字段不完整/);
});

test("unknown, silence and unavailable input never borrow a recognized label", () => {
  assert.doesNotMatch(helpers.harmonySliceSentence({ ...slice, status: "unknown", reason_codes: ["unsupported_pitch_set"] }), /C 大三和弦/);
  assert.match(helpers.harmonySliceSentence({ ...slice, status: "silent" }), /记谱静默/);
  assert.match(helpers.harmonySummary(null), /未计算/);
  assert.match(helpers.harmonySummary({ ...harmony, status: "unavailable", diagnostics: [{ code: "timeline_not_complete", message: "incomplete" }] }), /不完整/);
});

test("unknown reader uses gentle copy while preserving raw reasons in closed evidence only", () => {
  for (const reason of ["unsupported_pitch_set", "ambiguous_root_candidates", "insufficient_distinct_pitches"]) {
    const data = { ...harmony, slices: [{ ...slice, status: "unknown", root: null, quality: null, inversion: null, reason_codes: [reason] }] };
    const before = JSON.stringify(data);
    const html = renderToStaticMarkup(React.createElement(Reading, { harmony: data, measureIndex: 1, located: true, locationReason: null }));
    const boundary = html.indexOf("<details");
    assert.ok(boundary >= 0);
    assert.ok(html.slice(0, boundary).includes("这里需要结合前后文判断，当前版本暂不能可靠确定和弦。"));
    assert.ok(!html.slice(0, boundary).includes(reason));
    assert.ok(!html.slice(0, boundary).includes(helpers.harmonyReason(reason)));
    assert.ok(html.slice(boundary).includes(`<code>${reason}</code>`));
    assert.ok(html.slice(boundary).includes(helpers.harmonyReason(reason)));
    assert.ok(html.slice(boundary).includes("不使用前后文补推和弦"));
    assert.doesNotMatch(html, /<details[^>]*\sopen(?:[\s=>])/);
    assert.equal(JSON.stringify(data), before);
  }
});

test("written index isolates repeated display numbers and mapping failure hides conclusions", () => {
  const data = { ...harmony, slices: [{ ...slice, measure_index: 2 }, { ...slice, slice_id: "other", measure_index: 3, root: "G" }] };
  const html = renderToStaticMarkup(React.createElement(Reading, { harmony: data, measureIndex: 2, located: true, locationReason: null }));
  assert.ok(html.includes("C 大三和弦"));
  assert.ok(!html.includes("G 大三和弦"));
  const blocked = renderToStaticMarkup(React.createElement(Reading, { harmony: data, measureIndex: 2, located: false, locationReason: "图形身份不匹配" }));
  assert.ok(blocked.includes("图形身份不匹配"));
  assert.ok(!blocked.includes("C 大三和弦"));
});

test("evidence keeps continuing pitch, exact offsets and complete tie source chain in a closed disclosure", () => {
  const html = renderToStaticMarkup(React.createElement(Reading, { harmony, measureIndex: 1, located: true, locationReason: null }));
  for (const text of ["[2,5/2)", "此前延续", "G3", "p3:m1:n1", "p3:m2:n1", "[0,8)"]) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:[\s=>])/);
  assert.ok(!html.includes("第 3 拍"));
});

test("report states versions and sources without inheriting accidental Roman or human review data", () => {
  const poisoned = { ...harmony, slices: [{ ...slice, roman_numeral: "V7", expert_review: "correct" }] };
  const report = helpers.notatedHarmonyReport("score.musicxml", "3.11.0", poisoned, "3.16.0");
  assert.match(report, /持续音和弦模块：3\.16\.0/);
  assert.match(report, /旧起音分析版本：3\.11\.0/);
  assert.match(report, /书面第 1 小节/);
  assert.match(report, /\[2,5\/2\)/);
  assert.match(report, /p3:m1:n1/);
  assert.doesNotMatch(report, /V7|expert_review|correct/);
});

test("empty and old responses are explicit, and unavailable timelines never render hidden slice data", () => {
  const old = renderToStaticMarkup(React.createElement(Reading, { measureIndex: 1, located: true, locationReason: null }));
  assert.match(old, /未计算/);
  const unavailable = renderToStaticMarkup(React.createElement(Reading, { harmony: { ...harmony, status: "unavailable", diagnostics: [{ code: "source_identity_incomplete", message: "missing" }] }, measureIndex: 1, located: true, locationReason: null }));
  assert.match(unavailable, /来源身份不完整/);
  assert.ok(!unavailable.includes("C 大三和弦"));
  const empty = renderToStaticMarkup(React.createElement(Reading, { harmony: { ...harmony, slices: [] }, measureIndex: 1, located: true, locationReason: null }));
  assert.match(empty, /没有持续音分析区间/);
});

test("v2 partial reader separates recognized unknown and skipped without inventing silence", () => {
  const data = { ...harmony, schema_version: "2", analyzer_version: "3.17.0", status: "partial",
    excluded_measures: [{ measure_index: 2, measure_ids: ["p1:m2", "p2:m2"], reason_codes: ["grace_measure_isolated"], cause_measure_ids: ["p1:m2"] }],
    slices: [slice, { ...slice, slice_id: "skip", measure_index: 2, status: "skipped", root: null, quality: null, bass: null, inversion: null, reason_codes: ["grace_measure_isolated"] },
      { ...slice, slice_id: "unk", measure_index: 3, status: "unknown", root: null, reason_codes: ["unsupported_pitch_set"] },
      { ...slice, slice_id: "rest", measure_index: 4, status: "silent", notes: [] }],
  };
  const summary = helpers.harmonySummary(data);
  assert.match(summary, /已分析 3 片、跳过 1 片/);
  assert.match(summary, /1 片已识别、1 片识别未知、1 片记谱静默/);
  const before = JSON.stringify(data);
  const html = (index) => renderToStaticMarkup(React.createElement(Reading, { harmony: data, measureIndex: index, located: true, locationReason: null }));
  assert.match(html(1), /C 大三和弦/);
  assert.match(html(2), /输入受影响，本区间未计算/);
  assert.match(html(2), /装饰音/);
  assert.doesNotMatch(html(2), /C 大三和弦|此区间为记谱静默|这里需要结合前后文判断/);
  assert.match(html(2), /p1:m2/);
  assert.match(html(3), /这里需要结合前后文判断/);
  assert.match(html(4), /此区间为记谱静默/);
  const report = helpers.notatedHarmonyReport("k80.musicxml", "3.11.0", data, "3.17.0");
  assert.match(report, /已分析 3 片、跳过 1 片/);
  assert.match(report, /书面第 2 小节/);
  assert.match(report, /输入受影响，本区间未计算/);
  assert.match(report, /全部 part：p1:m2, p2:m2/);
  assert.match(report, /原始受影响位置：p1:m2/);
  assert.equal(JSON.stringify(data), before);
});

test("v2 isolation dependency is a short input warning, not a harmony verdict", () => {
  const skipped = { ...slice, status: "skipped", reason_codes: ["tied_dependency_isolated"] };
  assert.match(helpers.harmonySliceSentence(skipped), /跨小节延音依赖/);
  assert.doesNotMatch(helpers.harmonySliceSentence(skipped), /C 大三和弦|原位|静默/);
  const blocked = renderToStaticMarkup(React.createElement(Reading, { harmony: { ...harmony, schema_version: "2", status: "partial" }, measureIndex: 1, located: false, locationReason: "来源不可靠" }));
  assert.match(blocked, /来源不可靠/);
  assert.doesNotMatch(blocked, /C 大三和弦/);
});

test("v1 report remains usable and unsupported future versions do not borrow slice conclusions", () => {
  assert.match(helpers.notatedHarmonyReport("old.xml", "3.11.0", harmony, null), /C 大三和弦/);
  const future = { ...harmony, schema_version: "99" };
  const html = renderToStaticMarkup(React.createElement(Reading, { harmony: future, measureIndex: 1, located: true, locationReason: null }));
  assert.match(html, /格式版本暂不受支持/);
  assert.doesNotMatch(html, /C 大三和弦/);
});
