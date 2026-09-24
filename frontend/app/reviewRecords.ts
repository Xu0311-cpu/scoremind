export const REVIEW_FORMAT = "scoremind-expert-review";
export const REVIEW_FORMAT_VERSION = 1;

export const REVIEW_STATUSES = ["correct", "needs_review", "wrong"] as const;
export const REVIEW_CATEGORIES = [
  "pitch", "rhythm", "tie", "measure_structure", "chord_analysis",
  "key_analysis", "roman_numeral", "note_role", "other",
] as const;

export type ReviewStatus = typeof REVIEW_STATUSES[number];
export type ReviewCategory = typeof REVIEW_CATEGORIES[number];

export type ReviewRecord = {
  id: string;
  measure_index: number;
  source_note_id: string | null;
  status: ReviewStatus;
  category: ReviewCategory;
  suggested_result: string;
  rationale: string;
  created_at: string;
  updated_at: string;
};

export type ReviewPackage = {
  format: typeof REVIEW_FORMAT;
  format_version: typeof REVIEW_FORMAT_VERSION;
  file_sha256: string;
  analysis_version: string;
  records: ReviewRecord[];
};

export type ReviewScope = {
  file_sha256: string;
  analysis_version: string;
  measure_sources: Map<number, Set<string>>;
};

export function reviewScopeFromTimeline(
  file_sha256: string,
  analysis_version: string,
  timeline: { status: string; measures: { measure_id: string; measure_index: number }[]; source_notes: { measure_id: string; note_id: string }[] } | null | undefined,
): ReviewScope | null {
  if (!/^[0-9a-f]{64}$/.test(file_sha256) || !analysis_version || !timeline
      || timeline.status === "unsupported" || !Array.isArray(timeline.measures)
      || !Array.isArray(timeline.source_notes)) return null;
  const measure_sources = new Map<number, Set<string>>();
  const byId = new Map<string, number>();
  for (const measure of timeline.measures) {
    if (!Number.isSafeInteger(measure.measure_index) || measure.measure_index < 1
        || typeof measure.measure_id !== "string" || byId.has(measure.measure_id)) return null;
    byId.set(measure.measure_id, measure.measure_index);
    if (!measure_sources.has(measure.measure_index)) measure_sources.set(measure.measure_index, new Set());
  }
  if (!measure_sources.size) return null;
  const seenNotes = new Set<string>();
  for (const note of timeline.source_notes) {
    const index = byId.get(note.measure_id);
    if (index === undefined || typeof note.note_id !== "string" || !note.note_id || seenNotes.has(note.note_id)) return null;
    seenNotes.add(note.note_id);
    measure_sources.get(index)?.add(note.note_id);
  }
  return { file_sha256, analysis_version, measure_sources };
}

const MAX_RECORDS = 5000;
export const MAX_REVIEW_BYTES = 1024 * 1024;

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function assertReviewSize(text: string): void {
  if (byteLength(text) > MAX_REVIEW_BYTES) throw new Error("校审 JSON 超过 1 MB 上限。");
}

function objectWithKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function boundedText(value: unknown, max: number, required = false): value is string {
  return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
}

function isoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

export function validateReviewPackage(value: unknown, scope: ReviewScope): ReviewPackage {
  if (!objectWithKeys(value, ["format", "format_version", "file_sha256", "analysis_version", "records"])
      || value.format !== REVIEW_FORMAT || value.format_version !== REVIEW_FORMAT_VERSION
      || typeof value.file_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.file_sha256)
      || !boundedText(value.analysis_version, 40, true) || !Array.isArray(value.records)
      || value.records.length > MAX_RECORDS) {
    throw new Error("校审 JSON 格式或格式版本无效。");
  }
  if (value.file_sha256 !== scope.file_sha256) throw new Error("文件指纹不匹配，不能导入另一份乐谱的校审记录。");
  if (value.analysis_version !== scope.analysis_version) throw new Error("分析版本不匹配，请用相同分析版本重新校审。");

  const ids = new Set<string>();
  for (const record of value.records) {
    if (!objectWithKeys(record, ["id", "measure_index", "source_note_id", "status", "category", "suggested_result", "rationale", "created_at", "updated_at"])
        || !boundedText(record.id, 80, true) || !/^[a-zA-Z0-9-]+$/.test(record.id)
        || !Number.isSafeInteger(record.measure_index) || !scope.measure_sources.has(record.measure_index as number)
        || !(record.source_note_id === null || (boundedText(record.source_note_id, 120, true)
          && scope.measure_sources.get(record.measure_index as number)?.has(record.source_note_id)))
        || !REVIEW_STATUSES.includes(record.status as ReviewStatus)
        || !REVIEW_CATEGORIES.includes(record.category as ReviewCategory)
        || !boundedText(record.suggested_result, 500)
        || !boundedText(record.rationale, 2000, true)
        || !isoDate(record.created_at) || !isoDate(record.updated_at)
        || Date.parse(record.created_at as string) > Date.parse(record.updated_at as string)
        || ids.has(record.id as string)) {
      throw new Error("校审记录包含无效小节、来源 ID、状态或文字字段。");
    }
    ids.add(record.id as string);
  }
  return value as ReviewPackage;
}

export function parseReviewPackage(text: string, scope: ReviewScope): ReviewPackage {
  assertReviewSize(text);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("校审文件不是有效 JSON。"); }
  const reviewPackage = validateReviewPackage(value, scope);
  assertReviewSize(JSON.stringify(reviewPackage));
  return reviewPackage;
}

export function createReviewPackage(scope: ReviewScope, records: ReviewRecord[]): ReviewPackage {
  const reviewPackage = validateReviewPackage({
    format: REVIEW_FORMAT, format_version: REVIEW_FORMAT_VERSION,
    file_sha256: scope.file_sha256, analysis_version: scope.analysis_version, records,
  }, scope);
  assertReviewSize(JSON.stringify(reviewPackage));
  return reviewPackage;
}

export function serializeReviewPackage(scope: ReviewScope, records: ReviewRecord[]): string {
  return JSON.stringify(createReviewPackage(scope, records));
}

export function upsertReviewRecord(scope: ReviewScope, records: ReviewRecord[], record: ReviewRecord): ReviewRecord[] {
  const next = records.some((existing) => existing.id === record.id)
    ? records.map((existing) => existing.id === record.id ? record : existing)
    : [...records, record];
  return createReviewPackage(scope, next).records;
}

export function submitReviewRecord(record: ReviewRecord, save: (record: ReviewRecord) => boolean, onAccepted: () => void): boolean {
  const accepted = save(record);
  if (accepted) onAccepted();
  return accepted;
}

export function deleteReviewRecord(scope: ReviewScope, records: ReviewRecord[], id: string): ReviewRecord[] {
  return createReviewPackage(scope, records.filter((record) => record.id !== id)).records;
}

export function reviewStorageKey(scope: ReviewScope): string {
  return `scoremind:expert-review:v${REVIEW_FORMAT_VERSION}:${scope.file_sha256}:${scope.analysis_version}`;
}

export function readReviewDraft(storage: Storage, scope: ReviewScope): ReviewRecord[] {
  const raw = storage.getItem(reviewStorageKey(scope));
  return raw === null ? [] : parseReviewPackage(raw, scope).records;
}

export function writeReviewDraft(storage: Storage, scope: ReviewScope, records: ReviewRecord[]): void {
  storage.setItem(reviewStorageKey(scope), serializeReviewPackage(scope, records));
}
