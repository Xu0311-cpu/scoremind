"use client";

import type { ComparisonResult } from "./comparisonRules";

export default function HarmonicComparison({ result, reviewAvailable, onOpenReview }: {
  result: ComparisonResult;
  reviewAvailable: boolean;
  onOpenReview: (index: number) => void;
}) {
  return (
    <section className="panel harmony-comparison" aria-labelledby="harmony-comparison-title">
      <h2 id="harmony-comparison-title">人工与机器和声对照</h2>
      <p className="panel-note">仅供人工核对。独立标注、机器分析和人工意见分别保存；这里不判对错，也不计算准确率。</p>
      {result.kind === "unavailable" ? <p role="status" className="timeline-caution">不可直接比较（不可定位）：{result.reason}</p> : (
        <>
          <div className="panel-header">
            <h3>书面第 {result.index} 小节</h3>
            <button type="button" className="secondary-button" disabled={!reviewAvailable} onClick={() => onOpenReview(result.index)}>
              前往人工意见
            </button>
          </div>
          <p role="status" className={result.directlyComparable ? "panel-note" : "timeline-caution"}>
            {result.directlyComparable
              ? "位置可供人工核对；字段是否一致仍由校审者判断。"
              : `不可直接比较：${result.reasons.join("；")}。`}
          </p>
          <div className="harmony-comparison-grid">
            <div className="harmony-comparison-column">
              <h4>独立人工标注</h4>
              {result.entry ? <>
                <p>判断范围：{result.entry.assessment} · 填写时状态：{result.entry.basis}</p>
                {result.entry.unclear_reason && <p>不明确原因：{result.entry.unclear_reason}</p>}
                <p>小节依据：{result.entry.rationale}</p>
                {result.entry.events.map((event) => <p key={event.offset_qn}>
                  拍点 {event.offset_qn} · {event.label} · 根音 {event.root ?? "未填"} · 质量 {event.quality ?? "未填"}
                  · 罗马数字 {event.roman_numeral ?? "未填"} · 功能 {event.harmonic_function ?? "未填"}<br />
                  原谱依据：{event.evidence}
                </p>)}
              </> : <p>该书面小节尚无独立人工判断；不能据此认为机器结果正确。</p>}
            </div>
            <div className="harmony-comparison-column">
              <h4>机器同起点和弦</h4>
              {result.machine.detected_chords.length ? result.machine.detected_chords.map((chord, index) => <p key={`${index}-${chord.beat}`}>
                拍点 {chord.beat ?? "未知"} · {chord.root ?? "根音未知"} {chord.quality} · 音高 {chord.pitches.join("、") || "未提供"}
                · 罗马数字 {chord.roman_numeral ?? "未给出"} · 功能 {chord.harmonic_function}
              </p>) : <p>该小节没有机器检测到的同起点和弦；这不是漏报判定。</p>}
            </div>
            <div className="harmony-comparison-column">
              <h4>记谱时间轴证据</h4>
              <p>状态：{result.timeline.status} · 时间片 {result.sliceCount} · 记谱来源 {result.sourceIds.length}。持续音集合不是和弦判断。</p>
              {result.sourceIds.length > 0 && <details>
                <summary>查看本小节来源 ID 与记谱音</summary>
                <ul>{result.timeline.source_notes.filter((note) => result.sourceIds.includes(note.note_id)).map((note) =>
                  <li key={note.note_id}><code>{note.note_id}</code> · {note.pitch} · 全曲起点 {note.start} · 时值 {note.duration}</li>)}</ul>
              </details>}
              {result.timeline.diagnostics.length > 0 && <p className="timeline-caution">时间轴诊断请在技术证据中逐条核对。</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
