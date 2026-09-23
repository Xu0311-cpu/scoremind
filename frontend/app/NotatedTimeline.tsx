"use client";

import WrittenMeasureNavigator from "./WrittenMeasureNavigator";
import { writtenMeasureOptions } from "./scoreMeasureNavigation";

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
    written_pitch_observation?: {
      active_notes: {
        event_id: string;
        pitch: string;
        source_note_ids: string[];
        onset: "new" | "continuing";
      }[];
      new_onset_event_ids: string[];
      continuing_event_ids: string[];
      lowest_written_pitch: string | null;
      lowest_event_ids: string[];
      comparison_status: "available" | "unavailable";
      reasons: string[];
    } | null;
  }[];
  diagnostics: {
    code: string;
    message: string;
    measure_ids: string[];
    source_note_ids: string[];
  }[];
};

export default function NotatedTimeline({ timeline, selectedMeasureIndex, onSelectMeasureIndex }: {
  timeline?: NotatedTimelineData | null;
  selectedMeasureIndex: number | null;
  onSelectMeasureIndex: (index: number) => void;
}) {
  const measures = timeline?.measures.filter((measure) => measure.measure_index === selectedMeasureIndex) ?? [];
  const measureIds = new Set(measures.map((measure) => measure.measure_id));
  const slices = timeline?.slices.filter((slice) => slice.measure_ids.some((id) => measureIds.has(id))) ?? [];
  const events = new Map(timeline?.sustained_events.map((e) => [e.event_id, e]));
  const sources = new Map(timeline?.source_notes.map((n) => [n.note_id, n]));
  const diagnostics = timeline?.diagnostics.filter((diagnostic) => !measures.length || diagnostic.measure_ids.length === 0 || diagnostic.measure_ids.some((id) => measureIds.has(id))) ?? [];

  return (
    <section className="notated-timeline" aria-labelledby="timeline-title">
      <h3 id="timeline-title">持续音时间轴</h3>
      <p className="panel-note">按记谱时值观察持续音、新起音和此前延续音。这里展示的是记谱音集合，不是检测到的和弦；同起点和弦结果仍来自独立的旧分析。</p>
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
          {measures.length ? (
            <>
              <WrittenMeasureNavigator options={writtenMeasureOptions(timeline)} selected={selectedMeasureIndex} onSelect={onSelectMeasureIndex} label="技术证据书面小节导航" />
              <p className="panel-note">全曲区间 [{measures[0].start}, {measures[0].end}) · {measures.map((measure) => `乐器 ${measure.part_id ?? `#${measure.part_index}`}：${measure.measure_id}`).join("；")}。时间片汇总该时段所有乐器的音，标号仅供阅读，不用于谱面定位。</p>
              {slices.length ? (
                <div className="timeline-table-wrap">
                  <table className="timeline-table">
                    <thead><tr><th>全曲区间</th><th>记谱音观察与来源（非和弦判断）</th></tr></thead>
                    <tbody>
                      {slices.map((slice) => (
                        <tr key={`${slice.start}-${slice.end}`}>
                          <td>[{slice.start}, {slice.end})</td>
                          <td>
                            {slice.written_pitch_observation ? (
                              <>
                                <p className="timeline-observation-summary">
                                  新起音 {slice.written_pitch_observation.new_onset_event_ids.length} · 此前延续音 {slice.written_pitch_observation.continuing_event_ids.length}
                                  {slice.written_pitch_observation.comparison_status === "available"
                                    ? ` · 最低记谱音 ${slice.written_pitch_observation.lowest_written_pitch}`
                                    : " · 最低音不作比较"}
                                </p>
                                {slice.written_pitch_observation.reasons.length > 0 && (
                                  <p className="timeline-caution">比较受限：{slice.written_pitch_observation.reasons.join("、")}。请核对诊断及原谱。</p>
                                )}
                                {slice.written_pitch_observation.active_notes.length ? (
                                  <ul className="timeline-sources">
                                    {slice.written_pitch_observation.active_notes.map((note) => {
                                      const event = events.get(note.event_id);
                                      return (
                                        <li key={note.event_id}>
                                          <strong>{note.pitch}</strong> · {note.onset === "new" ? "此刻新起音" : "此前延续音"} · 事件 {note.event_id}
                                          {event ? ` · 持续事件 [${event.start}, ${event.end})` : " · 持续事件来源缺失"}
                                          <p className="timeline-current-source">当前时间片来源：{note.source_note_ids.join(", ") || "缺失"}</p>
                                          {note.source_note_ids.map((sid) => <SourceDetails key={sid} source={sources.get(sid)} id={sid} />)}
                                          {event && event.source_note_ids.length > 1 && (
                                            <details className="timeline-chain">
                                              <summary>完整延音链：{event.source_note_ids.join(" → ")}</summary>
                                              {event.source_note_ids.map((sid) => <SourceDetails key={sid} source={sources.get(sid)} id={sid} />)}
                                            </details>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : <p>无已支持的持续音；如有诊断，不能据此断言原谱完全静默。</p>}
                              </>
                            ) : slice.is_silent ? "此响应未计算记谱音观察；无已支持的持续音。" : (
                              <ul className="timeline-sources">
                                <li>此响应未计算记谱音观察（旧版本）；下列仅为原有持续事件。</li>
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
                {timeline.source_notes.filter((note) => measureIds.has(note.measure_id)).length ? (
                  timeline.source_notes.filter((note) => measureIds.has(note.measure_id)).map((note) => <SourceDetails key={note.note_id} source={note} id={note.note_id} />)
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
