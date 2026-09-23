import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { NotatedTimelineData } from "./NotatedTimeline";

type ScorePage = OpenSheetMusicDisplay["GraphicSheet"]["MusicPages"][number];

export type WrittenMeasureOption = {
  measureIndex: number;
  label: string;
};

export type MeasureOutline = {
  page: ScorePage;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type MeasureLocation =
  | { status: "available"; outlines: MeasureOutline[] }
  | { status: "unavailable"; reason: string };

export function writtenMeasureOptions(timeline?: NotatedTimelineData | null): WrittenMeasureOption[] {
  if (!timeline || timeline.status === "unsupported") return [];
  const groups = new Map<number, Set<string>>();
  for (const measure of timeline.measures) {
    if (!Number.isSafeInteger(measure.measure_index) || measure.measure_index < 1) return [];
    const labels = groups.get(measure.measure_index) ?? new Set<string>();
    labels.add(measure.measure_number || "未提供");
    groups.set(measure.measure_index, labels);
  }
  return [...groups].sort(([a], [b]) => a - b).map(([measureIndex, labels]) => ({
    measureIndex,
    label: `书面第 ${measureIndex} 小节 · 标号 ${labels.size === 1 ? [...labels][0] : "各声部不一致"}`,
  }));
}

export function adjacentMeasureIndex(options: WrittenMeasureOption[], selected: number | null, direction: -1 | 1): number | null {
  const position = options.findIndex((option) => option.measureIndex === selected);
  if (position < 0) return null;
  return options[position + direction]?.measureIndex ?? null;
}

export function initialMeasureIndex(timeline?: NotatedTimelineData | null): number | null {
  return writtenMeasureOptions(timeline)[0]?.measureIndex ?? null;
}

export function locateWrittenMeasure(
  osmd: OpenSheetMusicDisplay,
  timeline: NotatedTimelineData | null | undefined,
  measureIndex: number | null,
): MeasureLocation {
  if (!timeline) return { status: "unavailable", reason: "此响应未计算记谱时间轴，无法证明小节对应关系。" };
  if (timeline.status === "unsupported") return { status: "unavailable", reason: "时间轴不支持当前乐谱结构，谱面定位已禁用。" };
  if (measureIndex === null) return { status: "unavailable", reason: "尚未选择书面小节。" };

  const options = writtenMeasureOptions(timeline);
  const sourceMeasures = osmd.Sheet?.SourceMeasures;
  const graphicalRows = osmd.GraphicSheet?.MeasureList;
  const pages = osmd.GraphicSheet?.MusicPages;
  const partCount = new Set(timeline.measures.map((measure) => measure.part_index)).size;
  if (!sourceMeasures || !graphicalRows || !pages || !partCount ||
      sourceMeasures.length !== options.length || graphicalRows.length !== options.length ||
      options.some((option, index) => option.measureIndex !== index + 1)) {
    return { status: "unavailable", reason: "书面小节数量或顺序与谱面不一致，不能安全定位。" };
  }

  for (const option of options) {
    const group = timeline.measures.filter((measure) => measure.measure_index === option.measureIndex);
    if (group.length !== partCount || new Set(group.map((measure) => measure.part_index)).size !== partCount ||
        group.some((measure) => measure.start !== group[0].start || measure.end !== group[0].end)) {
      return { status: "unavailable", reason: "多乐器小节网格无法证明一致，不能安全定位。" };
    }
  }

  const index = measureIndex - 1;
  const source = sourceMeasures[index];
  const row = graphicalRows[index];
  if (!source || source.measureListIndex !== index || !row ||
      row.length !== source.CompleteNumberOfStaves || row.length === 0) {
    return { status: "unavailable", reason: "谱面图形小节与书面顺序无法一一对应。" };
  }

  const outlines: MeasureOutline[] = [];
  for (const measure of row) {
    if (!measure || measure.parentSourceMeasure !== source) {
      return { status: "unavailable", reason: "谱面图形小节的来源不匹配，不能高亮。" };
    }
    const page = measure.ParentMusicSystem?.Parent;
    const staff = measure.ParentStaffLine;
    const box = measure.PositionAndShape;
    if (!page || !pages.includes(page) || !staff || !box || !staff.PositionAndShape) {
      return { status: "unavailable", reason: "谱面图形缺少可核对的位置。" };
    }
    const left = box.AbsolutePosition.x + box.BorderLeft;
    const right = box.AbsolutePosition.x + box.BorderRight;
    const top = staff.PositionAndShape.AbsolutePosition.y + staff.TopLineOffset - 0.6;
    const bottom = staff.PositionAndShape.AbsolutePosition.y + staff.BottomLineOffset + 0.6;
    if (![left, right, top, bottom].every(Number.isFinite) || right <= left || bottom <= top) {
      return { status: "unavailable", reason: "谱面图形坐标无效，不能高亮。" };
    }
    outlines.push({ page, left, right, top, bottom });
  }
  return { status: "available", outlines };
}
