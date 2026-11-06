export type HarmonyNote = {
  event_id: string;
  pitch: string;
  onset: "new" | "continuing";
  source_note_ids: string[];
  event_source_note_ids: string[];
  event_start: string;
  event_end: string;
};

export type HarmonySlice = {
  slice_id: string;
  measure_index: number;
  measure_ids: string[];
  start: string;
  end: string;
  local_start: string;
  local_end: string;
  status: "recognized" | "unknown" | "silent";
  root: string | null;
  quality: string | null;
  bass: string | null;
  inversion: number | null;
  pitch_classes: string[];
  interval_pattern: number[];
  candidate_roots: string[];
  reason_codes: string[];
  notes: HarmonyNote[];
};

export type NotatedHarmony = {
  schema_version: string;
  analyzer_version: string;
  legacy_analysis_version: string;
  status: "available" | "unavailable";
  pitch_basis: "written";
  time_unit: "quarter_note";
  interval_convention: "[start,end)";
  support_scope: string[];
  slices: HarmonySlice[];
  diagnostics: { code: string; message: string }[];
};

const QUALITIES: Record<string, string> = {
  major: "大三和弦", minor: "小三和弦", diminished: "减三和弦",
  dominant_seventh: "属七和弦", major_seventh: "大七和弦", minor_seventh: "小七和弦",
  half_diminished_seventh: "半减七和弦", minor_major_seventh: "小大七和弦",
};
const INVERSIONS = ["原位", "第一转位", "第二转位", "第三转位"];
const REASONS: Record<string, string> = {
  timeline_not_complete: "原记谱时间轴不完整或不受支持，暂不能进行持续音和弦识别",
  timeline_has_diagnostics: "原时间轴存在诊断，暂不能安全识别",
  source_identity_incomplete: "来源身份不完整，暂不能安全识别",
  unsupported_pitch_basis: "音高基准不受支持",
  unsupported_pitch_set: "完整音集合不符合首版支持的三和弦或七和弦，未排除任何音",
  insufficient_distinct_pitches: "不同音级不足三个，暂不能确定三和弦或七和弦",
  ambiguous_root_candidates: "存在多个根音候选，暂不选择其中一个",
  enharmonic_spelling_conflict: "存在同音异名拼写冲突，暂不判断",
  unsupported_chord_spelling: "音高拼写不符合所支持和弦的三度结构，暂不判断",
  inversion_not_reliable: "转位无法可靠确认",
};

export function harmonyReason(code: string): string {
  return REASONS[code] ?? `来源或时间区间无法安全核对（${code}）`;
}

export function harmonySliceSentence(slice: HarmonySlice): string {
  if (slice.status === "silent") return "此区间为记谱静默。";
  if (slice.status !== "recognized") return slice.reason_codes.map(harmonyReason).join("；") || "当前区间尚无可靠结论。";
  if (!slice.root || !slice.quality || !QUALITIES[slice.quality] || slice.inversion === null || !INVERSIONS[slice.inversion] || !slice.bass) return "识别字段不完整，暂不展示和弦结论。";
  return `${slice.root} ${QUALITIES[slice.quality]}，${INVERSIONS[slice.inversion]}。该区间包含 ${slice.pitch_classes.join("、")}，最低记谱音是 ${slice.bass}。`;
}

export function harmonySummary(harmony?: NotatedHarmony | null): string {
  if (!harmony) return "此响应未计算记谱持续音和弦；旧起音检测保留在技术视图。";
  if (harmony.schema_version !== "1") return "此持续音结果的格式版本暂不受支持。";
  if (harmony.status !== "available") return harmony.diagnostics.map((d) => harmonyReason(d.code)).join("；") || "持续音和弦识别不可用。";
  const recognized = harmony.slices.filter((s) => s.status === "recognized").length;
  return `持续音模块 ${harmony.analyzer_version}：${harmony.slices.length} 个记谱时间片中，${recognized} 个区间已识别；区间数不是独立和弦个数。`;
}

export function notatedHarmonyReport(fileName: string, legacyVersion: string, harmony: NotatedHarmony, explanationVersion: string | null): string {
  const lines = ["# ScoreMind 学习报告", "", "## 数据来源", "",
    `- 文件：${fileName}`, `- 记谱持续音和弦模块：${harmony.analyzer_version}（格式 ${harmony.schema_version}）`,
    `- 旧起音分析版本：${legacyVersion}`, `- 模板解释版本：${explanationVersion ?? "未生成"}`,
    "- 时间：四分音符单位、精确分数、[start,end)；音高基准：记谱音。", "", "## 持续音识别摘要", "", harmonySummary(harmony), "",
    "本模块没有计算罗马数字、和声功能或音符角色，也不继承旧校审意见。", ""];
  if (harmony.status === "available" && harmony.schema_version === "1") {
    let index: number | null = null;
    for (const s of harmony.slices) {
      if (s.measure_index !== index) { index = s.measure_index; lines.push(`### 书面第 ${index} 小节`, ""); }
      lines.push(`- 四分音符偏移 [${s.local_start},${s.local_end})：${harmonySliceSentence(s)}`);
      if (s.notes.length) {
        lines.push(`  - 当前音：${s.notes.map((n) => n.pitch).join("、")}；此前延续：${s.notes.filter((n) => n.onset === "continuing").map((n) => n.pitch).join("、") || "无"}`);
        lines.push(`  - 来源：${s.notes.flatMap((n) => n.source_note_ids).join(", ")}`);
      }
    }
  }
  lines.push("", "## 适用边界", "", "只匹配当前完整持续音集合；不自动排除额外音，不判断结构和弦、局部转调或声部进行。对称根音多解、拼写冲突与不安全输入保留未知。", "");
  return lines.join("\n");
}
