import type { HarmonyEntry, HarmonyPackage } from "./harmonicAnnotations";
import type { NotatedTimelineData } from "./NotatedTimeline";
import type { VerifiedScoreStructure } from "./scoreStructure";

export type ComparisonChord = {
  beat: number | null;
  pitches: string[];
  root: string | null;
  quality: string;
  roman_numeral: string | null;
  harmonic_function: string;
};

export type ComparisonMeasure = {
  measure_index?: number | null;
  detected_chords: ComparisonChord[];
};

export type ComparisonInput = {
  revealed: boolean;
  currentSha: string | null;
  analysisSha: string | null;
  structure: VerifiedScoreStructure | null;
  annotations: HarmonyPackage | null;
  measures: ComparisonMeasure[];
  timeline?: NotatedTimelineData | null;
  selectedIndex: number | null;
};

export type ComparisonResult =
  | { kind: "unavailable"; reason: string }
  | {
    kind: "visible";
    index: number;
    entry: HarmonyEntry | null;
    machine: ComparisonMeasure;
    timeline: NotatedTimelineData;
    sourceIds: string[];
    sliceCount: number;
    directlyComparable: boolean;
    reasons: string[];
  };

export function canMountHarmonicComparison(
  revealed: boolean, hasAnalysis: boolean, currentSha: string | null, analysisSha: string | null,
): boolean {
  return revealed && hasAnalysis && !!currentSha && currentSha === analysisSha;
}

export function buildHarmonicComparison(input: ComparisonInput): ComparisonResult {
  const { currentSha, analysisSha, structure, annotations, measures, timeline, selectedIndex } = input;
  if (!input.revealed) return { kind: "unavailable", reason: "机器结果尚未揭示。" };
  if (!currentSha || !analysisSha || currentSha !== analysisSha || !annotations || annotations.file_sha256 !== currentSha) {
    return { kind: "unavailable", reason: "原文件指纹缺失或不一致，不能并列展示。" };
  }
  const count = structure?.measure_durations_qn.length ?? 0;
  if (timeline?.status === "unsupported") {
    return { kind: "unavailable", reason: "时间轴为 unsupported，书面小节来源无法可靠对应。" };
  }
  if (!structure || !count || annotations.measure_count !== count || structure.measure_numbers.length !== count
      || !selectedIndex || selectedIndex < 1 || selectedIndex > count || !timeline
      || timeline.measures.length === 0 || measures.length !== count) {
    return { kind: "unavailable", reason: "书面小节结构或机器时间轴无法核实，不能并列展示。" };
  }
  if (measures.some((measure, index) => measure.measure_index !== index + 1)) {
    return { kind: "unavailable", reason: "机器小节缺少可靠书面索引，不能按显示标号猜测。" };
  }
  const parts = new Set(timeline.measures.filter((measure) => measure.measure_index === 1).map((measure) => measure.part_index));
  if (!parts.size) return { kind: "unavailable", reason: "时间轴缺少书面小节来源。" };
  for (let index = 1; index <= count; index++) {
    const group = timeline.measures.filter((measure) => measure.measure_index === index);
    if (group.length !== parts.size || new Set(group.map((measure) => measure.part_index)).size !== parts.size
        || group.some((measure) => !parts.has(measure.part_index) || measure.measure_number !== structure.measure_numbers[index - 1]
          || measure.start !== group[0].start || measure.end !== group[0].end)) {
      return { kind: "unavailable", reason: `书面第 ${index} 小节的乐器网格或原谱标号不一致，不能并列展示。` };
    }
  }
  const group = timeline.measures.filter((measure) => measure.measure_index === selectedIndex);
  const ids = new Set(group.map((measure) => measure.measure_id));
  const sourceIds = timeline.source_notes.filter((note) => ids.has(note.measure_id)).map((note) => note.note_id);
  const entry = annotations.entries.find((item) => item.measure_index === selectedIndex) ?? null;
  const machine = measures[selectedIndex - 1];
  const reasons: string[] = [];
  if (!entry) reasons.push("该书面小节尚无独立人工标注");
  else if (entry.assessment === "unclear") reasons.push("人工判断为不明确");
  else if (entry.assessment === "partial") reasons.push("人工判断只覆盖部分位置");
  if (timeline.status !== "complete") reasons.push(`记谱时间轴为 ${timeline.status}`);
  if (!sourceIds.length && machine.detected_chords.length) reasons.push("该小节记谱来源缺失");
  if (timeline.diagnostics.some((diagnostic) => !diagnostic.measure_ids.length || diagnostic.measure_ids.some((id) => ids.has(id)))) {
    reasons.push("该小节有时间轴诊断");
  }
  if (annotations.pitch_basis !== timeline.pitch_basis) reasons.push("人工与机器的音高基准不同");
  if (entry && (entry.events.length !== 1 || entry.events[0].offset_qn !== "0")) reasons.push("人工事件不是唯一的起点事件");
  if (machine.detected_chords.length !== 1 || machine.detected_chords[0]?.beat !== 1) reasons.push("机器同起点和弦无法唯一对应");
  if (entry?.events[0] && (!entry.events[0].root || !entry.events[0].quality)) reasons.push("人工根音或质量未填写");
  if (machine.detected_chords[0] && (!machine.detected_chords[0].root || machine.detected_chords[0].quality === "unknown")) reasons.push("机器根音或质量不可用");
  return {
    kind: "visible", index: selectedIndex, entry, machine, timeline,
    sourceIds,
    sliceCount: timeline.slices.filter((slice) => slice.measure_ids.some((id) => ids.has(id))).length,
    directlyComparable: reasons.length === 0, reasons,
  };
}
