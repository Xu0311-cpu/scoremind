"use client";

import { useState } from "react";

type SourceNote = {
  note_id: string;
  measure_id: string;
  part_id: string | null;
  staff: string | null;
  voice: string | null;
  instrument_id: string | null;
  instrument_name: string | null;
  pitch: string;
  local_start: string;
  start: string;
  duration: string;
  tie: ("start" | "continue" | "stop")[];
  notation_tie: ("start" | "continue" | "stop")[];
};

export type NotatedTimelineData = {
  status: "complete" | "partial" | "unsupported";
  time_unit: "quarter_note";
  pitch_basis: "written";
  measures: {
    measure_id: string;
    part_index: number;
    part_id: string | null;
    measure_index: number;
    measure_number: string;
    start: string;
    end: string;
  }[];
  source_notes: SourceNote[];
  sustained_events: {
    event_id: string;
    pitch: string;
    start: string;
    end: string;
    source_note_ids: string[];
  }[];
  slices: {
    start: string;
    end: string;
    measure_ids: string[];
    active_event_ids: string[];
    source_note_ids: string[];
    is_silent: boolean;
  }[];
  diagnostics: {
    code: string;
    message: string;
    measure_ids: string[];
    source_note_ids: string[];
  }[];
};

export default function NotatedTimeline({ timeline }: { timeline?: NotatedTimelineData | null }) {
  const [selection, setSelection] = useState("");
  const measure = timeline?.measures.find((m) => m.measure_id === selection) ?? timeline?.measures[0];
  const slices = timeline?.slices.filter((s) => measure && s.measure_ids.includes(measure.measure_id)) ?? [];
  const events = new Map(timeline?.sustained_events.map((e) => [e.event_id, e]));
  const sources = new Map(timeline?.source_notes.map((n) => [n.note_id, n]));
  const diagnostics = timeline?.diagnostics.filter((d) => !measure || d.measure_ids.length === 0 || d.measure_ids.includes(measure.measure_id)) ?? [];

  return (
    <section className="notated-timeline" aria-labelledby="timeline-title">
      <h3 id="timeline-title">持续音时间轴</h3>
      <p className="panel-note">按记谱时值显示持续的音，使用记谱音高。音集合不是新的和弦结论，旧和声分析尚未使用此时间轴。</p>
      {!timeline ? (
        <p role="status">此响应未计算时间轴（可能来自旧版本）。重新分析后可查看。</p>
      ) : (
        <>
          <p className="panel-note">时间单位：四分音符；分数保持精确值。区间 [起点, 终点) 不包含终点；不展开反复，不模拟踏板或演奏延长。</p>
          {timeline.status !== "complete" && (
            <p className="timeline-caution" role="status">
              {timeline.status === "unsupported" ? "当前结构无法可靠建立时间轴，请查看诊断。" : "存在来源或支持范围诊断。音集合可能不完整，请结合原谱核对。"}
            </p>
          )}
          {measure ? (
            <>
              <label className="timeline-selector">
                查看小节（按书面顺序）
                <select value={measure.measure_id} onChange={(e) => setSelection(e.target.value)}>
                  {timeline.measures.map((m) => (
                    <option key={m.measure_id} value={m.measure_id}>
                      乐器 {m.part_id ?? `#${m.part_index}`} · 第 {m.measure_index} 个小节 · 标号 {m.measure_number || "未提供"}
                    </option>
                  ))}
                </select>
              </label>
              <p className="panel-note">全曲区间 [{measure.start}, {measure.end}) · 时间片包含该时段所有乐器的音，来源中的小节 ID 可供核对。</p>
              {slices.length ? (
                <div className="timeline-table-wrap">
                  <table className="timeline-table">
                    <thead><tr><th>全曲区间</th><th>持续的记谱音与来源</th></tr></thead>
                    <tbody>
                      {slices.map((slice) => (
                        <tr key={`${slice.start}-${slice.end}`}>
                          <td>[{slice.start}, {slice.end})</td>
                          <td>
                            {slice.is_silent ? "无已支持的持续音（静默；有诊断时须核对遗漏）" : (
                              <ul className="timeline-sources">
                                {slice.active_event_ids.map((id) => {
                                  const event = events.get(id);
                                  if (!event) return <li key={id}>来源缺失：{id}</li>;
                                  const activeSources = event.source_note_ids.filter((sid) => slice.source_note_ids.includes(sid));
                                  return (
                                    <li key={id}>
                                      <strong>{event.pitch}</strong> · 持续事件 [{event.start}, {event.end})
                                      {event.source_note_ids.length > 1 && ` · 延音线连接 ${event.source_note_ids.length} 个片段`}
                                      {activeSources.map((sid) => <SourceDetails key={sid} source={sources.get(sid)} id={sid} />)}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p>本小节没有正时值时间片。</p>}
              <details className="timeline-diagnostics">
                <summary>本小节原始音符片段（含零时值音）</summary>
                {timeline.source_notes.filter((n) => n.measure_id === measure.measure_id).length ? (
                  timeline.source_notes.filter((n) => n.measure_id === measure.measure_id).map((n) => <SourceDetails key={n.note_id} source={n} id={n.note_id} />)
                ) : <p>本小节没有已支持的记谱音符片段。</p>}
              </details>
            </>
          ) : timeline.status !== "unsupported" && <p>时间轴已计算，没有可显示的小节或音符事件。</p>}
          {diagnostics.length > 0 && (
            <details className="timeline-diagnostics" open>
              <summary>来源与支持范围诊断（当前小节 {diagnostics.length} 条 / 全曲 {timeline.diagnostics.length} 条）</summary>
              <ul>{diagnostics.map((d, i) => <li key={`${d.code}-${i}`}><code>{d.code}</code>：{d.message}{d.source_note_ids.length > 0 && ` · ${d.source_note_ids.join(", ")}`}</li>)}</ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function SourceDetails({ source, id }: { source?: SourceNote; id: string }) {
  if (!source) return <span>缺失来源 {id}</span>;
  return (
    <details className="timeline-source">
      <summary>{source.pitch} · {id} · 谱表 {source.staff ?? "未知"} / 声部 {source.voice ?? "未知"}</summary>
      <p>乐器 {source.part_id ?? "未提供"} · {source.instrument_name ?? "名称未提供"}（{source.instrument_id ?? "身份未提供"}）</p>
      <p>小节内起点 {source.local_start} · 全曲起点 {source.start} · 时值 {source.duration} · sound tie：{source.tie.join(" + ") || "无"} · notation tie：{source.notation_tie.join(" + ") || "无"}</p>
    </details>
  );
}
