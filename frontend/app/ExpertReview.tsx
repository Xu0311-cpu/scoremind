"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { REVIEW_CATEGORIES, REVIEW_STATUSES, type ReviewCategory, type ReviewRecord, type ReviewScope, type ReviewStatus } from "./reviewRecords";

const STATUS_LABELS: Record<ReviewStatus, string> = { correct: "正确", needs_review: "存疑", wrong: "错误" };
const CATEGORY_LABELS: Record<ReviewCategory, string> = {
  pitch: "音高", rhythm: "节奏", tie: "延音线", measure_structure: "小节结构",
  chord_analysis: "和弦分析", key_analysis: "调性", roman_numeral: "罗马数字",
  note_role: "音符角色", other: "其他",
};

export default function ExpertReview({ scope, selectedMeasureIndex, records, onSave, onDelete, onImport, onExport, pendingImportCount, onConfirmImport, onCancelImport, message }: {
  scope: ReviewScope | null;
  selectedMeasureIndex: number | null;
  records: ReviewRecord[];
  onSave: (record: ReviewRecord) => void;
  onDelete: (id: string) => void;
  onImport: (file: File) => Promise<void>;
  onExport: () => void;
  pendingImportCount: number | null;
  onConfirmImport: () => void;
  onCancelImport: () => void;
  message: string | null;
}) {
  const [editing, setEditing] = useState<ReviewRecord | null>(null);
  const [status, setStatus] = useState<ReviewStatus>("needs_review");
  const [category, setCategory] = useState<ReviewCategory>("other");
  const [sourceId, setSourceId] = useState("");
  const [suggestedResult, setSuggestedResult] = useState("");
  const [rationale, setRationale] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const sourceIds = [...(scope?.measure_sources.get(selectedMeasureIndex ?? -1) ?? [])].sort();
  const selectedRecords = records.filter((record) => record.measure_index === selectedMeasureIndex);
  const canReview = !!scope && selectedMeasureIndex !== null && scope.measure_sources.has(selectedMeasureIndex);

  function resetForm() {
    setEditing(null);
    setStatus("needs_review");
    setCategory("other");
    setSourceId("");
    setSuggestedResult("");
    setRationale("");
  }

  function edit(record: ReviewRecord) {
    setEditing(record);
    setStatus(record.status);
    setCategory(record.category);
    setSourceId(record.source_note_id ?? "");
    setSuggestedResult(record.suggested_result);
    setRationale(record.rationale);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReview || selectedMeasureIndex === null) return;
    const now = new Date().toISOString();
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      measure_index: selectedMeasureIndex,
      source_note_id: sourceId || null,
      status, category,
      suggested_result: suggestedResult.trim(),
      rationale: rationale.trim(),
      created_at: editing?.created_at ?? now,
      updated_at: now,
    });
    resetForm();
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const imported = event.target.files?.[0];
    if (imported) await onImport(imported);
    event.target.value = "";
  }

  return (
    <section id="expert-review" className="expert-review" aria-labelledby="expert-review-title">
      <div className="expert-review-head">
        <div>
          <h3 id="expert-review-title">专业校审记录 / Human Review</h3>
          <p className="panel-note">人工意见与机器分析分开保存；不会改写 API 结果、算法置信度或学习报告。来源 ID 只对应当前文件版本。</p>
        </div>
        <span className="review-count">当前文件 {records.length} 条</span>
      </div>
      {!scope ? (
        <p role="status" className="timeline-caution">校审暂不可用：等待文件指纹和可定位的时间轴；旧响应、unsupported 或无法计算指纹时不关联来源。</p>
      ) : (
        <>
          <p className="panel-note">文件 SHA-256：<code className="review-fingerprint">{scope.file_sha256}</code> · 分析版本 {scope.analysis_version}。草稿仅存于此浏览器，不是云同步；可导出 JSON 备份。</p>
          <div className="review-actions">
            <button type="button" className="secondary-button" onClick={onExport}>导出校审 JSON</button>
            <label className="review-import">导入校审 JSON <input type="file" accept=".json,application/json" onChange={(event) => void importFile(event)} /></label>
          </div>
          {pendingImportCount !== null && (
            <div className="timeline-caution" role="status">
              导入已校验：{pendingImportCount} 条记录。确认后将替换当前文件全部 {records.length} 条人工校审记录。
              <div className="review-actions"><button type="button" onClick={onConfirmImport}>确认替换</button><button type="button" className="secondary-button" onClick={onCancelImport}>取消导入</button></div>
            </div>
          )}
          {selectedMeasureIndex !== null && canReview ? (
            <>
              <h4>书面第 {selectedMeasureIndex} 小节 · {selectedRecords.length} 条</h4>
              {selectedRecords.length === 0 && <p>本小节暂无人工校审记录。</p>}
              <ul className="review-records">
                {selectedRecords.map((record) => (
                  <li key={record.id}>
                    <strong>{STATUS_LABELS[record.status]} · {CATEGORY_LABELS[record.category]}</strong>
                    <p>来源：{record.source_note_id ?? "整小节"}</p>
                    {record.suggested_result && <p>建议结果：{record.suggested_result}</p>}
                    <p>依据：{record.rationale}</p>
                    <div className="review-actions">
                      <button type="button" className="secondary-button" onClick={() => edit(record)}>编辑</button>
                      <button type="button" className="secondary-button" onClick={() => setDeleteId(record.id)}>删除</button>
                    </div>
                    {deleteId === record.id && <div className="review-actions" role="group" aria-label="删除确认"><span>确认删除此条记录？</span><button type="button" onClick={() => { onDelete(record.id); setDeleteId(null); resetForm(); }}>确认删除</button><button type="button" className="secondary-button" onClick={() => setDeleteId(null)}>取消</button></div>}
                  </li>
                ))}
              </ul>
              <form className="review-form" onSubmit={save}>
                <h4>{editing ? "编辑校审" : "新增校审"}</h4>
                <label>校审状态<select value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus)}>{REVIEW_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label>
                <label>问题类别<select value={category} onChange={(event) => setCategory(event.target.value as ReviewCategory)}>{REVIEW_CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select></label>
                <label>来源音符（可选）<select value={sourceId} onChange={(event) => setSourceId(event.target.value)}><option value="">整小节</option>{sourceIds.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
                <label>建议结果<input value={suggestedResult} maxLength={500} onChange={(event) => setSuggestedResult(event.target.value)} placeholder="可留空" /></label>
                <label className="review-wide">文字依据<textarea value={rationale} required maxLength={2000} rows={3} onChange={(event) => setRationale(event.target.value)} /></label>
                <div className="review-actions"><button type="submit">{editing ? "保存修改" : "添加记录"}</button>{editing && <button type="button" className="secondary-button" onClick={resetForm}>取消编辑</button>}</div>
              </form>
            </>
          ) : <p role="status">当前没有可校审的书面小节。请先选择已验证的书面位置。</p>}
        </>
      )}
      {message && <p className="timeline-caution" role="status">{message}</p>}
    </section>
  );
}
