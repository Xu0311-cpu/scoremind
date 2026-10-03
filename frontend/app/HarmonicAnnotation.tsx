"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { HARMONY_FUNCTIONS, HARMONY_QUALITIES, type HarmonyEntry, type HarmonyEvent, type HarmonyPackage } from "./harmonicAnnotations";
import type { VerifiedScoreStructure } from "./scoreStructure";

const emptyEvent = (): HarmonyEvent => ({ offset_qn: "0", label: "", root: null, quality: null,
  roman_numeral: null, key_context: null, harmonic_function: null, evidence: "" });

function EntryEditor({ measureIndex, entry, machineVisible, onSave, onDelete }: {
  measureIndex: number; entry: HarmonyEntry | null; machineVisible: boolean;
  onSave: (entry: HarmonyEntry) => boolean; onDelete: () => void;
}) {
  const [assessment, setAssessment] = useState<HarmonyEntry["assessment"]>(entry?.assessment ?? "unclear");
  const [events, setEvents] = useState<HarmonyEvent[]>(entry?.events ?? []);
  const [unclearReason, setUnclearReason] = useState(entry?.unclear_reason ?? "");
  const [rationale, setRationale] = useState(entry?.rationale ?? "");
  const [deletePending, setDeletePending] = useState(false);

  function updateEvent(index: number, changes: Partial<HarmonyEvent>) {
    setEvents((current) => current.map((value, at) => at === index ? { ...value, ...changes } : value));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const cleaned = events.map((item) => ({ ...item, offset_qn: item.offset_qn.trim(), label: item.label.trim(),
      evidence: item.evidence.trim(), roman_numeral: item.roman_numeral?.trim() || null,
      key_context: item.key_context?.trim() || null }));
    onSave({ id: entry?.id ?? crypto.randomUUID(), measure_index: measureIndex,
      basis: machineVisible ? "machine_visible" : "score_only_attested", assessment,
      events: assessment === "unclear" ? [] : cleaned,
      unclear_reason: assessment === "determined" ? null : unclearReason.trim(),
      rationale: rationale.trim(), created_at: entry?.created_at ?? now, updated_at: now });
  }

  return (
    <div className="harmony-entry-editor">
      <h4>书面第 {measureIndex} 小节 · {entry ? entry.assessment === "unclear" ? "不明确" : "已有人工判断" : "未标注"}</h4>
      {entry && <p className="panel-note">原记录填写基准：{entry.basis}。仅编辑时更新基准；已保存但未修改的记录不追溯改写。</p>}
      <form className="review-form" onSubmit={save}>
        <label>判断范围<select value={assessment} onChange={(e) => setAssessment(e.target.value as HarmonyEntry["assessment"])}>
          <option value="unclear">不明确，无已确定事件</option>
          <option value="partial">部分位置已确定，另有未解决位置</option>
          <option value="determined">仅已录事件明确，不表示小节穷尽</option>
        </select></label>
        <label>当前填写基准<input readOnly value={machineVisible ? "machine_visible / 已见机器结果" : "score_only_attested / 自述仅看原谱"} /></label>
        {assessment !== "unclear" && <div className="review-wide">
          <h4>人工和声事件</h4>
          <p className="panel-note">小节内拍点用四分音符分数记录。事件按拍点严格递增；不会从机器和弦预填。</p>
          {events.map((item, index) => <div className="harmony-event" key={index}>
            <div className="review-form">
              <label>拍点（四分音符）<input value={item.offset_qn} onChange={(e) => updateEvent(index, { offset_qn: e.target.value })} /></label>
              <label>人工和声描述<input value={item.label} maxLength={120} onChange={(e) => updateEvent(index, { label: e.target.value })} /></label>
              <label>根音（可空）<select value={item.root ?? ""} onChange={(e) => updateEvent(index, { root: e.target.value || null })}>
                <option value="">未判断</option>{["C", "D", "E", "F", "G", "A", "B"].flatMap((name) => [name, `${name}#`, `${name}b`]).map((name) => <option value={name} key={name}>{name}</option>)}
              </select></label>
              <label>质量（可空）<select value={item.quality ?? ""} onChange={(e) => updateEvent(index, { quality: (e.target.value || null) as HarmonyEvent["quality"] })}>
                <option value="">未判断/其他</option>{HARMONY_QUALITIES.map((quality) => <option value={quality} key={quality}>{quality}</option>)}
              </select></label>
              <label>罗马数字（可空）<input value={item.roman_numeral ?? ""} maxLength={40} onChange={(e) => updateEvent(index, { roman_numeral: e.target.value || null })} /></label>
              <label>人工调性参照（罗马数字非空时必填）<input value={item.key_context ?? ""} maxLength={80} onChange={(e) => updateEvent(index, { key_context: e.target.value || null })} /></label>
              <label>和声功能（可空）<select value={item.harmonic_function ?? ""} onChange={(e) => updateEvent(index, { harmonic_function: (e.target.value || null) as HarmonyEvent["harmonic_function"] })}>
                <option value="">未判断</option>{HARMONY_FUNCTIONS.map((value) => <option value={value} key={value}>{value}</option>)}
              </select></label>
              <label className="review-wide">原谱事件依据<textarea rows={2} maxLength={2000} value={item.evidence} onChange={(e) => updateEvent(index, { evidence: e.target.value })} /></label>
            </div>
            <button type="button" className="secondary-button" onClick={() => setEvents((current) => current.filter((_, at) => at !== index))}>移除此事件</button>
          </div>)}
          <button type="button" className="secondary-button" disabled={events.length >= 32} onClick={() => setEvents((current) => [...current, emptyEvent()])}>添加事件</button>
        </div>}
        {assessment !== "determined" && <label className="review-wide">不明确或未解决原因<textarea rows={2} maxLength={2000} value={unclearReason} onChange={(e) => setUnclearReason(e.target.value)} /></label>}
        <label className="review-wide">小节级原谱依据<textarea rows={3} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} /></label>
        <div className="review-actions review-wide"><button type="submit">{entry ? "保存人工修改" : "保存人工标注"}</button>
          {entry && <button type="button" className="secondary-button" onClick={() => setDeletePending(true)}>删除条目</button>}
        </div>
      </form>
      {deletePending && <div className="timeline-caution review-actions" role="group" aria-label="删除人工标注确认">确认删除书面第 {measureIndex} 小节的人工标注？
        <button type="button" onClick={() => { onDelete(); setDeletePending(false); }}>确认删除</button>
        <button type="button" className="secondary-button" onClick={() => setDeletePending(false)}>取消</button>
      </div>}
    </div>
  );
}

