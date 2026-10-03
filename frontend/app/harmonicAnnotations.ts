export const HARMONY_FORMAT = "scoremind-independent-harmony";
export const HARMONY_VERSION = 1;
export const MAX_HARMONY_BYTES = 1024 * 1024;
export const HARMONY_QUALITIES = ["major", "minor", "diminished", "augmented", "dominant_seventh", "major_seventh", "minor_seventh", "half_diminished_seventh", "diminished_seventh", "minor_major_seventh"] as const;
export const HARMONY_FUNCTIONS = ["tonic", "predominant", "dominant", "unknown"] as const;

export type HarmonyEvent = {
  offset_qn: string;
  label: string;
  root: string | null;
  quality: typeof HARMONY_QUALITIES[number] | null;
  roman_numeral: string | null;
  key_context: string | null;
  harmonic_function: typeof HARMONY_FUNCTIONS[number] | null;
  evidence: string;
};
export type HarmonyEntry = {
  id: string;
  measure_index: number;
  basis: "score_only_attested" | "machine_visible";
  assessment: "determined" | "partial" | "unclear";
  events: HarmonyEvent[];
  unclear_reason: string | null;
  rationale: string;
  created_at: string;
  updated_at: string;
};
export type HarmonyPackage = {
  format: typeof HARMONY_FORMAT;
  format_version: typeof HARMONY_VERSION;
  file_sha256: string;
  measure_count: number;
  pitch_basis: "written" | "concert";
  annotation_set_id: string;
  reviewer_label: string;
  entries: HarmonyEntry[];
};
export type HarmonyScope = { file_sha256: string; measure_durations_qn: string[] };

const PACKAGE_KEYS = ["format", "format_version", "file_sha256", "measure_count", "pitch_basis", "annotation_set_id", "reviewer_label", "entries"];
const ENTRY_KEYS = ["id", "measure_index", "basis", "assessment", "events", "unclear_reason", "rationale", "created_at", "updated_at"];
const EVENT_KEYS = ["offset_qn", "label", "root", "quality", "roman_numeral", "key_context", "harmonic_function", "evidence"];

function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function text(value: unknown, max: number, required = true): value is string {
  return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
}

function utcDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}

export function parseQuarterFraction(value: unknown): { n: bigint; d: bigint } {
  if (typeof value !== "string" || value.length > 80 || !/^(0|[1-9]\d*(?:\/[1-9]\d*)?)$/.test(value)) {
    throw new Error("拍点必须是规范的非负约分分数。");
  }
  const [numerator, denominator = "1"] = value.split("/");
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  if (d < BigInt(1) || (value.includes("/") && d < BigInt(2)) || gcd(n, d) !== BigInt(1)) {
    throw new Error("拍点分数未约分或分母无效。");
  }
  return { n, d };
}

function less(a: { n: bigint; d: bigint }, b: { n: bigint; d: bigint }): boolean {
  return a.n * b.d < b.n * a.d;
}

function sizeCheck(serialized: string): void {
  if (new TextEncoder().encode(serialized).length > MAX_HARMONY_BYTES) throw new Error("人工和声 JSON 超过 1 MiB 上限。");
}

