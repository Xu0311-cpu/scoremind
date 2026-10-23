import { harmonyReason, harmonySliceSentence, harmonySummary, type NotatedHarmony } from "./notatedHarmony";

export default function SustainedHarmonyReading({ harmony, measureIndex, located, locationReason }: {
  harmony?: NotatedHarmony | null;
  measureIndex: number | null;
  located: boolean;
  locationReason: string | null;
}) {
  if (!harmony || harmony.schema_version !== "1" || harmony.status !== "available") {
    return <p className="timeline-caution">{harmonySummary(harmony)}</p>;
  }
  if (!located || measureIndex === null) return <p className="timeline-caution">{locationReason || "当前书面小节尚未可靠定位，暂不关联结论。"}</p>;
  const slices = harmony.slices.filter((s) => s.measure_index === measureIndex);
  if (!slices.length) return <p>本书面小节没有持续音分析区间。</p>;
  return <div className="sustained-harmony-reading">
    <p className="reading-measure-label">记谱持续音和弦 · 四分音符偏移 · 模块 {harmony.analyzer_version}</p>
    <ol className="reading-events">
      {slices.map((s) => <li key={s.slice_id} className={`harmony-interval ${s.status}`}>
        <strong>偏移 [{s.local_start},{s.local_end})</strong>
        <p>{harmonySliceSentence(s)}</p>
        {s.notes.length > 0 && <span>此前延续：{s.notes.filter((n) => n.onset === "continuing").map((n) => n.pitch).join("、") || "无"}</span>}
        <details className="secondary-details">
          <summary>查看此区间依据</summary>
          <p>全曲区间 [{s.start},{s.end})；{s.status === "recognized" ? `根音间隔模式 [${s.interval_pattern.join(", ")}]` : s.reason_codes.map(harmonyReason).join("；")}</p>
          <ul className="harmony-source-list">{s.notes.map((n) => <li key={n.event_id}>
            <strong>{n.pitch} · {n.onset === "continuing" ? "此前延续" : "此刻新起音"}</strong>
            <span>当前来源：{n.source_note_ids.join(", ")}</span>
            <span>{n.event_id} · 持续 [{n.event_start},{n.event_end})</span>
            <span>完整来源链：{n.event_source_note_ids.join(" → ")}</span>
          </li>)}</ul>
        </details>
      </li>)}
    </ol>
  </div>;
}