export default function HarmonicAnnotation({ structure, value, selectedIndex, onSelectIndex, blindEligible, revealed,
  onSaveEntry, onDeleteEntry, onMetadata, onImport, onExport, pendingCount, onConfirmImport, onCancelImport, message, unavailableReason }: {
  structure: VerifiedScoreStructure | null;
  value: HarmonyPackage | null;
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  blindEligible: boolean; revealed: boolean;
  onSaveEntry: (entry: HarmonyEntry) => boolean;
  onDeleteEntry: (index: number) => void;
  onMetadata: (changes: Partial<Pick<HarmonyPackage, "reviewer_label" | "pitch_basis">>) => void;
  onImport: (file: File) => Promise<void>;
  onExport: () => void;
  pendingCount: number | null;
  onConfirmImport: () => void;
  onCancelImport: () => void;
  message: string | null;
  unavailableReason: string | null;
}) {
  const [reviewer, setReviewer] = useState(value?.reviewer_label ?? "");
  const entry = value?.entries.find((item) => item.measure_index === selectedIndex) ?? null;
  const machineVisible = revealed || !blindEligible || entry?.basis === "machine_visible";

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await onImport(file);
    event.target.value = "";
  }

  return <section className="harmony-annotation" aria-labelledby="harmony-annotation-title">
    <h3 id="harmony-annotation-title">独立和声标注 / Independent Harmony Annotation</h3>
    <p className="panel-note">只依据原谱记录人工判断，与机器分析及旧校审意见分开保存。不计算准确率；未录事件不代表机器漏报。草稿仅在此浏览器，非云同步。</p>
    {!value || !structure ? <p className="timeline-caution" role="status">{unavailableReason ?? "正在核对原文件 SHA-256 与书面小节结构；此前仍可使用普通 Analyze。"}</p> : <>
      <p className="panel-note">文件 SHA-256：<code className="review-fingerprint">{value.file_sha256}</code> · 书面小节 {value.measure_count} · 人工已录 {value.entries.length}。{machineVisible ? "新建/编辑只能标为 machine_visible。" : "目前仅看原谱；score_only_attested 仍只是自我声明。"}</p>
      <div className="review-form harmony-metadata">
        <label>校审者署名或化名<input value={reviewer} maxLength={80} onChange={(e) => setReviewer(e.target.value)} onBlur={() => { if (reviewer !== value.reviewer_label) onMetadata({ reviewer_label: reviewer.trim() }); }} /></label>
        <label>音高基准<select value={value.pitch_basis} onChange={(e) => onMetadata({ pitch_basis: e.target.value as HarmonyPackage["pitch_basis"] })}>
          <option value="written">记谱音 written</option><option value="concert">实音 concert（人工自行核定）</option>
        </select></label>
      </div>
      <p className="panel-note">导出包含署名与人工依据，不含原始乐谱。导入仅接受同一原始文件指纹与同一书面小节数的 v1 包；替换前请备份草稿。</p>
      <div className="review-actions"><button type="button" className="secondary-button" onClick={onExport}>导出独立标注 JSON</button>
        <label className="review-import">导入独立标注 JSON<input type="file" accept=".json,application/json" onChange={(e) => void importFile(e)} /></label></div>
      {pendingCount !== null && <div className="timeline-caution" role="status">已校验 {pendingCount} 个书面小节条目。确认将完整替换当前标注集，请先导出当前草稿。
        <div className="review-actions"><button type="button" onClick={onConfirmImport}>确认替换</button><button type="button" className="secondary-button" onClick={onCancelImport}>取消</button></div>
      </div>}
      <label className="harmony-select">书面小节（显示编号仅供阅读）<select value={selectedIndex ?? ""} onChange={(e) => onSelectIndex(Number(e.target.value))}>
        <option value="" disabled>选择书面小节</option>{structure.measure_numbers.map((number, index) => <option key={index} value={index + 1}>书面第 {index + 1} 小节 · 原谱标号 {number} · {value.entries.some((item) => item.measure_index === index + 1) ? "已录" : "未标注"}</option>)}
      </select></label>
      {selectedIndex !== null && selectedIndex >= 1 && selectedIndex <= structure.measure_numbers.length &&
        <EntryEditor key={`${value.file_sha256}:${selectedIndex}:${entry?.updated_at ?? "new"}`} measureIndex={selectedIndex} entry={entry}
          machineVisible={machineVisible} onSave={onSaveEntry} onDelete={() => onDeleteEntry(selectedIndex)} />}
    </>}
    {message && <p className="timeline-caution" role="status">{message}</p>}
  </section>;
}