export function validateHarmonyPackage(value: unknown, scope: HarmonyScope): HarmonyPackage {
  if (!exactKeys(value, PACKAGE_KEYS) || value.format !== HARMONY_FORMAT || value.format_version !== HARMONY_VERSION
      || !/^[0-9a-f]{64}$/.test(String(value.file_sha256)) || !Number.isSafeInteger(value.measure_count)
      || !["written", "concert"].includes(String(value.pitch_basis))
      || !text(value.annotation_set_id, 80) || !/^[A-Za-z0-9-]+$/.test(value.annotation_set_id)
      || !text(value.reviewer_label, 80) || !Array.isArray(value.entries) || value.entries.length > 5000) {
    throw new Error("人工和声 JSON 格式、版本或包级字段无效。");
  }
  if (value.file_sha256 !== scope.file_sha256) throw new Error("文件指纹不匹配，拒绝导入其他乐谱。");
  if (value.measure_count !== scope.measure_durations_qn.length || !scope.measure_durations_qn.length) {
    throw new Error("书面小节数量不匹配。");
  }
  const durations = scope.measure_durations_qn.map(parseQuarterFraction);
  if (durations.some((d) => d.n === BigInt(0))) throw new Error("书面小节时值不可验证。");
  let lastIndex = 0;
  const ids = new Set<string>();
  for (const entry of value.entries) {
    if (!exactKeys(entry, ENTRY_KEYS) || !text(entry.id, 80) || !/^[A-Za-z0-9-]+$/.test(entry.id)
        || ids.has(entry.id) || !Number.isSafeInteger(entry.measure_index)
        || (entry.measure_index as number) <= lastIndex || (entry.measure_index as number) > durations.length
        || !["score_only_attested", "machine_visible"].includes(String(entry.basis))
        || !["determined", "partial", "unclear"].includes(String(entry.assessment))
        || !Array.isArray(entry.events) || entry.events.length > 32
        || !text(entry.rationale, 2000) || !utcDate(entry.created_at) || !utcDate(entry.updated_at)
        || Date.parse(entry.updated_at) < Date.parse(entry.created_at)) {
      throw new Error("人工和声条目、小节索引、时间戳或依据无效。");
    }
    const hasReason = text(entry.unclear_reason, 2000);
    if ((entry.assessment === "determined" && (entry.events.length === 0 || entry.unclear_reason !== null))
        || (entry.assessment === "partial" && (entry.events.length === 0 || !hasReason))
        || (entry.assessment === "unclear" && (entry.events.length !== 0 || !hasReason))) {
      throw new Error(`书面第 ${entry.measure_index} 小节的明确/不明确状态与事件不符。`);
    }
    let previous: { n: bigint; d: bigint } | null = null;
    for (const event of entry.events) {
      if (!exactKeys(event, EVENT_KEYS) || !text(event.label, 120) || !text(event.evidence, 2000)
          || !(event.root === null || (typeof event.root === "string" && /^[A-G](?:#|b)?$/.test(event.root)))
          || !(event.quality === null || HARMONY_QUALITIES.includes(event.quality as typeof HARMONY_QUALITIES[number]))
          || !(event.roman_numeral === null || text(event.roman_numeral, 40))
          || !(event.key_context === null || text(event.key_context, 80))
          || !(event.harmonic_function === null || HARMONY_FUNCTIONS.includes(event.harmonic_function as typeof HARMONY_FUNCTIONS[number]))
          || (event.roman_numeral !== null && event.key_context === null)) {
        throw new Error(`书面第 ${entry.measure_index} 小节的和声事件字段无效。`);
      }
      const offset = parseQuarterFraction(event.offset_qn);
      if (!less(offset, durations[entry.measure_index as number - 1]) || (previous !== null && !less(previous, offset))) {
        throw new Error(`书面第 ${entry.measure_index} 小节的拍点越界、重复或乱序。`);
      }
      previous = offset;
    }
    ids.add(entry.id);
    lastIndex = entry.measure_index as number;
  }
  const result = value as HarmonyPackage;
  sizeCheck(JSON.stringify(result));
  return result;
}

export function parseHarmonyPackage(serialized: string, scope: HarmonyScope): HarmonyPackage {
  sizeCheck(serialized);
  let value: unknown;
  try { value = JSON.parse(serialized); } catch { throw new Error("人工和声文件不是有效 JSON。"); }
  return validateHarmonyPackage(value, scope);
}

export function createHarmonyPackage(scope: HarmonyScope, reviewerLabel: string, setId: string): HarmonyPackage {
  return validateHarmonyPackage({ format: HARMONY_FORMAT, format_version: HARMONY_VERSION,
    file_sha256: scope.file_sha256, measure_count: scope.measure_durations_qn.length,
    pitch_basis: "written", annotation_set_id: setId, reviewer_label: reviewerLabel, entries: [] }, scope);
}

export function updateHarmonyPackage(scope: HarmonyScope, current: HarmonyPackage, changes: Partial<Pick<HarmonyPackage, "reviewer_label" | "pitch_basis" | "entries">>): HarmonyPackage {
  return validateHarmonyPackage({ ...current, ...changes }, scope);
}

export function saveHarmonyEntry(scope: HarmonyScope, current: HarmonyPackage, entry: HarmonyEntry): HarmonyPackage {
  if (current.entries.some((item) => item.measure_index === entry.measure_index && item.id !== entry.id)) {
    throw new Error("此书面小节已有另一条人工标注，不能静默覆盖。");
  }
  const entries = current.entries.filter((item) => item.id !== entry.id);
  entries.push(entry);
  entries.sort((a, b) => a.measure_index - b.measure_index);
  return updateHarmonyPackage(scope, current, { entries });
}

export function harmonyStorageKey(sha: string): string {
  return `scoremind:independent-harmony:v1:${sha}`;
}
export function revealStorageKey(sha: string): string {
  return `scoremind:independent-harmony:revealed:v1:${sha}`;
}
export function readHarmonyDraft(storage: Storage, scope: HarmonyScope): HarmonyPackage | null {
  const value = storage.getItem(harmonyStorageKey(scope.file_sha256));
  return value === null ? null : parseHarmonyPackage(value, scope);
}
export function writeHarmonyDraft(storage: Storage, scope: HarmonyScope, value: HarmonyPackage): void {
  storage.setItem(harmonyStorageKey(scope.file_sha256), JSON.stringify(validateHarmonyPackage(value, scope)));
}

export function saveHarmonyEntryWithStorage(scope: HarmonyScope, current: HarmonyPackage, entry: HarmonyEntry, storage: Storage | null): { value: HarmonyPackage; stored: boolean } {
  const next = saveHarmonyEntry(scope, current, entry);
  try {
    if (!storage) throw new Error("浏览器存储不可用。");
    writeHarmonyDraft(storage, scope, next);
    return { value: next, stored: true };
  } catch {
    const value = entry.basis === "score_only_attested"
      ? saveHarmonyEntry(scope, current, { ...entry, basis: "machine_visible" }) : next;
    return { value, stored: false };
  }
}
